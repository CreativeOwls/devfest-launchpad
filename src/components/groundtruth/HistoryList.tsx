import type { CheckSummary } from "@/lib/groundtruth/types";
import { cn } from "@/lib/utils";

export function HistoryList({
  checks,
  activeId,
  onSelect,
}: {
  checks: CheckSummary[];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  if (checks.length === 0) {
    return <p className="px-3 text-xs text-muted-foreground">No past checks yet.</p>;
  }

  return (
    <ul className="space-y-1">
      {checks.map((check) => (
        <li key={check.id}>
          <button
            type="button"
            onClick={() => onSelect(check.id)}
            className={cn(
              "w-full rounded-md px-3 py-2 text-left text-xs transition-colors hover:bg-secondary/60",
              activeId === check.id && "bg-secondary/70",
            )}
          >
            <span className="line-clamp-1 text-foreground/90">{check.inputText}</span>
            <span className="mt-0.5 block text-[10px] tabular-nums text-muted-foreground">
              {new Date(check.createdAt).toLocaleDateString()} ·{" "}
              {check.groundingScore === null ? "—" : `${Math.round(check.groundingScore)}%`}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
