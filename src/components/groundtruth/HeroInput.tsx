import { ImagePlus, X } from "lucide-react";
import { useRef, useState } from "react";

import logoAsset from "@/assets/groundtruth-logo.png.asset.json";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type Attachment = { dataUrl: string; name: string };

const ACCEPT = ["image/png", "image/jpeg", "image/webp"];

function readFile(file: File): Promise<Attachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ dataUrl: String(reader.result), name: file.name || "screenshot" });
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.readAsDataURL(file);
  });
}

export function HeroInput({
  value,
  onChange,
  attachment,
  onAttach,
  onClearAttachment,
  onSubmit,
  pending,
  compact,
  onExpand,
  onInvalidFile,
}: {
  value: string;
  onChange: (value: string) => void;
  attachment: Attachment | null;
  onAttach: (attachment: Attachment) => void;
  onClearAttachment: () => void;
  onSubmit: () => void;
  pending: boolean;
  compact: boolean;
  onExpand: () => void;
  onInvalidFile: (message: string) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const takeFile = async (file: File | null | undefined) => {
    if (!file) return;
    if (!ACCEPT.includes(file.type)) {
      onInvalidFile("Only PNG, JPG or WEBP screenshots are supported.");
      return;
    }
    try {
      onAttach(await readFile(file));
    } catch {
      onInvalidFile("Could not read that image.");
    }
  };

  const handlePaste = (event: React.ClipboardEvent) => {
    const file = Array.from(event.clipboardData.files)[0];
    if (file && ACCEPT.includes(file.type)) {
      event.preventDefault();
      void takeFile(file);
    }
  };

  const form = (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        void takeFile(event.dataTransfer.files[0]);
      }}
      className={cn(
        "elev-2 rounded-2xl border border-border bg-card p-3 transition-[box-shadow,border-color,background-color] duration-200 focus-within:elev-3",
        dragging && "border-accent-blue/60 bg-accent-blue/5",
        !compact && "p-4 sm:p-5",
      )}
    >
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onPaste={handlePaste}
        placeholder="Paste a viral post, an article, or ask a question…"
        className={cn(
          "resize-y border-0 bg-transparent px-0 shadow-none focus-visible:ring-0",
          compact ? "min-h-12" : "min-h-32 text-base leading-relaxed sm:min-h-36",
        )}
      />


      {attachment ? (
        <div className="mt-2 flex items-center gap-3 rounded-lg border border-border bg-background/60 p-2">
          <img
            src={attachment.dataUrl}
            alt={`Attached screenshot ${attachment.name}`}
            className="size-10 rounded object-cover"
          />
          <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
            {attachment.name}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            aria-label="Remove attached image"
            onClick={onClearAttachment}
          >
            <X className="size-4" aria-hidden="true" />
          </Button>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <input
            ref={fileInput}
            type="file"
            accept={ACCEPT.join(",")}
            className="sr-only"
            onChange={(event) => {
              void takeFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-2 text-xs text-muted-foreground"
            onClick={() => fileInput.current?.click()}
          >
            <ImagePlus className="size-4" aria-hidden="true" />
            Screenshot
          </Button>
          {!compact ? (
            <span className="hidden text-[11px] text-muted-foreground sm:inline">
              drop or paste an image
            </span>
          ) : null}
        </div>
        <Button
          type="submit"
          disabled={pending}
          size={compact ? "sm" : "lg"}
          className="shrink-0 rounded-full px-5 font-semibold tracking-tight sm:px-6"
        >
          {pending ? "Checking…" : "Check It"}
        </Button>
      </div>
    </form>
  );

  if (compact) {
    return (
      <div className="space-y-2">
        {form}
        <button
          type="button"
          onClick={onExpand}
          className="text-[11px] text-muted-foreground underline-offset-2 hover:underline"
        >
          Expand
        </button>
      </div>
    );
  }

  return (
    <section className="relative py-6 text-center sm:py-10 lg:py-12">
      <span
        aria-hidden="true"
        className="gt-aurora pointer-events-none absolute left-1/2 top-0 -z-10 h-56 w-[min(46rem,90%)] -translate-x-1/2 opacity-70"
      />
      <div className="gt-rise flex flex-col items-center gap-3 sm:gap-4">
        <img
          src={logoAsset.url}
          alt="GroundTruth"
          className="h-20 w-auto object-contain sm:h-28 lg:h-36"
        />
      </div>
      <p className="gt-rise mt-3 text-sm font-semibold uppercase tracking-[0.22em] text-muted-foreground [animation-delay:80ms]">
        Answers with receipts.
      </p>
      <div className="gt-rise mx-auto mt-6 max-w-2xl text-left [animation-delay:140ms] sm:mt-8">{form}</div>
    </section>
  );
}

