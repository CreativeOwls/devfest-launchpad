import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { CheckResult, CheckSummary } from "@/lib/groundtruth/types";

/**
 * Hackathon demo mode: the app runs without sign-in, so these functions are
 * public endpoints and records are stored without an owner. Re-introduce
 * `requireSupabaseAuth` + per-user scoping before this goes anywhere real.
 */

export const runCheck = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ input: z.string().min(3).max(8000) }).parse(data))
  .handler(async ({ data }): Promise<CheckResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { runGroundTruthCheck } = await import("@/lib/groundtruth.server");
    return runGroundTruthCheck(supabaseAdmin, null, data.input);
  });

export const listChecks = createServerFn({ method: "GET" }).handler(
  async (): Promise<CheckSummary[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("gt_checks")
      .select("id, input_text, input_kind, grounding_score, created_at")
      .is("user_id", null)
      .order("created_at", { ascending: false })
      .limit(25);
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => ({
      id: row.id,
      inputText: row.input_text,
      inputKind: row.input_kind,
      groundingScore: row.grounding_score === null ? null : Number(row.grounding_score),
      createdAt: row.created_at,
    }));
  },
);

export const getCheck = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }): Promise<CheckResult | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { loadCheck } = await import("@/lib/groundtruth.server");
    return loadCheck(supabaseAdmin, data.id);
  });
