import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { AnswerBody } from "@/components/groundtruth/AnswerBody";
import { ContextStrip } from "@/components/groundtruth/ContextStrip";
import { EvidencePanel } from "@/components/groundtruth/EvidencePanel";
import { GroundingScore } from "@/components/groundtruth/GroundingScore";
import { HistoryList } from "@/components/groundtruth/HistoryList";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Textarea } from "@/components/ui/textarea";
import { useIsMobile } from "@/hooks/use-mobile";
import { getCheck, listChecks, runCheck } from "@/lib/groundtruth.functions";
import type { CheckResult } from "@/lib/groundtruth/types";

const TITLE = "GroundTruth — Answers with receipts";
const DESCRIPTION =
  "Paste a viral post or ask a question. GroundTruth answers conversationally with inline citations, source tiers and a transparent grounding score.";

export const Route = createFileRoute("/_authenticated/app")({
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
  const [result, setResult] = useState<CheckResult | null>(null);
  const [activeClaimId, setActiveClaimId] = useState<string | null>(null);
  const [revealedCount, setRevealedCount] = useState(0);
  const [stage, setStage] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const revealTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const runCheckFn = useServerFn(runCheck);
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
    mutationFn: (value: string) => runCheckFn({ data: { input: value } }),
    onSuccess: (check) => {
      setResult(check);
      setActiveClaimId(check.claims[0]?.id ?? null);
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
      setResult(check);
      setInput(check.inputText);
      setActiveClaimId(check.claims[0]?.id ?? null);
      setRevealedCount(check.claims.length);
    },
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

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const value = input.trim();
    if (value.length < 3) {
      toast.error("Paste a post or ask a question first.");
      return;
    }
    setResult(null);
    setActiveClaimId(null);
    mutation.mutate(value);
  };

  const claims = result?.claims ?? [];
  const evidence = (
    <EvidencePanel claims={claims} activeClaimId={activeClaimId} revealedCount={revealedCount} />
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div className="min-w-0">
            <h1 className="wordmark truncate text-xl">GroundTruth</h1>
            <p className="text-[11px] text-muted-foreground">Answers with receipts.</p>
          </div>
          {isMobile ? (
            <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
              <DrawerTrigger asChild>
                <Button variant="secondary" size="sm">
                  Evidence ({claims.reduce((n, c) => n + c.sources.length, 0)})
                </Button>
              </DrawerTrigger>
              <DrawerContent className="max-h-[85vh]">
                <DrawerHeader>
                  <DrawerTitle>Evidence</DrawerTitle>
                </DrawerHeader>
                <div className="overflow-y-auto">{evidence}</div>
              </DrawerContent>
            </Drawer>
          ) : null}
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[200px_minmax(0,1fr)_380px]">
        <aside className="hidden lg:block">
          <h2 className="px-3 pb-2 text-[11px] uppercase tracking-wide text-muted-foreground">
            History
          </h2>
          <HistoryList
            checks={history.data ?? []}
            activeId={result?.id ?? null}
            onSelect={(id) => loadPast.mutate(id)}
          />
        </aside>

        <main className="min-w-0 space-y-4">
          <form onSubmit={submit} className="space-y-3">
            <Textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Paste a viral post, tweet or article — or just ask a question."
              className="min-h-28 resize-y bg-card/50"
            />
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] text-muted-foreground">
                Every factual sentence resolves to evidence.
              </p>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Checking…" : "Check it"}
              </Button>
            </div>
          </form>

          {mutation.isPending ? (
            <div className="rounded-lg border border-border bg-card/40 p-4">
              <p className="text-sm text-foreground">{STAGES[stage]}</p>
              <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-secondary">
                <div className="h-full w-1/3 animate-[pulse_1.4s_ease-in-out_infinite] bg-accent-blue" />
              </div>
            </div>
          ) : null}

          {result ? (
            <div className="space-y-4">
              {result.inputKind === "pasted" ? <ContextStrip text={result.inputText} /> : null}

              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {result.claims.length} claim{result.claims.length === 1 ? "" : "s"} detected ·{" "}
                {revealedCount} judged
              </p>

              <AnswerBody
                answer={result.answer}
                claims={result.claims}
                activeClaimId={activeClaimId}
                onSelectClaim={selectClaim}
              />

              <GroundingScore claims={result.claims} score={result.groundingScore} />
            </div>
          ) : null}

          {!result && !mutation.isPending ? (
            <p className="text-sm text-muted-foreground">
              GroundTruth breaks your input into atomic claims, retrieves real sources for each one,
              grades them by tier, and answers with inline citations.
            </p>
          ) : null}
        </main>

        <aside className="hidden max-h-[calc(100vh-6rem)] overflow-y-auto rounded-lg border border-border bg-card/20 lg:block">
          <h2 className="sticky top-0 z-10 border-b border-border bg-card/80 px-4 py-2 text-[11px] uppercase tracking-wide text-muted-foreground backdrop-blur">
            Evidence
          </h2>
          {evidence}
        </aside>
      </div>
    </div>
  );
}
