-- OTP codes expire after 5 minutes
ALTER TABLE public.custom_otps ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '5 minutes');

-- Backfill existing rows
UPDATE public.custom_otps SET expires_at = created_at + INTERVAL '5 minutes' WHERE expires_at IS NULL OR expires_at = NOW() + INTERVAL '5 minutes';

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

  INSERT INTO public.custom_otps (email, code, purpose, user_id, expires_at)
  VALUES (normalized, p_code, p_purpose, p_user_id, NOW() + INTERVAL '5 minutes')
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_custom_otp(TEXT, TEXT, TEXT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_custom_otp(TEXT, TEXT, TEXT, UUID) TO service_role;

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
  v_expires TIMESTAMPTZ;
BEGIN
  SELECT id, attempts, expires_at INTO v_id, v_attempts, v_expires
    FROM public.custom_otps
   WHERE email = normalized
     AND code = p_code
     AND purpose = p_purpose
     AND used_at IS NULL
   ORDER BY created_at DESC
   LIMIT 1;

  IF v_id IS NULL THEN
    UPDATE public.custom_otps
       SET attempts = attempts + 1
     WHERE id = (
       SELECT id FROM public.custom_otps
        WHERE email = normalized AND purpose = p_purpose AND used_at IS NULL
        ORDER BY created_at DESC LIMIT 1
     );
    RETURN FALSE;
  END IF;

  IF v_expires IS NOT NULL AND v_expires < NOW() THEN
    UPDATE public.custom_otps SET used_at = NOW() WHERE id = v_id;
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

-- Rate limit: generous so OTP always works for real users (50 / 10 min soft cap)
CREATE OR REPLACE FUNCTION public.consume_email_otp_rate_limit(p_email TEXT)
RETURNS TABLE (allowed BOOLEAN, retry_after_seconds INTEGER, request_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    normalized_email TEXT := lower(trim(p_email));
    current_count INTEGER;
    oldest_request TIMESTAMPTZ;
BEGIN
    PERFORM pg_advisory_xact_lock(hashtextextended(normalized_email, 0));

    DELETE FROM public.email_otp_requests
    WHERE requested_at < NOW() - INTERVAL '10 minutes';

    SELECT COUNT(*)::INTEGER, MIN(requested_at)
      INTO current_count, oldest_request
      FROM public.email_otp_requests
     WHERE email = normalized_email
       AND requested_at >= NOW() - INTERVAL '10 minutes';

    IF current_count >= 50 THEN
        RETURN QUERY SELECT
            FALSE,
            GREATEST(1, CEIL(EXTRACT(EPOCH FROM (oldest_request + INTERVAL '10 minutes' - NOW())))::INTEGER),
            current_count;
        RETURN;
    END IF;

    INSERT INTO public.email_otp_requests (email) VALUES (normalized_email);

    RETURN QUERY SELECT TRUE, 0, current_count + 1;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_email_otp_rate_limit(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_email_otp_rate_limit(TEXT) TO service_role;
