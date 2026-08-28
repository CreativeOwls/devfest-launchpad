import { STATUS_ORDER, type ClaimStatus } from "@/lib/groundtruth/types";

export type StatusStyle = {
  /** Solid saturated dot */
  dot: string;
  /** Filled pill/badge */
  pill: string;
  /** Colored left accent bar on the claim card */
  bar: string;
  /** Low-opacity background wash + border */
  wash: string;
  /** Text color for the status color */
  text: string;
};

export const STATUS_STYLES: Record<ClaimStatus, StatusStyle> = {
  "Primary Source": {
    dot: "bg-status-primary ring-status-primary/25",
    pill: "bg-status-primary/15 text-status-primary border-status-primary/40",
    bar: "bg-status-primary",
    wash: "bg-status-primary/[0.06] border-status-primary/30",
    text: "text-status-primary",
  },
  Corroborated: {
    dot: "bg-status-corroborated ring-status-corroborated/25",
    pill: "bg-status-corroborated/15 text-status-corroborated border-status-corroborated/40",
    bar: "bg-status-corroborated",
    wash: "bg-status-corroborated/[0.06] border-status-corroborated/30",
    text: "text-status-corroborated",
  },
  "Weak Evidence": {
    dot: "bg-status-weak ring-status-weak/30",
    pill: "bg-status-weak/20 text-status-weak border-status-weak/55",
    bar: "bg-status-weak",
    wash: "bg-status-weak/[0.10] border-status-weak/45",
    text: "text-status-weak",
  },
  Untraceable: {
    dot: "bg-status-untraceable ring-status-untraceable/25",
    pill: "bg-status-untraceable/15 text-status-untraceable border-status-untraceable/40",
    bar: "bg-status-untraceable",
    wash: "bg-status-untraceable/[0.05] border-status-untraceable/30",
    text: "text-status-untraceable",
  },
  Contradicted: {
    dot: "bg-status-contradicted ring-status-contradicted/30",
    pill: "bg-status-contradicted/20 text-status-contradicted border-status-contradicted/60",
    bar: "bg-status-contradicted",
    wash: "bg-status-contradicted/[0.10] border-status-contradicted/45",
    text: "text-status-contradicted",
  },
};

export const PENDING_STYLE: StatusStyle = {
  dot: "bg-muted-foreground/60 ring-muted-foreground/20",
  pill: "bg-secondary text-muted-foreground border-border",
  bar: "bg-border",
  wash: "bg-transparent border-border",
  text: "text-muted-foreground",
};

export function statusStyle(status?: ClaimStatus | null): StatusStyle {
  if (!status) return PENDING_STYLE;
  return STATUS_STYLES[status] ?? PENDING_STYLE;
}

export function scoreStatusStyle(score: number | null): StatusStyle {
  if (score === null) return PENDING_STYLE;
  if (score >= 70) return STATUS_STYLES["Primary Source"];
  if (score >= 40) return STATUS_STYLES["Weak Evidence"];
  return STATUS_STYLES.Contradicted;
}

export const LEGEND_STATUSES = STATUS_ORDER;
