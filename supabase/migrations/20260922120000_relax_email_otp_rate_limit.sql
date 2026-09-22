-- Relax email OTP rate limit: 8 requests / 10 minutes, 10-minute sliding window
-- (Previously 5 requests / 1 hour with full-hour lockout.)

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

    IF current_count >= 8 THEN
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

REVOKE ALL ON TABLE public.email_otp_requests FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.consume_email_otp_rate_limit(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_email_otp_rate_limit(TEXT) TO service_role;
