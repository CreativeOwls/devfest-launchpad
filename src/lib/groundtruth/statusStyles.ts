import { STATUS_ORDER, type Claim, type ClaimStatus } from "@/lib/groundtruth/types";
import type { CSSProperties } from "react";

/**
 * Strict green -> yellow -> red status scale. No blue anywhere.
 * Each status is a base hue in OKLCH; the displayed colour is derived by
 * modulating lightness/chroma with a 0-1 confidence value (same hue always).
 */
type Oklch = { l: number; c: number; h: number };

export const STATUS_HUES: Record<ClaimStatus, Oklch> = {
  // brightest, most saturated green
  "Primary Source": { l: 0.62, c: 0.17, h: 148 },
  // same hue family, softer / lighter green
  Corroborated: { l: 0.72, c: 0.1, h: 148 },
  // amber
  "Weak Evidence": { l: 0.72, c: 0.15, h: 78 },
  // dim, desaturated "no signal" red
  Untraceable: { l: 0.58, c: 0.07, h: 25 },
  // brightest, most saturated red
  Contradicted: { l: 0.58, c: 0.2, h: 25 },
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Confidence 0-1 -> vividness. Low confidence fades toward a muted version of the SAME hue. */
function derive(base: Oklch, confidence: number): Oklch {
  const t = clamp(confidence, 0, 1);
  // chroma scales 55% -> 100%; lightness lifts slightly (paler) when unsure
  return {
    l: clamp(base.l + (1 - t) * 0.08, 0.35, 0.86),
    c: base.c * (0.55 + 0.45 * t),
    h: base.h,
  };
}

const css = ({ l, c, h }: Oklch, alpha = 1) =>
  alpha >= 1 ? `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${h})` : `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${h} / ${alpha})`;

/** Darkened variant guaranteed readable as text on a white / tinted-white surface. */
const readable = (o: Oklch) => css({ l: Math.min(o.l, 0.45), c: Math.min(o.c, 0.16), h: o.h });

export type StatusStyle = {
  /** Solid saturated dot */
  dot: CSSProperties;
  /** Filled pill/badge */
  pill: CSSProperties;
  /** Colored left accent bar on the claim card */
  bar: CSSProperties;
  /** Low-opacity background wash + border */
  wash: CSSProperties;
  /** Text colour for the status colour */
  text: CSSProperties;
};

const NEUTRAL: Oklch = { l: 0.62, c: 0.01, h: 264 };

function build(base: Oklch, confidence: number): StatusStyle {
  const c = derive(base, confidence);
  const solid = css(c);
  return {
    dot: { backgroundColor: solid, boxShadow: `0 0 0 4px ${css(c, 0.22)}` },
    pill: {
      backgroundColor: css(c, 0.16),
      borderColor: css(c, 0.5),
      color: readable(c),
    },
    bar: { backgroundColor: solid },
    wash: { backgroundColor: css(c, 0.07), borderColor: css(c, 0.32) },
    text: { color: readable(c) },
  };
}

export const PENDING_STYLE: StatusStyle = build(NEUTRAL, 0.5);

/**
 * @param confidence 0-1 judge/evidence confidence; brightness encodes it.
 */
export function statusStyle(status?: ClaimStatus | null, confidence = 1): StatusStyle {
  if (!status) return PENDING_STYLE;
  const base = STATUS_HUES[status];
  if (!base) return PENDING_STYLE;
  return build(base, confidence);
}

/** Overall grounding % on the same green -> yellow -> red scale by value. */
export function scoreStatusStyle(score: number | null): StatusStyle {
  if (score === null) return PENDING_STYLE;
  if (score >= 75) return statusStyle("Primary Source");
  if (score >= 55) return statusStyle("Corroborated");
  if (score >= 35) return statusStyle("Weak Evidence");
  if (score >= 15) return statusStyle("Untraceable");
  return statusStyle("Contradicted");
}

/**
 * Presentational confidence read for a claim (0-1), derived from the evidence
 * already attached to it — no pipeline/scoring change. More and higher-tier
 * sources => more vivid colour; nothing to go on => muted.
 */
export function claimConfidence(claim: Pick<Claim, "sources" | "status">): number {
  const sources = claim.sources ?? [];
  if (sources.length === 0) return claim.status === "Untraceable" ? 0.75 : 0.3;
  const bestTier = Math.min(...sources.map((s) => s.tier || 5));
  const tierScore = bestTier <= 1 ? 1 : bestTier === 2 ? 0.85 : bestTier === 3 ? 0.65 : 0.45;
  const countScore = Math.min(sources.length, 3) / 3;
  return clamp(0.35 + 0.45 * tierScore + 0.2 * countScore, 0, 1);
}

export const LEGEND_STATUSES = STATUS_ORDER;
