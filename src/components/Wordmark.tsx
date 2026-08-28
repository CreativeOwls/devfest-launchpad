import { useState } from "react";

import { cn } from "@/lib/utils";

const HOVER_COLORS = [
  "text-accent-blue",
  "text-accent-red",
  "text-accent-yellow",
  "text-accent-green",
];

/**
 * Giant system-font wordmark. Each letter takes an accent colour on hover;
 * the final character auto-cycles through the accents as a branding flourish.
 */
export function Wordmark({ text }: { text: string }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const characters = [...text];
  const lastIndex = characters.length - 1;

  return (
    <h1
      className="wordmark select-none text-center text-foreground text-[19vw] sm:text-[17vw] lg:text-[16vw]"
      aria-label={text}
    >
      {characters.map((char, index) => {
        const isLast = index === lastIndex;
        const isHovered = hovered === index;

        return (
          <span
            key={`${char}-${index}`}
            aria-hidden="true"
            onPointerEnter={() => setHovered(index)}
            onPointerLeave={() => setHovered((current) => (current === index ? null : current))}
            className={cn(
              "inline-block transition-colors duration-300",
              char === " " && "w-[0.25em]",
              isLast && !isHovered && "letter-cycle",
              isHovered && HOVER_COLORS[index % HOVER_COLORS.length],
            )}
          >
            {char === " " ? "\u00A0" : char}
          </span>
        );
      })}
    </h1>
  );
}
