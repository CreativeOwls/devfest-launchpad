CREATE OR REPLACE FUNCTION public.gt_reserve_firecrawl_calls_v2(
  _count INTEGER,
  _daily_budget INTEGER,
  _event_budget INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _used INTEGER;
  _event_used INTEGER;
  _room INTEGER;
  _granted INTEGER;
  _scope TEXT := NULL;
BEGIN
  INSERT INTO public.gt_firecrawl_usage (day, calls)
  VALUES (CURRENT_DATE, 0)
  ON CONFLICT (day) DO NOTHING;

  SELECT calls INTO _used FROM public.gt_firecrawl_usage
  WHERE day = CURRENT_DATE FOR UPDATE;

  SELECT COALESCE(SUM(calls), 0) INTO _event_used FROM public.gt_firecrawl_usage;

  _room := LEAST(_daily_budget - _used, _event_budget - _event_used);
  _granted := GREATEST(LEAST(_count, _room), 0);

  IF _granted < _count THEN
    IF (_daily_budget - _used) <= (_event_budget - _event_used) THEN
      _scope := 'daily';
    ELSE
      _scope := 'event';
    END IF;
  END IF;

  IF _granted > 0 THEN
    UPDATE public.gt_firecrawl_usage
    SET calls = calls + _granted, updated_at = now()
    WHERE day = CURRENT_DATE;
    _used := _used + _granted;
    _event_used := _event_used + _granted;
  END IF;

  RETURN jsonb_build_object(
    'granted', _granted,
    'day_used', _used,
    'event_used', _event_used,
    'exhausted_scope', _scope
  );
END;
$$;

REVOKE ALL ON FUNCTION public.gt_reserve_firecrawl_calls_v2(INTEGER, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.gt_reserve_firecrawl_calls_v2(INTEGER, INTEGER, INTEGER) TO service_role;