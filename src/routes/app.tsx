import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Menu, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { ActivityBand } from "@/components/groundtruth/ActivityBand";
import { AnswerBody } from "@/components/groundtruth/AnswerBody";

import { ContextStrip } from "@/components/groundtruth/ContextStrip";
import { StatusLegend } from "@/components/groundtruth/StatusLegend";
import { SourcePanel } from "@/components/groundtruth/SourcePanel";
import { EvidencePanel } from "@/components/groundtruth/EvidencePanel";
import { AiAuthorshipBadge } from "@/components/groundtruth/AiAuthorshipBadge";
import { GroundingScore } from "@/components/groundtruth/GroundingScore";
import { HeroInput, type Attachment } from "@/components/groundtruth/HeroInput";
import { HistoryList } from "@/components/groundtruth/HistoryList";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { getCheck, listChecks, ocrImage, runCheck } from "@/lib/groundtruth.functions";
import type { CheckResult } from "@/lib/groundtruth/types";

const TITLE = "GroundTruth — Answers with receipts";
const DESCRIPTION =
  "Paste a viral post or ask a question. GroundTruth answers conversationally with inline citations, source tiers and a transparent grounding score.";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AppPage,
});

const STAGES = [
  "Decomposing the input into atomic claims…",
  "Searching the web for candidate sources…",
  "Scraping and reading each page…",
  "Judging every claim against its evidence…",
  "Composing the answer with receipts…",
];

function AppPage() {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();

  const [input, setInput] = useState("");
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [ocrText, setOcrText] = useState<string | null>(null);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [activeClaimId, setActiveClaimId] = useState<string | null>(null);
  const [revealedCount, setRevealedCount] = useState(0);
  const [stage, setStage] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [heroExpanded, setHeroExpanded] = useState(true);
  const revealTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const runCheckFn = useServerFn(runCheck);
  const ocrImageFn = useServerFn(ocrImage);
  const listChecksFn = useServerFn(listChecks);
  const getCheckFn = useServerFn(getCheck);

  const history = useQuery({
    queryKey: ["gt-history"],
    queryFn: () => listChecksFn(),
  });

  const revealClaims = (check: CheckResult) => {
    revealTimers.current.forEach(clearTimeout);
    revealTimers.current = [];
    setRevealedCount(0);
    check.claims.forEach((_, index) => {
      revealTimers.current.push(
        setTimeout(() => setRevealedCount(index + 1), 350 * (index + 1)),
      );
    });
  };

  const mutation = useMutation({
    mutationFn: async ({ image }: { image: Attachment | null }) => {
      let text = input.trim();
      let kind: "question" | "pasted" | "image" | undefined;
      let imagePath: string | null = null;
      let extractedText: string | null = null;
      if (image) {
        const { text: extracted, imagePath: path } = await ocrImageFn({
          data: { image: image.dataUrl },
        });
        setOcrText(extracted);
        extractedText = extracted;
        imagePath = path;
        text = [text, extracted].filter(Boolean).join("\n\n").trim();
        kind = "image";
      }
      return runCheckFn({ data: { input: text, kind, imagePath, ocrText: extractedText } });
    },
    onSuccess: (check) => {
      setResult(check);
      setActiveClaimId(check.claims[0]?.id ?? null);
      setHeroExpanded(false);
      revealClaims(check);
      void queryClient.invalidateQueries({ queryKey: ["gt-history"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "That check failed. Try again.");
    },
  });

  const loadPast = useMutation({
    mutationFn: (id: string) => getCheckFn({ data: { id } }),
    onSuccess: (check) => {
      if (!check) return;
      revealTimers.current.forEach(clearTimeout);
      setResult(check);
      setInput("");
      setAttachment(null);
      setOcrText(null);
      setHeroExpanded(false);
      setActiveClaimId(check.claims[0]?.id ?? null);
      setRevealedCount(check.claims.length);
      setHistoryOpen(false);
    },
    onError: () => toast.error("Could not load that check."),
  });

  // Stage ticker while the pipeline runs.
  useEffect(() => {
    if (!mutation.isPending) {
      setStage(0);
      return;
    }
    const interval = setInterval(() => {
      setStage((s) => Math.min(s + 1, STAGES.length - 1));
    }, 3500);
    return () => clearInterval(interval);
  }, [mutation.isPending]);

  useEffect(() => () => revealTimers.current.forEach(clearTimeout), []);

  const selectClaim = (claimId: string) => {
    setActiveClaimId(claimId);
    if (isMobile) setDrawerOpen(true);
  };

  const newCheck = () => {
    revealTimers.current.forEach(clearTimeout);
    setResult(null);
    setActiveClaimId(null);
    setRevealedCount(0);
    setInput("");
    setAttachment(null);
    setOcrText(null);
    setHeroExpanded(true);
    setHistoryOpen(false);
  };

  const submit = () => {
    if (mutation.isPending) return;
    const value = input.trim();
    if (!attachment && value.length < 3) {
      toast.error("Paste a post, drop a screenshot, or ask a question first.");
      return;
    }
    revealTimers.current.forEach(clearTimeout);
    setResult(null);
    setActiveClaimId(null);
    setRevealedCount(0);
    setOcrText(null);
    mutation.mutate({ image: attachment });
  };

  const claims = result?.claims ?? [];
  const evidence = (
    <EvidencePanel
      claims={claims}
      activeClaimId={activeClaimId}
      revealedCount={revealedCount}
      stats={result?.retrievalStats}
    />
  );

  const historyPanel = (
    <HistoryList
      checks={history.data ?? []}
      activeId={result?.id ?? null}
      onSelect={(id) => loadPast.mutate(id)}
    />
  );

  const busy = mutation.isPending || loadPast.isPending;
  const showHero = heroExpanded || (!result && !mutation.isPending);

  return (
    <div className="app-theme relative min-h-screen text-foreground">
      <div
        aria-hidden="true"
        className="grid-paper pointer-events-none fixed inset-0 opacity-70"
      />
      <div className="relative">
        <ActivityBand
          pending={mutation.isPending}
          stage={stage}
          result={result}
          revealedCount={revealedCount}
          stats={result?.retrievalStats}
          actions={
            <>
              <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden" aria-label="History">
                    <Menu className="size-4" aria-hidden="true" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="app-theme w-80 overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>History</SheetTitle>
                  </SheetHeader>
                  <div className="px-2 pb-6">{historyPanel}</div>
                </SheetContent>
              </Sheet>
              <Button variant="default" size="sm" className="gap-1 rounded-full" onClick={newCheck}>
                <Plus className="size-4" aria-hidden="true" />
                New Check
              </Button>
              {isMobile ? (
                <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
                  <DrawerTrigger asChild>
                    <Button variant="outline" size="sm" className="rounded-full">
                      Evidence ({claims.reduce((n, c) => n + c.sources.length, 0)})
                    </Button>
                  </DrawerTrigger>
                  <DrawerContent className="app-theme max-h-[85vh]">
                    <DrawerHeader>
                      <DrawerTitle>Evidence</DrawerTitle>
                    </DrawerHeader>
                    <div className="overflow-y-auto">{evidence}</div>
                  </DrawerContent>
                </Drawer>
              ) : null}
            </>
          }
        />

        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 lg:grid-cols-[230px_minmax(0,1fr)_390px]">
          <aside className="hidden lg:block">
            <div className="flex items-center justify-between px-1 pb-2">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                History
              </h2>
              <button
                type="button"
                onClick={newCheck}
                aria-label="Start a new check"
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <Plus className="size-4" aria-hidden="true" />
              </button>
            </div>
            <div className="max-h-[calc(100vh-11rem)] overflow-y-auto">{historyPanel}</div>
          </aside>

          <main className="min-w-0 space-y-5">
            <HeroInput
              value={input}
              onChange={setInput}
              attachment={attachment}
              onAttach={setAttachment}
              onClearAttachment={() => setAttachment(null)}
              onSubmit={submit}
              pending={busy}
              compact={!showHero}
              onExpand={() => setHeroExpanded(true)}
              onInvalidFile={(message) => toast.error(message)}
            />

            {mutation.isPending ? (
              <div className="gt-rise elev-2 rounded-xl border border-border bg-card p-4">
                <p className="text-sm font-medium text-foreground">{STAGES[stage]}</p>
                <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-secondary">
                  <div className="h-full w-1/3 animate-[pulse_1.4s_ease-in-out_infinite] rounded-full bg-accent-blue" />
                </div>
              </div>
            ) : null}

            {ocrText && mutation.isPending ? (
              <ContextStrip text={ocrText} label="Read from screenshot" />
            ) : null}

            {result ? (
              <div className="space-y-5">
                <SourcePanel
                  kind={result.inputKind}
                  text={result.inputText}
                  imageUrl={result.imageUrl}
                  ocrText={result.ocrText}
                />

                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-lg border border-border bg-secondary/40 px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {result.claims.length} claim{result.claims.length === 1 ? "" : "s"} detected ·{" "}
                    {revealedCount} judged
                  </p>
                  <StatusLegend />
                </div>

                <article className="gt-rise elev-2 rounded-xl border border-border bg-card p-5 sm:p-6">
                  <AnswerBody
                    answer={result.answer}
                    claims={result.claims}
                    activeClaimId={activeClaimId}
                    onSelectClaim={selectClaim}
                  />
                </article>

                <div className="space-y-2">
                  <GroundingScore claims={result.claims} score={result.groundingScore} />
                  {result.aiAuthorship ? (
                    <AiAuthorshipBadge authorship={result.aiAuthorship} />
                  ) : null}
                </div>
              </div>
            ) : null}

            {!result && !mutation.isPending ? (
              <p className="mx-auto max-w-xl text-center text-sm leading-relaxed text-muted-foreground">
                GroundTruth breaks your input into atomic claims, retrieves real sources for each
                one, grades them by tier, and answers with inline citations.
              </p>
            ) : null}
          </main>

          <aside className="elev-2 hidden max-h-[calc(100vh-8rem)] overflow-y-auto rounded-xl border border-border bg-card lg:block">
            <h2 className="sticky top-0 z-10 border-b border-border bg-card/95 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground backdrop-blur">
              Evidence
            </h2>
            {evidence}
          </aside>
        </div>
      </div>
    </div>
  );
}

