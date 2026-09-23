-- Drop 3-arg overload so PostgREST can resolve create_custom_otp cleanly
DROP FUNCTION IF EXISTS public.create_custom_otp(TEXT, TEXT, TEXT);

-- Ensure single 4-arg signature with defaults
CREATE OR REPLACE FUNCTION public.create_custom_otp(
  p_email TEXT,
  p_code TEXT,
  p_purpose TEXT DEFAULT 'signup',
  p_user_id UUID DEFAULT NULL
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
  UPDATE public.custom_otps
    SET used_at = NOW()
   WHERE email = normalized
     AND purpose = p_purpose
     AND used_at IS NULL;

  INSERT INTO public.custom_otps (email, code, purpose, user_id)
  VALUES (normalized, p_code, p_purpose, p_user_id)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_custom_otp(TEXT, TEXT, TEXT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_custom_otp(TEXT, TEXT, TEXT, UUID) TO service_role;
