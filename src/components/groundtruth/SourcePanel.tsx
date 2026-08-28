import { useState } from "react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Kind = "question" | "pasted" | "image";

const KIND_LABEL: Record<Kind, string> = {
  question: "Question",
  pasted: "Pasted text",
  image: "Screenshot",
};

/**
 * Shows the exact material a check was run against: the submitted screenshot
 * (if any), the text read from it, or the pasted/typed text.
 */
export function SourcePanel({
  kind,
  text,
  imageUrl,
  ocrText,
}: {
  kind: Kind;
  text: string;
  imageUrl?: string | null;
  ocrText?: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const [lightbox, setLightbox] = useState(false);

  const bodyText = kind === "image" ? (ocrText ?? text) : text;
  const long = bodyText.length > 480;

  return (
    <section
      aria-label="Evaluated content"
      className="card-elevated overflow-hidden rounded-xl border border-border bg-card"
    >
      <header className="flex items-center gap-2 border-b border-border bg-secondary/50 px-4 py-2.5">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Evaluated content
        </h2>
        <span className="rounded-full border border-border bg-card px-2 py-0.5 text-[10px] font-medium text-foreground/70">
          {KIND_LABEL[kind]}
        </span>
      </header>

      <div className="space-y-3 p-4">
        {imageUrl ? (
          <>
            <button
              type="button"
              onClick={() => setLightbox(true)}
              className="block w-full overflow-hidden rounded-lg border border-border bg-secondary/40 transition-opacity hover:opacity-90"
              aria-label="Expand submitted screenshot"
            >
              <img
                src={imageUrl}
                alt="Submitted screenshot"
                className="mx-auto max-h-72 w-auto max-w-full object-contain"
                loading="lazy"
              />
            </button>
            <Dialog open={lightbox} onOpenChange={setLightbox}>
              <DialogContent className="app-theme max-w-4xl">
                <DialogTitle className="text-sm">Submitted screenshot</DialogTitle>
                <img
                  src={imageUrl}
                  alt="Submitted screenshot, full size"
                  className="max-h-[75vh] w-full object-contain"
                />
              </DialogContent>
            </Dialog>
          </>
        ) : null}

        {bodyText ? (
          <div>
            {imageUrl ? (
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Text read from image
              </p>
            ) : null}
            <blockquote
              className={cn(
                "relative overflow-hidden whitespace-pre-wrap rounded-lg border-l-2 border-brand/50 bg-secondary/45 px-4 py-3 font-serif text-[13.5px] leading-relaxed text-foreground/85",
                long && !expanded && "max-h-44",
              )}
            >
              {bodyText}
              {long && !expanded ? (
                <span className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-card to-transparent" />
              ) : null}
            </blockquote>
            {long ? (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="mt-2 text-xs font-medium text-primary hover:underline"
              >
                {expanded ? "Show less" : "Show more"}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
