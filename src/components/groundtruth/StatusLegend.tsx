import { statusStyle } from "@/lib/groundtruth/statusStyles";
import { STATUS_ORDER } from "@/lib/groundtruth/types";
import { cn } from "@/lib/utils";

export function StatusLegend({ className }: { className?: string | undefined }) {
  return (
    <div className={cn("space-y-1", className)}>
      <ul
        className="flex flex-wrap items-center gap-x-3 gap-y-1.5"
        aria-label="Claim status colour legend"
      >
        {STATUS_ORDER.map((status) => (
          <li key={status} className="inline-flex items-center gap-1.5">
            <span
              aria-hidden="true"
              style={{ backgroundColor: statusStyle(status).bar.backgroundColor }}
              className="size-2.5 rounded-full"
            />
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              {status}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-[10px] leading-tight text-muted-foreground/80">
        Green → amber → red by evidence strength. Brighter colour = higher confidence.
      </p>
    </div>
  );
}
