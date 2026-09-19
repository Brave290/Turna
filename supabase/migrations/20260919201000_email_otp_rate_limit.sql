CREATE TABLE IF NOT EXISTS public.email_otp_requests (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email TEXT NOT NULL,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_otp_requests_email_time
    ON public.email_otp_requests (email, requested_at DESC);

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
    WHERE requested_at < NOW() - INTERVAL '1 hour';

    SELECT COUNT(*)::INTEGER, MIN(requested_at)
      INTO current_count, oldest_request
      FROM public.email_otp_requests
     WHERE email = normalized_email
       AND requested_at >= NOW() - INTERVAL '1 hour';

    IF current_count >= 5 THEN
        RETURN QUERY SELECT
            FALSE,
            GREATEST(1, CEIL(EXTRACT(EPOCH FROM (oldest_request + INTERVAL '1 hour' - NOW())))::INTEGER),
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
