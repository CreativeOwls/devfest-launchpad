import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { STATUS_WEIGHTS, type Claim } from "@/lib/groundtruth/types";
import { cn } from "@/lib/utils";

export function GroundingScore({ claims, score }: { claims: Claim[]; score: number }) {
  const [open, setOpen] = useState(false);

  const tone =
    score >= 70 ? "text-accent-green" : score >= 40 ? "text-accent-yellow" : "text-accent-red";
  const total = claims.reduce((sum, c) => sum + (STATUS_WEIGHTS[c.status] ?? 0), 0);

  return (
    <div className="card-elevated rounded-xl border border-border bg-card p-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-left"
        aria-expanded={open}
      >
        <span className="inline-flex items-center gap-2">
          <span className="rounded-md border border-border bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Grounded
          </span>
          <span className={cn("text-2xl font-bold tabular-nums tracking-tight", tone)}>
            {score}%
          </span>
        </span>
        <ChevronDown
          className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>


      {open ? (
        <div className="mt-3 space-y-2 border-t border-border pt-3 text-xs text-muted-foreground">
          <p>Weighted average of claim statuses — no black box.</p>
          <ul className="space-y-1">
            {claims.map((claim, i) => (
              <li key={claim.id} className="flex items-start justify-between gap-3">
                <span className="line-clamp-1 text-foreground/80">
                  {i + 1}. {claim.text}
                </span>
                <span className="whitespace-nowrap tabular-nums">
                  {claim.status} = {(STATUS_WEIGHTS[claim.status] ?? 0).toFixed(1)}
                </span>
              </li>
            ))}
          </ul>
          <p className="border-t border-border pt-2 tabular-nums text-foreground/80">
            ({total.toFixed(1)} ÷ {claims.length} claims) × 100 = {score}%
          </p>
        </div>
      ) : null}
    </div>
  );
}
