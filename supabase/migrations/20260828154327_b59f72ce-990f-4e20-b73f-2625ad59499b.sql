CREATE TABLE public.gt_search_cache (
  query TEXT PRIMARY KEY,
  results JSONB NOT NULL DEFAULT '[]'::jsonb,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.gt_search_cache TO authenticated;
GRANT ALL ON public.gt_search_cache TO service_role;
ALTER TABLE public.gt_search_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Search cache readable by signed-in users"
  ON public.gt_search_cache FOR SELECT TO authenticated USING (true);

CREATE TABLE public.gt_firecrawl_usage (
  day DATE PRIMARY KEY,
  calls INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.gt_firecrawl_usage TO authenticated;
GRANT ALL ON public.gt_firecrawl_usage TO service_role;
ALTER TABLE public.gt_firecrawl_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usage readable by signed-in users"
  ON public.gt_firecrawl_usage FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.gt_reserve_firecrawl_calls(_count INTEGER, _daily_budget INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _used INTEGER;
  _granted INTEGER;
BEGIN
  INSERT INTO public.gt_firecrawl_usage (day, calls)
  VALUES (CURRENT_DATE, 0)
  ON CONFLICT (day) DO NOTHING;

  SELECT calls INTO _used FROM public.gt_firecrawl_usage
  WHERE day = CURRENT_DATE FOR UPDATE;

  _granted := GREATEST(LEAST(_count, _daily_budget - _used), 0);

  IF _granted > 0 THEN
    UPDATE public.gt_firecrawl_usage
    SET calls = calls + _granted, updated_at = now()
    WHERE day = CURRENT_DATE;
  END IF;

  RETURN _granted;
END;
$$;
REVOKE ALL ON FUNCTION public.gt_reserve_firecrawl_calls(INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gt_reserve_firecrawl_calls(INTEGER, INTEGER) TO service_role;

ALTER TABLE public.gt_checks
  ADD COLUMN IF NOT EXISTS retrieval_stats JSONB;