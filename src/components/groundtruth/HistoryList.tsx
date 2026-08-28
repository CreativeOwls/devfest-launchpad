import { scoreStatusStyle } from "@/lib/groundtruth/statusStyles";
import type { CheckSummary } from "@/lib/groundtruth/types";
import { cn } from "@/lib/utils";

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const seconds = Math.max(1, Math.round((Date.now() - then) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}




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
    return (
      <p className="px-3 py-2 text-xs text-muted-foreground">Your checks will appear here.</p>
    );
  }

  return (
    <ul className="space-y-1 pr-1">
      {checks.map((check) => {
        const title = check.inputText.replace(/\s+/g, " ").trim();
        return (
          <li key={check.id}>
            <button
              type="button"
              onClick={() => onSelect(check.id)}
              aria-current={activeId === check.id ? "true" : undefined}
              className={cn(
                "gt-lift w-full rounded-lg border border-transparent px-3 py-2.5 text-left text-xs hover:border-border hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                activeId === check.id && "border-accent-blue/40 bg-card elev-1",
              )}

            >
              <span className="line-clamp-2 font-medium leading-snug text-foreground/90">

                {title.length > 60 ? `${title.slice(0, 60)}…` : title}
              </span>
              <span className="mt-1 flex items-center gap-2">
                <span
                  style={scoreStatusStyle(check.groundingScore).pill}
                  className="rounded-full border px-1.5 py-px text-[10px] font-bold tabular-nums"
                >
                  {check.groundingScore === null ? "—" : `${Math.round(check.groundingScore)}%`}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {relativeTime(check.createdAt)}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
