import { ExternalLink } from "lucide-react";

import { TierBadge } from "@/components/groundtruth/TierBadge";
import type { EvidenceSource } from "@/lib/groundtruth/types";

function formatDate(value: string | null) {
  if (!value) return "no date";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function EvidenceCard({ source }: { source: EvidenceSource }) {
  return (
    <article className="rounded-lg border border-border bg-card/60 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded bg-secondary px-1.5 py-0.5 text-[11px] tabular-nums text-foreground">
            [{source.citationIndex}]
          </span>
          <span className="text-xs text-muted-foreground">{source.sourceName ?? "unknown"}</span>
        </div>
        <TierBadge tier={source.tier} />
      </div>

      <h4 className="mt-2 text-sm leading-snug text-foreground">{source.title ?? source.url}</h4>
      <p className="mt-1 text-[11px] text-muted-foreground">{formatDate(source.publishedAt)}</p>

      {source.snippet ? (
        <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
          {source.snippet}
        </p>
      ) : null}

      <a
        href={source.canonicalUrl ?? source.url}
        target="_blank"
        rel="noreferrer noopener"
        className="mt-3 inline-flex items-center gap-1 text-xs text-accent-blue hover:underline"
      >
        Open source <ExternalLink className="size-3" aria-hidden="true" />
      </a>
    </article>
  );
}
