import { statusStyle } from "@/lib/groundtruth/statusStyles";
import type { ClaimStatus } from "@/lib/groundtruth/types";
import { cn } from "@/lib/utils";

export function StatusPill({
  status,
  pending,
  className,
}: {
  status?: ClaimStatus | undefined;
  pending?: boolean | undefined;
  className?: string | undefined;
}) {
  const isPending = pending || !status;
  const style = statusStyle(isPending ? null : status);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em]",
        style.pill,
        className,
      )}
    >
      <span aria-hidden="true" className={cn("size-2 rounded-full", style.bar)} />
      {isPending ? "Judging…" : status}
    </span>
  );
}
