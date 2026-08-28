import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";

import { scoreStatusStyle } from "@/lib/groundtruth/statusStyles";
import { STATUS_WEIGHTS, type Claim } from "@/lib/groundtruth/types";
import { cn } from "@/lib/utils";

/** Counts up to the target value; instant when reduced motion is preferred. */
function useCountUp(target: number, duration = 700) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setValue(target);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return value;
}

export function GroundingScore({ claims, score }: { claims: Claim[]; score: number }) {
  const [open, setOpen] = useState(false);
  const shown = useCountUp(score);

  const style = scoreStatusStyle(score);
  const total = claims.reduce((sum, c) => sum + (STATUS_WEIGHTS[c.status] ?? 0), 0);

  return (
    <div className={cn("gt-rise elev-3 relative overflow-hidden rounded-xl border p-4 pl-5", style.wash)}>
      <span aria-hidden="true" className={cn("absolute inset-y-0 left-0 w-1.5", style.bar)} />
      <span
        aria-hidden="true"
        className="seal-sheen pointer-events-none absolute inset-0 opacity-60"
      />
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-left"
        aria-expanded={open}
      >
        <span className="inline-flex items-center gap-2">
          <span className={cn("seal-sheen rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] shadow-[inset_0_1px_0_oklch(1_0_0/0.6)]", style.pill)}>
            Grounded
          </span>
          <span className={cn("text-4xl font-extrabold tabular-nums tracking-tight", style.text)}>
            {shown}%
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
