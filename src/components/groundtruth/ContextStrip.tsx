import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

export function ContextStrip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-border bg-card/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left"
      >
        <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
          <span className="mr-2 uppercase tracking-wide text-foreground/60">Pasted post</span>
          {text}
        </span>
        <ChevronDown
          className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>
      {open ? (
        <p className="whitespace-pre-wrap border-t border-border px-3 py-2 text-xs leading-relaxed text-muted-foreground">
          {text}
        </p>
      ) : null}
    </div>
  );
}
