import { TIER_LABELS } from "@/lib/groundtruth/tiers";
import { cn } from "@/lib/utils";

const TIER_CLASS: Record<number, string> = {
  1: "border-accent-green/40 text-accent-green",
  2: "border-accent-blue/40 text-accent-blue",
  3: "border-accent-yellow/40 text-accent-yellow",
  4: "border-accent-red/40 text-accent-red",
  5: "border-border text-muted-foreground",
};

export function TierBadge({ tier }: { tier: number }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
        TIER_CLASS[tier] ?? TIER_CLASS[5],
      )}
    >
      {TIER_LABELS[tier] ?? TIER_LABELS[5]}
    </span>
  );
}
