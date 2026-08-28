import { statusStyle } from "@/lib/groundtruth/statusStyles";
import type { ClaimStatus } from "@/lib/groundtruth/types";
import { cn } from "@/lib/utils";

export function StatusDot({
  status,
  pending,
  confidence,
  className,
}: {
  status?: ClaimStatus | undefined;
  // optional-undefined for exactOptionalPropertyTypes
  pending?: boolean | undefined;
  /** 0-1 — brightness of the status colour encodes confidence. */
  confidence?: number | undefined;
  className?: string | undefined;
}) {
  const style = statusStyle(pending ? null : status, confidence ?? 1);
  return (
    <span
      aria-hidden="true"
      style={style.dot}
      className={cn(
        "inline-block size-4 shrink-0 rounded-full",
        (pending || !status) && "animate-pulse",
        className,
      )}
    />
  );
}
