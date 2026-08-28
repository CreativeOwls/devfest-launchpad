import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { lovable } from "@/integrations/lovable/index";

export function EnterButton() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);

  const handleClick = async () => {
    if (session) {
      void navigate({ to: "/app" });
      return;
    }

    setPending(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });

      if (result.error) {
        toast.error("Could not sign in. Please try again.");
        setPending(false);
        return;
      }

      if (result.redirected) return;

      void navigate({ to: "/app" });
    } catch {
      toast.error("Could not sign in. Please try again.");
      setPending(false);
    }
  };

  return (
    <Button variant="google" size="pill" onClick={handleClick} disabled={pending || loading}>
      {pending ? "Signing in…" : "Enter GroundTruth"}
    </Button>
  );
}
