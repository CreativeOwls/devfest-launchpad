import { statusStyle } from "@/lib/groundtruth/statusStyles";
import type { ClaimStatus } from "@/lib/groundtruth/types";
import { cn } from "@/lib/utils";

export function StatusDot({
  status,
  pending,
  className,
}: {
  status?: ClaimStatus | undefined;
  // optional-undefined for exactOptionalPropertyTypes
  pending?: boolean | undefined;
  className?: string | undefined;
}) {
  const style = statusStyle(pending ? null : status);
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block size-4 shrink-0 rounded-full ring-4",
        style.dot,
        (pending || !status) && "animate-pulse",
        className,
      )}
    />
  );
}
