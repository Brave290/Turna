CREATE EXTENSION IF NOT EXISTS pgcrypto;

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

  v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  INSERT INTO public.password_reset_tokens (user_id, email, token, expires_at)
  VALUES (p_user_id, normalized, v_token, NOW() + INTERVAL '1 hour');
  RETURN v_token;
END;
$$;

REVOKE ALL ON FUNCTION public.create_password_reset_token(TEXT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_password_reset_token(TEXT, UUID) TO service_role;
