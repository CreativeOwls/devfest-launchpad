ALTER TABLE public.gt_checks
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS ocr_text text;