import { StatusDot } from "@/components/groundtruth/StatusDot";
import { StatusPill } from "@/components/groundtruth/StatusPill";
import { statusStyle } from "@/lib/groundtruth/statusStyles";
import type { Claim } from "@/lib/groundtruth/types";
import { cn } from "@/lib/utils";

type Props = {
  answer: string;
  claims: Claim[];
  activeClaimId: string | null;
  onSelectClaim: (claimId: string) => void;
};

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"'])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function AnswerBody({ answer, claims, activeClaimId, onSelectClaim }: Props) {
  const claimByCitation = new Map<number, Claim>();
  for (const claim of claims) {
    for (const source of claim.sources) claimByCitation.set(source.citationIndex, claim);
  }

  const sentences = splitSentences(answer);

  return (
    <div className="space-y-3 text-[15px] leading-relaxed">
      {sentences.map((sentence, index) => {
        const citations = [...sentence.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1]));
        const claim = citations.map((n) => claimByCitation.get(n)).find(Boolean) ?? null;
        const isActive = claim !== null && claim.id === activeClaimId;
        const parts = sentence.split(/(\[\d+\])/g);
        const style = statusStyle(claim?.status ?? null);

        return (
          <div
            key={index}
            onClick={() => claim && onSelectClaim(claim.id)}
            className={cn(
              "relative overflow-hidden rounded-lg px-3 py-2.5 pl-4 transition-all",
              claim
                ? cn("cursor-pointer border", style.wash)
                : "border border-transparent px-2 py-1 pl-2",
              isActive && claim && "shadow-sm ring-2 ring-accent-blue/30",
            )}
          >
            {claim ? (
              <span
                aria-hidden="true"
                className={cn("absolute inset-y-0 left-0 w-1.5", style.bar)}
              />
            ) : null}
            <div className="flex gap-3">
              <StatusDot status={claim?.status} pending={!claim} className="mt-1" />
              <div className="min-w-0 flex-1">
                <span>
                  {parts.map((part, i) => {
                    const match = part.match(/^\[(\d+)\]$/);
                    if (!match) return <span key={i}>{part}</span>;
                    const number = Number(match[1]);
                    const target = claimByCitation.get(number);
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          if (target) onSelectClaim(target.id);
                        }}
                        className="mx-0.5 rounded bg-secondary px-1 text-[11px] tabular-nums text-accent-blue align-super hover:bg-secondary/70"
                      >
                        {number}
                      </button>
                    );
                  })}
                </span>
                {claim ? (
                  <div className="mt-2">
                    <StatusPill status={claim.status} />
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}

    </div>
  );
}
