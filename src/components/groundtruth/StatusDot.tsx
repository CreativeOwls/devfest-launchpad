import { statusTone, type ClaimStatus } from "@/lib/groundtruth/types";
import { cn } from "@/lib/utils";

const TONE_CLASS: Record<string, string> = {
  good: "bg-accent-green",
  warn: "bg-accent-yellow",
  bad: "bg-accent-red",
};

export function StatusDot({
  status,
  pending,
  className,
}: {
  status?: ClaimStatus;
  pending?: boolean;
  className?: string;
}) {
  if (pending || !status) {
    return (
      <span
        aria-hidden="true"
        className={cn("inline-block size-2 animate-pulse rounded-full bg-muted-foreground", className)}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block size-2 rounded-full", TONE_CLASS[statusTone(status)], className)}
    />
  );
}
