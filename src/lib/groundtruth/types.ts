import type { RetrievalStats } from "@/lib/groundtruth/limits";

export type ClaimStatus =
  | "Primary Source"
  | "Corroborated"
  | "Weak Evidence"
  | "Untraceable"
  | "Contradicted";

export const STATUS_WEIGHTS: Record<ClaimStatus, number> = {
  "Primary Source": 1,
  Corroborated: 0.8,
  "Weak Evidence": 0.4,
  Untraceable: 0,
  Contradicted: 0,
};

export const STATUS_ORDER: ClaimStatus[] = [
  "Primary Source",
  "Corroborated",
  "Weak Evidence",
  "Untraceable",
  "Contradicted",
];

export type StatusTone = "good" | "warn" | "bad";

export function statusTone(status: ClaimStatus): StatusTone {
  if (status === "Primary Source" || status === "Corroborated") return "good";
  if (status === "Weak Evidence") return "warn";
  return "bad";
}

export type EvidenceSource = {
  id: string;
  citationIndex: number;
  url: string;
  canonicalUrl: string | null;
  title: string | null;
  sourceName: string | null;
  publishedAt: string | null;
  tier: number;
  snippet: string | null;
};

export type Drift = {
  higherTierWording: string;
  lowerTierWording: string;
  higherTierSource: string;
  lowerTierSource: string;
} | null;

export type Claim = {
  id: string;
  position: number;
  text: string;
  status: ClaimStatus;
  justification: string | null;
  drift: Drift;
  sources: EvidenceSource[];
};

export type AiAuthorship = {
  /** 0-100 likelihood the submitted text was AI-generated. Never a binary verdict. */
  aiLikelihood: number;
  confidence: "low" | "medium" | "high";
  signals: string[];
  caveat: string;
};

export type CheckResult = {
  id: string;
  inputText: string;
  inputKind: "question" | "pasted" | "image";
  imageUrl: string | null;
  ocrText: string | null;
  answer: string;
  groundingScore: number;
  createdAt: string;
  /** Secondary, independent signal — never blended into groundingScore. */
  aiAuthorship: AiAuthorship | null;
  claims: Claim[];
  retrievalStats: RetrievalStats;
};

export type CheckSummary = {
  id: string;
  inputText: string;
  inputKind: string;
  groundingScore: number | null;
  createdAt: string;
};

export function computeGrounding(claims: Pick<Claim, "status">[]): number {
  if (claims.length === 0) return 0;
  const total = claims.reduce((sum, c) => sum + (STATUS_WEIGHTS[c.status] ?? 0), 0);
  return Math.round((total / claims.length) * 100);
}
