import { createFileRoute } from "@tanstack/react-router";

import { ConstellationBackdrop } from "@/components/ConstellationBackdrop";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { Wordmark } from "@/components/Wordmark";

const TITLE = "PROJECT 4 — DevFest Hackathon Scaffold";
const DESCRIPTION =
  "PROJECT 4: a DevFest hackathon scaffold with an animated constellation backdrop and Google sign-in.";

export const Route = createFileRoute("/")({
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
  component: Index,
});

function Index() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <ConstellationBackdrop />
      <div className="pointer-events-none absolute inset-0 ambient-glow" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 vignette" aria-hidden="true" />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center gap-8 px-4">
        <Wordmark text="PROJECT 4" />
        <GoogleSignInButton />
      </div>
    </main>
  );
}
