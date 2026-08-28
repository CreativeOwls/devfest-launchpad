import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

export function ContextStrip({ text, label = "Pasted post" }: { text: string; label?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-secondary/60">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left"
      >
        <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
          <span className="mr-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground/60">
            {label}
          </span>
          {text}
        </span>
        <ChevronDown
          className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>
      {open ? (
        <p className="whitespace-pre-wrap border-t border-border px-3.5 py-2.5 text-xs leading-relaxed text-muted-foreground">
          {text}
        </p>
      ) : null}
    </div>
  );
}
