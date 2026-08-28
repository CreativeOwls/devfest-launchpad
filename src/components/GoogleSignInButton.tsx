import { useState } from "react";
import { toast } from "sonner";

import { GoogleIcon } from "@/components/GoogleIcon";
import { Button } from "@/components/ui/button";
import { lovable } from "@/integrations/lovable/index";

export function GoogleSignInButton() {
  const [pending, setPending] = useState(false);

  const handleSignIn = async () => {
    setPending(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });

      if (result.error) {
        toast.error("Could not sign in with Google. Please try again.");
        setPending(false);
        return;
      }

      if (result.redirected) return;

      // Session already set by the helper.
      window.location.assign("/");
    } catch {
      toast.error("Could not sign in with Google. Please try again.");
      setPending(false);
    }
  };

  return (
    <Button variant="google" size="pill" onClick={handleSignIn} disabled={pending}>
      <GoogleIcon className="size-5" />
      {pending ? "Signing in…" : "Sign in with Google"}
    </Button>
  );
}
