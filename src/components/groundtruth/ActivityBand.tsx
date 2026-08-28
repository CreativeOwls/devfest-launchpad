import { Check, ChevronDown, Loader2 } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { LIMITS, type RetrievalStats } from "@/lib/groundtruth/limits";
import { statusStyle } from "@/lib/groundtruth/statusStyles";
import type { CheckResult, ClaimStatus } from "@/lib/groundtruth/types";
import { cn } from "@/lib/utils";
import logoAsset from "@/assets/groundtruth-logo.png.asset.json";

export const PIPELINE_STAGES = [
  "Decomposing claims",
  "Searching sources",
  "Scraping evidence",
  "Judging claims",
  "Composing answer",
  "Scoring",
] as const;

type Line = { text: string; tone?: "good" | "warn" | "bad" | undefined; status?: ClaimStatus | undefined };

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.slice(0, 42);
  }
}

/** Truthful event stream: stage progress while running, real results as they land. */
function buildLines(
  pending: boolean,
  stage: number,
  result: CheckResult | null,
  revealedCount: number,
): Line[] {
  const lines: Line[] = [];

  if (pending) {
    for (let i = 0; i <= stage; i += 1) {
      lines.push({ text: `${PIPELINE_STAGES[i]?.toLowerCase()}…` });
    }
    return lines;
  }

  if (!result) return lines;

  lines.push({ text: `input: ${result.inputKind} · ${result.inputText.length} chars` });
  lines.push({ text: `decompose: ${result.claims.length} atomic claim(s) detected` });

  const stats = result.retrievalStats;
  lines.push({
    text: `retrieve: ${stats.searches} search · ${stats.scrapes} scrape · ${stats.cacheHits} cache hit`,
  });
  if (stats.budgetPaused) {
    lines.push({ text: "budget: live retrieval paused — cached evidence only", tone: "warn" });
  }
  for (const cap of stats.capsHit) lines.push({ text: `cap: ${cap}`, tone: "warn" });

  result.claims.slice(0, revealedCount).forEach((claim, index) => {
    for (const source of claim.sources) {
      lines.push({ text: `scrape: ${domainOf(source.url)} ✓ Tier ${source.tier}` });
    }
    lines.push({
      text: `judge: claim ${index + 1} → ${claim.status}`,
      status: claim.status,
    });
  });

  if (revealedCount >= result.claims.length) {
    lines.push({ text: `score: GROUNDED ${result.groundingScore}%` });
  }
  return lines;
}

const TONE_TEXT: Record<string, string> = {
  good: "text-accent-green",
  warn: "text-accent-yellow",
  bad: "text-accent-red",
};

export function ActivityBand({
  pending,
  stage,
  result,
  revealedCount,
  stats,
  actions,
}: {
  pending: boolean;
  stage: number;
  result: CheckResult | null;
  revealedCount: number;
  stats?: RetrievalStats | undefined;
  actions?: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const streamRef = useRef<HTMLDivElement | null>(null);
  const lines = buildLines(pending, stage, result, revealedCount);
  const active = pending || (result !== null && revealedCount < result.claims.length);

  useEffect(() => {
    if (streamRef.current) streamRef.current.scrollTop = streamRef.current.scrollHeight;
  }, [lines.length]);

  useEffect(() => {
    if (pending) setExpanded(true);
  }, [pending]);

  const open = expanded || pending;
  const daily = stats?.dailyCallsUsed ?? 0;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/90 backdrop-blur elev-1">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <img
            src={logoAsset.url}
            alt="GroundTruth"
            className="h-10 w-auto shrink-0 object-contain sm:h-12"
          />
          <span className="hidden text-[11px] text-muted-foreground sm:inline">
            Answers with receipts.
          </span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="hidden items-center gap-2 rounded-full border border-border bg-secondary/70 px-2.5 py-1 text-[11px] tabular-nums text-muted-foreground sm:inline-flex">
            <span
              className={cn(
                "inline-block size-1.5 rounded-full",
                active ? "animate-pulse bg-brand" : "bg-brand/50",
              )}
              aria-hidden="true"
            />
            {active ? "Working" : "Ready"}
            <span className="text-foreground/70">
              {daily}/{LIMITS.dailyCallBudget} today
            </span>
          </span>
          {actions}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={open}
            aria-label="Toggle live agent process"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <ChevronDown
              className={cn("size-4 transition-transform", open && "rotate-180")}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>

      {open ? (
        <div className="mx-auto max-w-7xl px-4 pb-3">
          <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
            {PIPELINE_STAGES.map((label, index) => {
              const done = pending ? index < stage : result !== null;
              const current = pending && index === stage;
              return (
                <li
                  key={label}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 transition-[background-color,border-color,color,box-shadow] duration-200",
                    current
                      ? "border-brand/50 bg-brand/10 text-brand shadow-[0_0_0_3px_color-mix(in_oklab,var(--brand)_12%,transparent)]"
                      : done
                        ? "border-accent-green/40 text-accent-green"
                        : "border-border text-muted-foreground",
                  )}
                >
                  {current ? (
                    <Loader2 className="size-3 animate-spin" aria-hidden="true" />
                  ) : done ? (
                    <Check className="gt-tick size-3" aria-hidden="true" />
                  ) : null}
                  {label}
                </li>
              );
            })}
          </ol>

          <div
            ref={streamRef}
            aria-live="polite"
            className="elev-1 mt-2 max-h-28 overflow-y-auto rounded-lg border border-border bg-secondary/50 px-3 py-2 font-mono text-[11px] leading-relaxed"
          >
            {lines.length === 0 ? (
              <p className="text-muted-foreground">idle — submit a check to watch the agent work</p>
            ) : (
              lines.map((line, index) => (
                <p
                  key={`${index}-${line.text}`}
                  className={cn(
                    "gt-rise truncate text-muted-foreground",
                    line.tone && TONE_TEXT[line.tone],
                    line.status && statusStyle(line.status).text,
                    line.status && "font-semibold",
                  )}
                >
                  <span className="mr-2 text-foreground/30">›</span>
                  {line.text}
                  {active && index === lines.length - 1 ? (
                    <span aria-hidden="true" className="gt-caret ml-1 text-foreground/60">
                      ▍
                    </span>
                  ) : null}
                </p>
              ))
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}
