import { useNavigate } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";

export function EnterButton() {
  const navigate = useNavigate();

  return (
    <Button variant="google" size="pill" onClick={() => void navigate({ to: "/app" })}>
      Enter GroundTruth
    </Button>
  );
}
