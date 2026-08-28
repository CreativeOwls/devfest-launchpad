import { STATUS_STYLES } from "@/lib/groundtruth/statusStyles";
import { STATUS_ORDER } from "@/lib/groundtruth/types";
import { cn } from "@/lib/utils";

export function StatusLegend({ className }: { className?: string | undefined }) {
  return (
    <ul
      className={cn("flex flex-wrap items-center gap-x-3 gap-y-1.5", className)}
      aria-label="Claim status colour legend"
    >
      {STATUS_ORDER.map((status) => (
        <li key={status} className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className={cn("size-2.5 rounded-full", STATUS_STYLES[status].dot)}
          />
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            {status}
          </span>
        </li>
      ))}
    </ul>
  );
}
