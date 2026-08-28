import { cn } from "@/lib/utils";

/**
 * Signature "agent working" motif: a rotating sweep line over concentric rings
 * with soft ping pulses. `active` is driven by real pipeline state — when idle
 * the sweep slows to a calm rotation and the pings stop.
 */
export function Radar({
  active,
  className,
  label,
}: {
  active: boolean;
  className?: string;
  label?: string;
}) {
  return (
    <div
      className={cn("relative aspect-square shrink-0", className)}
      role="img"
      aria-label={label ?? (active ? "Agent working" : "Agent idle")}
    >
      {active ? (
        <>
          <span
            aria-hidden="true"
            className="gt-radar-ping absolute inset-0 rounded-full border border-brand/45"
          />
          <span
            aria-hidden="true"
            className="gt-radar-ping absolute inset-0 rounded-full border border-brand/35 [animation-delay:900ms]"
          />
        </>
      ) : null}

      <svg
        viewBox="0 0 100 100"
        className="relative size-full"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <radialGradient id="gt-radar-face" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.14" />
            <stop offset="70%" stopColor="var(--brand)" stopOpacity="0.05" />
            <stop offset="100%" stopColor="var(--brand)" stopOpacity="0.02" />
          </radialGradient>
          <linearGradient id="gt-radar-sweep" x1="50%" y1="50%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.55" />
            <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
          </linearGradient>
        </defs>

        <circle cx="50" cy="50" r="47" fill="url(#gt-radar-face)" />
        <circle
          cx="50"
          cy="50"
          r="47"
          fill="none"
          stroke="var(--brand-ink)"
          strokeOpacity="0.28"
          strokeWidth="1.5"
        />
        <circle cx="50" cy="50" r="31" fill="none" stroke="var(--brand-ink)" strokeOpacity="0.16" />
        <circle cx="50" cy="50" r="16" fill="none" stroke="var(--brand-ink)" strokeOpacity="0.16" />
        <line x1="3" y1="50" x2="97" y2="50" stroke="var(--brand-ink)" strokeOpacity="0.1" />
        <line x1="50" y1="3" x2="50" y2="97" stroke="var(--brand-ink)" strokeOpacity="0.1" />

        <g
          className={cn(active ? "gt-radar-sweep" : "gt-radar-sweep-idle")}
          style={{ transformOrigin: "50% 50%" }}
        >
          <path d="M50 50 L97 50 A47 47 0 0 0 63 5 Z" fill="url(#gt-radar-sweep)" />
          <line
            x1="50"
            y1="50"
            x2="97"
            y2="50"
            stroke="var(--brand)"
            strokeOpacity="0.9"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </g>

        <circle
          cx="50"
          cy="50"
          r="4"
          fill="var(--brand)"
          fillOpacity={active ? "0.95" : "0.55"}
          className={active ? "gt-radar-core" : undefined}
        />
      </svg>
    </div>
  );
}
