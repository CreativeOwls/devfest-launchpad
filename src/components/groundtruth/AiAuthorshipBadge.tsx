import { ChevronDown, Sparkles } from "lucide-react";
import { useState } from "react";

import type { AiAuthorship } from "@/lib/groundtruth/types";
import { cn } from "@/lib/utils";

/**
 * Secondary, independent signal. Deliberately uses a slate/violet ink treatment
 * so it never reads as a claim-status (green/amber/red) verdict, and never
 * renders a binary "AI: yes/no" — always percentage + confidence + caveat.
 */
export function AiAuthorshipBadge({ authorship }: { authorship: AiAuthorship }) {
  const [open, setOpen] = useState(false);

  const { aiLikelihood, confidence, signals, caveat } = authorship;
  const low = confidence === "low";
  const leansAi = aiLikelihood >= 50;
  const shown = leansAi ? aiLikelihood : 100 - aiLikelihood;

  const label = low ? "Inconclusive" : leansAi ? "Likely AI-written" : "Likely human";

  return (
    <div
      className={cn(
        "gt-rise elev-1 rounded-lg border bg-card/80 px-3 py-2",
        low
          ? "border-border text-muted-foreground"
          : "border-[oklch(0.55_0.09_285/0.35)] bg-[oklch(0.55_0.09_285/0.05)]",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 rounded"
        title={caveat}
      >
        <Sparkles
          className={cn("size-3.5 shrink-0", low ? "text-muted-foreground" : "text-[oklch(0.5_0.11_285)]")}
          aria-hidden="true"
        />
        <span
          className={cn(
            "text-xs font-semibold tracking-tight",
            low ? "text-muted-foreground" : "text-[oklch(0.42_0.09_285)]",
          )}
        >
          {label} <span className="tabular-nums">{shown}%</span>
        </span>
        <span className="ml-auto inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          {confidence} confidence
          <ChevronDown
            className={cn("size-3 transition-transform duration-200", open && "rotate-180")}
            aria-hidden="true"
          />
        </span>
      </button>

      <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{caveat}</p>

      {open ? (
        <div className="gt-rise mt-2 border-t border-border pt-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Style signals
          </p>
          {signals.length === 0 ? (
            <p className="mt-1 text-[11px] text-muted-foreground">No specific signals reported.</p>
          ) : (
            <ul className="mt-1 space-y-0.5 text-[11px] leading-relaxed text-foreground/80">
              {signals.map((signal) => (
                <li key={signal} className="flex gap-1.5">
                  <span aria-hidden="true" className="text-muted-foreground">
                    ·
                  </span>
                  {signal}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-[10px] leading-snug text-muted-foreground">
            Independent of the grounding score — it measures writing style, not sourcing.
          </p>
        </div>
      ) : null}
    </div>
  );
}
