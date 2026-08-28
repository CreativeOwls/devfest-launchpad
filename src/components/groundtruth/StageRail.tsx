import { Check } from "lucide-react";

import { PIPELINE_STAGES } from "@/lib/groundtruth/stages";
import { cn } from "@/lib/utils";

export type StageState = "done" | "current" | "pending";

export function stageStates(
  pending: boolean,
  stage: number,
  finished: boolean,
): StageState[] {
  return PIPELINE_STAGES.map((_, index) => {
    if (pending) {
      if (index < stage) return "done";
      if (index === stage) return "current";
      return "pending";
    }
    return finished ? "done" : "pending";
  });
}

/** Connected row of circular stage nodes with a progress rail between them. */
export function StageRail({ states, className }: { states: StageState[]; className?: string }) {
  return (
    <ol
      className={cn("flex w-full min-w-0 items-start gap-0", className)}
      aria-label="Pipeline stages"
    >
      {PIPELINE_STAGES.map((label, index) => {
        const state = states[index] ?? "pending";
        const nextDone = (states[index + 1] ?? "pending") !== "pending";
        return (
          <li
            key={label}
            className="flex min-w-0 flex-1 flex-col items-center"
            aria-current={state === "current" ? "step" : undefined}
          >
            <div className="flex w-full items-center">
              <span
                aria-hidden="true"
                className={cn(
                  "h-px flex-1 transition-colors duration-300",
                  index === 0
                    ? "bg-transparent"
                    : state === "pending"
                      ? "bg-border"
                      : "bg-brand/50",
                )}
              />
              <span
                className={cn(
                  "grid size-6 shrink-0 place-items-center rounded-full border text-[10px] font-semibold transition-[background-color,border-color,color,box-shadow] duration-300 sm:size-7",
                  state === "done" && "border-brand/60 bg-brand/15 text-brand",
                  state === "current" &&
                    "gt-stage-pulse border-brand bg-brand text-brand-foreground",
                  state === "pending" && "border-border bg-card text-muted-foreground",
                )}
              >
                {state === "done" ? (
                  <Check className="gt-tick size-3.5" aria-hidden="true" />
                ) : (
                  index + 1
                )}
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  "h-px flex-1 transition-colors duration-300",
                  index === PIPELINE_STAGES.length - 1
                    ? "bg-transparent"
                    : nextDone || state === "done"
                      ? "bg-brand/50"
                      : "bg-border",
                )}
              />
            </div>
            <span
              className={cn(
                "mt-1 hidden max-w-full truncate px-1 text-[10px] leading-tight md:block",
                state === "current"
                  ? "font-semibold text-foreground"
                  : state === "done"
                    ? "text-muted-foreground"
                    : "text-muted-foreground/70",
              )}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** Condensed indicator for narrow screens: current label + progress dots. */
export function StageDots({ states }: { states: StageState[] }) {
  const currentIndex = states.findIndex((s) => s === "current");
  const label =
    currentIndex >= 0
      ? PIPELINE_STAGES[currentIndex]
      : states.every((s) => s === "done")
        ? "Complete"
        : "Ready";

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="truncate text-[11px] font-semibold leading-none text-foreground">
        {label}
      </span>
      <span className="flex items-center gap-1" aria-hidden="true">
        {states.map((state, index) => (
          <span
            key={index}
            className={cn(
              "size-1.5 rounded-full transition-colors duration-300",
              state === "done" && "bg-brand/70",
              state === "current" && "gt-stage-pulse bg-brand",
              state === "pending" && "bg-border",
            )}
          />
        ))}
      </span>
    </div>
  );
}
