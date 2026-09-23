-- OTP must always work — remove rate limiting for custom OTP sends
CREATE OR REPLACE FUNCTION public.consume_email_otp_rate_limit(p_email TEXT)
RETURNS TABLE (allowed BOOLEAN, retry_after_seconds INTEGER, request_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY SELECT TRUE, 0, 0;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_email_otp_rate_limit(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_email_otp_rate_limit(TEXT) TO service_role;

-- Password reset tokens (custom SMTP, no Supabase emails)
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 hour'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON public.password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_email ON public.password_reset_tokens(email);

ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.password_reset_tokens FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.password_reset_tokens TO service_role;

CREATE OR REPLACE FUNCTION public.create_password_reset_token(
  p_email TEXT,
  p_user_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized TEXT := lower(trim(p_email));
  v_token TEXT;
BEGIN
  UPDATE public.password_reset_tokens
     SET used_at = NOW()
   WHERE email = normalized AND used_at IS NULL;

  v_token := encode(gen_random_bytes(32), 'hex');
  INSERT INTO public.password_reset_tokens (user_id, email, token, expires_at)
  VALUES (p_user_id, normalized, v_token, NOW() + INTERVAL '1 hour');
  RETURN v_token;
END;
$$;

REVOKE ALL ON FUNCTION public.create_password_reset_token(TEXT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_password_reset_token(TEXT, UUID) TO service_role;

CREATE OR REPLACE FUNCTION public.consume_password_reset_token(p_token TEXT)
RETURNS TABLE (user_id UUID, email TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID;
  v_email TEXT;
BEGIN
  SELECT r.user_id, r.email INTO v_user, v_email
    FROM public.password_reset_tokens r
   WHERE r.token = p_token
     AND r.used_at IS NULL
     AND r.expires_at > NOW()
   LIMIT 1;

  IF v_user IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.password_reset_tokens SET used_at = NOW() WHERE token = p_token;
  RETURN QUERY SELECT v_user, v_email;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_password_reset_token(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_password_reset_token(TEXT) TO service_role;
