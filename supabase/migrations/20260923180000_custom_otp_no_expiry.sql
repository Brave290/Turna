-- Custom OTP codes that NEVER expire (valid until used or replaced)
CREATE TABLE IF NOT EXISTS public.custom_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT 'signup',
  attempts INTEGER NOT NULL DEFAULT 0,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_custom_otps_email ON public.custom_otps (email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_custom_otps_email_code ON public.custom_otps (email, code);

-- Only one active OTP per email+purpose: new send replaces old
-- (enforced in application logic by marking old used / deleting)

ALTER TABLE public.custom_otps ENABLE ROW LEVEL SECURITY;

-- No public access — only service_role via server actions
REVOKE ALL ON TABLE public.custom_otps FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.custom_otps TO service_role;

-- Helper: create or replace OTP for email (no expiry)
CREATE OR REPLACE FUNCTION public.create_custom_otp(
  p_email TEXT,
  p_code TEXT,
  p_purpose TEXT DEFAULT 'signup'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized TEXT := lower(trim(p_email));
  v_id UUID;
BEGIN
  -- Invalidate previous unused codes for this email+purpose
  UPDATE public.custom_otps
    SET used_at = NOW()
   WHERE email = normalized
     AND purpose = p_purpose
     AND used_at IS NULL;

  INSERT INTO public.custom_otps (email, code, purpose)
  VALUES (normalized, p_code, p_purpose)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_custom_otp(TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_custom_otp(TEXT, TEXT, TEXT) TO service_role;

-- Helper: verify OTP (no expiry — only checks unused + attempts)
CREATE OR REPLACE FUNCTION public.verify_custom_otp(
  p_email TEXT,
  p_code TEXT,
  p_purpose TEXT DEFAULT 'signup',
  p_max_attempts INTEGER DEFAULT 5
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized TEXT := lower(trim(p_email));
  v_id UUID;
  v_attempts INTEGER;
BEGIN
  SELECT id, attempts INTO v_id, v_attempts
    FROM public.custom_otps
   WHERE email = normalized
     AND code = p_code
     AND purpose = p_purpose
     AND used_at IS NULL
   ORDER BY created_at DESC
   LIMIT 1;

  IF v_id IS NULL THEN
    -- Count wrong attempts on most recent active OTP
    UPDATE public.custom_otps
       SET attempts = attempts + 1
     WHERE id = (
       SELECT id FROM public.custom_otps
        WHERE email = normalized AND purpose = p_purpose AND used_at IS NULL
        ORDER BY created_at DESC LIMIT 1
     );
    RETURN FALSE;
  END IF;

  IF v_attempts >= p_max_attempts THEN
    UPDATE public.custom_otps SET used_at = NOW() WHERE id = v_id;
    RETURN FALSE;
  END IF;

  UPDATE public.custom_otps SET used_at = NOW() WHERE id = v_id;
  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.verify_custom_otp(TEXT, TEXT, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_custom_otp(TEXT, TEXT, TEXT, INTEGER) TO service_role;
