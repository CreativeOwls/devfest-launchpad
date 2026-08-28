import { StatusDot } from "@/components/groundtruth/StatusDot";
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
    <div className="space-y-2 text-[15px] leading-relaxed">
      {sentences.map((sentence, index) => {
        const citations = [...sentence.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1]));
        const claim = citations.map((n) => claimByCitation.get(n)).find(Boolean) ?? null;
        const isActive = claim !== null && claim.id === activeClaimId;
        const parts = sentence.split(/(\[\d+\])/g);

        return (
          <p
            key={index}
            onClick={() => claim && onSelectClaim(claim.id)}
            className={cn(
              "flex gap-2 rounded-md px-2 py-1 transition-colors",
              claim && "cursor-pointer hover:bg-secondary/50",
              isActive && "bg-secondary/70",
            )}
          >
            <StatusDot status={claim?.status} pending={!claim} className="mt-2 shrink-0" />
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
          </p>
        );
      })}
    </div>
  );
}
