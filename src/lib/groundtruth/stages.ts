export const PIPELINE_STAGES = [
  "Decomposing claims",
  "Searching sources",
  "Scraping evidence",
  "Judging claims",
  "Composing answer",
  "Scoring",
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];
