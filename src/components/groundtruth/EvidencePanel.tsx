import { useEffect, useRef } from "react";

import { EvidenceCard } from "@/components/groundtruth/EvidenceCard";
import { StatusDot } from "@/components/groundtruth/StatusDot";
import { StatusPill } from "@/components/groundtruth/StatusPill";
import { statusStyle } from "@/lib/groundtruth/statusStyles";
import { LIMITS, type RetrievalStats } from "@/lib/groundtruth/limits";
import type { Claim } from "@/lib/groundtruth/types";
import { cn } from "@/lib/utils";

export function EvidencePanel({
  claims,
  activeClaimId,
  revealedCount,
  stats,
}: {
  claims: Claim[];
  activeClaimId: string | null;
  revealedCount: number;
  stats?: RetrievalStats | undefined;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!activeClaimId || !containerRef.current) return;
    const target = containerRef.current.querySelector(`[data-claim-id="${activeClaimId}"]`);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [activeClaimId]);

  if (claims.length === 0) {
    return (
      <p className="p-4 text-xs text-muted-foreground">
        Evidence for each claim will appear here once a check runs.
      </p>
    );
  }

  const sourceCount = claims.reduce((n, c) => n + c.sources.length, 0);

  return (
    <div ref={containerRef} className="space-y-5 p-4">
      {stats ? (
        <div className="space-y-2">
          {stats.budgetPaused ? (
            <p className="rounded-md border border-accent-yellow/40 bg-accent-yellow/5 px-2 py-1.5 text-[11px] text-accent-yellow">
              Live retrieval paused (daily source budget reached) — showing cached evidence.
            </p>
          ) : null}
          <p className="rounded-lg border border-border bg-secondary/60 px-2.5 py-1.5 font-mono text-[11px] tabular-nums text-muted-foreground">
            {sourceCount} source{sourceCount === 1 ? "" : "s"} · {stats.searches} search
            {stats.searches === 1 ? "" : "es"} · {stats.scrapes} scrape
            {stats.scrapes === 1 ? "" : "s"} · {stats.cacheHits} cache hit
            {stats.cacheHits === 1 ? "" : "s"}
            {stats.dailyCallsUsed > 0
              ? ` · ${stats.dailyCallsUsed}/${LIMITS.dailyCallBudget} today`
              : ""}
            {stats.eventCallsUsed > 0
              ? ` · ${stats.eventCallsUsed}/${LIMITS.eventCallBudget} event`
              : ""}
            {stats.capsHit.length > 0 ? ` · caps: ${stats.capsHit.join(", ")}` : ""}
          </p>
          {stats.unverifiedClaims.length > 0 ? (
            <p className="text-[11px] text-muted-foreground">
              {stats.unverifiedClaims.length} further claim
              {stats.unverifiedClaims.length === 1 ? " was" : "s were"} not verified (per-task claim
              cap).
            </p>
          ) : null}
        </div>
      ) : null}
      {claims.map((claim, index) => {
        const revealed = index < revealedCount;
        const style = statusStyle(revealed ? claim.status : null);
        return (
          <section
            key={claim.id}
            data-claim-id={claim.id}
            className={cn(
              "relative scroll-mt-4 overflow-hidden rounded-xl border p-3.5 pl-4 transition-all duration-500",
              revealed ? style.wash : "border-border bg-card",
              activeClaimId === claim.id && "shadow-sm ring-1 ring-accent-blue/30",
              revealed ? "opacity-100" : "opacity-40",
            )}
          >
            <span
              aria-hidden="true"
              className={cn("absolute inset-y-0 left-0 w-1.5", revealed ? style.bar : "bg-border")}
            />
            <div className="flex items-start gap-3">
              <StatusDot status={revealed ? claim.status : undefined} pending={!revealed} className="mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-medium leading-snug text-foreground">{claim.text}</p>
                <div className="mt-2">
                  <StatusPill status={revealed ? claim.status : undefined} pending={!revealed} />
                </div>
              </div>
            </div>

            {revealed && claim.justification ? (
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {claim.justification}
              </p>
            ) : null}

            {revealed && claim.drift ? (
              <div className="mt-3 rounded-md border border-accent-yellow/40 bg-accent-yellow/5 p-2">
                <p className="text-[11px] font-medium uppercase tracking-wide text-accent-yellow">
                  Claim drift detected
                </p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">
                      {claim.drift.higherTierSource}
                    </p>
                    <p className="text-xs text-foreground/90">{claim.drift.higherTierWording}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">
                      {claim.drift.lowerTierSource}
                    </p>
                    <p className="text-xs text-foreground/90">{claim.drift.lowerTierWording}</p>
                  </div>
                </div>
              </div>
            ) : null}

            {revealed ? (
              <div className="mt-3 space-y-2">
                {claim.sources.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No retrievable source.</p>
                ) : (
                  claim.sources.map((source, i) => (
                    <EvidenceCard key={source.id} source={source} index={i} />
                  ))
                )}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
