import { TIER_LABELS } from "@/lib/groundtruth/tiers";
import { cn } from "@/lib/utils";

const TIER_CLASS: Record<number, string> = {
  1: "border-accent-green/45 bg-accent-green/10 text-accent-green",
  2: "border-accent-blue/45 bg-accent-blue/10 text-accent-blue",
  3: "border-accent-yellow/50 bg-accent-yellow/10 text-accent-yellow",
  4: "border-accent-red/45 bg-accent-red/10 text-accent-red",
  5: "border-border bg-secondary text-muted-foreground",
};

export function TierBadge({ tier }: { tier: number }) {
  return (
    <span
      className={cn(
        "seal-sheen inline-flex shrink-0 items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] shadow-[inset_0_1px_0_oklch(1_0_0/0.6),0_1px_1px_oklch(0.2_0.02_264/0.06)]",
        TIER_CLASS[tier] ?? TIER_CLASS[5],
      )}
    >
      {TIER_LABELS[tier] ?? TIER_LABELS[5]}
    </span>
  );
}
