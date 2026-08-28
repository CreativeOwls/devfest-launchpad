import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { CheckResult, CheckSummary } from "@/lib/groundtruth/types";

export const runCheck = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ input: z.string().min(3).max(8000) }).parse(data))
  .handler(async ({ data, context }): Promise<CheckResult> => {
    const { runGroundTruthCheck } = await import("@/lib/groundtruth.server");
    return runGroundTruthCheck(context.supabase, context.userId, data.input);
  });

export const listChecks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CheckSummary[]> => {
    const { data, error } = await context.supabase
      .from("gt_checks")
      .select("id, input_text, input_kind, grounding_score, created_at")
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
  });

export const getCheck = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }): Promise<CheckResult | null> => {
    const { loadCheck } = await import("@/lib/groundtruth.server");
    return loadCheck(context.supabase, data.id);
  });
