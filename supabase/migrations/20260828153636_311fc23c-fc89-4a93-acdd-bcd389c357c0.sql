CREATE TABLE public.gt_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  input_text text NOT NULL,
  input_kind text NOT NULL DEFAULT 'question',
  answer text,
  grounding_score numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gt_checks TO authenticated;
GRANT ALL ON public.gt_checks TO service_role;
ALTER TABLE public.gt_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own checks" ON public.gt_checks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.gt_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  check_id uuid NOT NULL REFERENCES public.gt_checks ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  position int NOT NULL,
  text text NOT NULL,
  status text NOT NULL DEFAULT 'Untraceable',
  justification text,
  drift jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gt_claims TO authenticated;
GRANT ALL ON public.gt_claims TO service_role;
ALTER TABLE public.gt_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own claims" ON public.gt_claims FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX gt_claims_check_idx ON public.gt_claims (check_id);

CREATE TABLE public.gt_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  check_id uuid NOT NULL REFERENCES public.gt_checks ON DELETE CASCADE,
  claim_id uuid NOT NULL REFERENCES public.gt_claims ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  citation_index int NOT NULL,
  url text NOT NULL,
  canonical_url text,
  title text,
  source_name text,
  published_at text,
  tier int NOT NULL DEFAULT 5,
  snippet text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gt_sources TO authenticated;
GRANT ALL ON public.gt_sources TO service_role;
ALTER TABLE public.gt_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sources" ON public.gt_sources FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX gt_sources_check_idx ON public.gt_sources (check_id);

CREATE TABLE public.gt_page_cache (
  url text PRIMARY KEY,
  canonical_url text,
  title text,
  source_name text,
  published_at text,
  content text,
  fetched_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.gt_page_cache TO authenticated;
GRANT ALL ON public.gt_page_cache TO service_role;
ALTER TABLE public.gt_page_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cache readable by signed-in users" ON public.gt_page_cache FOR SELECT TO authenticated USING (true);