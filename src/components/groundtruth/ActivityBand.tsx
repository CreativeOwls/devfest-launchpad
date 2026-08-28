import { useEffect, useRef, type ReactNode } from "react";

import { Radar } from "@/components/groundtruth/Radar";
import { StageDots, StageRail, stageStates } from "@/components/groundtruth/StageRail";
import { LIMITS, type RetrievalStats } from "@/lib/groundtruth/limits";
import { PIPELINE_STAGES } from "@/lib/groundtruth/stages";
import { statusStyle } from "@/lib/groundtruth/statusStyles";
import type { CheckResult, ClaimStatus } from "@/lib/groundtruth/types";
import { cn } from "@/lib/utils";
import logoAsset from "@/assets/groundtruth-logo-transparent.png";

export { PIPELINE_STAGES };

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
  const streamRef = useRef<HTMLDivElement | null>(null);
  const lines = buildLines(pending, stage, result, revealedCount);
  const active = pending || (result !== null && revealedCount < result.claims.length);
  const states = stageStates(pending, stage, result !== null);

  useEffect(() => {
    if (streamRef.current) streamRef.current.scrollTop = streamRef.current.scrollHeight;
  }, [lines.length]);

  const daily = stats?.dailyCallsUsed ?? 0;

  return (
    <header className="sticky top-0 z-40 w-full border-0 border-b border-border bg-background/92 backdrop-blur elev-1">
      {/* Full-bleed top row — no max width, edge to edge */}
      <div className="flex w-full items-center gap-2 px-3 py-2 sm:gap-4 sm:px-5">
        <div className="flex min-w-0 shrink-0 items-center gap-2">
          <img
            src={logoAsset}
            alt="GroundTruth"
            className="h-7 w-auto shrink-0 object-contain sm:h-11 lg:h-12"
          />
          <span className="hidden text-[11px] text-muted-foreground xl:inline">
            Answers with receipts.
          </span>
        </div>

        {/* Radar + stage rail: the live "working" instrument */}
        <div className="flex min-w-0 flex-1 items-center gap-2 px-1 py-1 sm:gap-3 sm:px-2">
          <Radar
            active={active}
            className="h-8 sm:h-10 lg:h-11"
            label={active ? "Agent working" : "Agent is idle"}
          />
          <div
            className={cn(
              "hidden min-w-0 flex-1 lg:block transition-opacity duration-300",
              !active && "opacity-60",
            )}
          >
            <StageRail states={states} />
          </div>
          <div
            className={cn(
              "min-w-0 flex-1 lg:hidden transition-opacity duration-300",
              !active && "opacity-60",
            )}
          >
            <StageDots states={states} />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <span className="hidden items-center gap-2 rounded-full border border-border bg-secondary/70 px-2.5 py-1 text-[11px] tabular-nums text-muted-foreground md:inline-flex">
            <span
              className={cn(
                "inline-block size-1.5 rounded-full",
                active ? "animate-pulse bg-brand" : "bg-brand/50",
              )}
              aria-hidden="true"
            />
            {active ? "Working" : "Agent is idle"}
            <span className="text-foreground/70">
              {daily}/{LIMITS.dailyCallBudget} today
            </span>
          </span>
          {actions}
        </div>
      </div>

      <div className="w-full space-y-2 px-3 pb-3 sm:px-5">
        <div className={cn("lg:hidden transition-opacity duration-300", !active && "opacity-60")}>
          <StageRail states={states} />
        </div>

        <div className="flex items-center justify-between gap-2 md:hidden">
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {active ? "Working" : "Agent is idle"} · {daily}/{LIMITS.dailyCallBudget} today
          </span>
        </div>

        <div
          ref={streamRef}
          aria-live="polite"
          className="elev-1 max-h-28 overflow-y-auto rounded-lg border border-border bg-secondary/50 px-3 py-2 font-mono text-[11px] leading-relaxed"
        >
          {lines.length === 0 ? (
            <p className="text-muted-foreground">agent is idle — submit a check to watch it work</p>
          ) : (
            lines.map((line, index) => (
              <p
                key={`${index}-${line.text}`}
                style={line.status ? statusStyle(line.status).text : undefined}
                className={cn(
                  "gt-rise truncate text-muted-foreground",
                  !line.status && line.tone && TONE_TEXT[line.tone],
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
    </header>
  );
}
