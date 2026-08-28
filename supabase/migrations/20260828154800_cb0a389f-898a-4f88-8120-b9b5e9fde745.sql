ALTER TABLE public.gt_checks ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.gt_claims ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.gt_sources ALTER COLUMN user_id DROP NOT NULL;