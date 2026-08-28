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

function scoreClasses(score: number | null): string {
  if (score === null) return "border-border text-muted-foreground";
  if (score >= 70) return "border-accent-green/40 text-accent-green";
  if (score >= 40) return "border-accent-yellow/40 text-accent-yellow";
  return "border-accent-red/40 text-accent-red";
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
                "w-full rounded-md border border-transparent px-3 py-2 text-left text-xs transition-colors hover:bg-secondary/60",
                activeId === check.id && "border-accent-blue/40 bg-secondary/70",
              )}
            >
              <span className="line-clamp-2 text-foreground/90">
                {title.length > 60 ? `${title.slice(0, 60)}…` : title}
              </span>
              <span className="mt-1 flex items-center gap-2">
                <span
                  className={cn(
                    "rounded-full border px-1.5 py-px text-[10px] tabular-nums",
                    scoreClasses(check.groundingScore),
                  )}
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
