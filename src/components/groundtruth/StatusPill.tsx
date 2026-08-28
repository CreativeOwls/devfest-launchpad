import { statusStyle } from "@/lib/groundtruth/statusStyles";
import type { ClaimStatus } from "@/lib/groundtruth/types";
import { cn } from "@/lib/utils";

export function StatusPill({
  status,
  pending,
  confidence,
  className,
}: {
  status?: ClaimStatus | undefined;
  pending?: boolean | undefined;
  /** 0-1 — brightness of the status colour encodes confidence. */
  confidence?: number | undefined;
  className?: string | undefined;
}) {
  const isPending = pending || !status;
  const style = statusStyle(isPending ? null : status, confidence ?? 1);
  return (
    <span
      style={style.pill}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em] shadow-[inset_0_1px_0_oklch(1_0_0/0.5)]",
        !isPending && "gt-settle",
        className,
      )}
    >
      <span aria-hidden="true" style={style.bar} className="size-2 rounded-full" />
      {isPending ? "Judging…" : status}
    </span>
  );
}
