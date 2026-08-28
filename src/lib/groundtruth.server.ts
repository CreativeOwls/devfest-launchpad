import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import {
  EMPTY_RETRIEVAL_STATS,
  LIMITS,
  normalizeQuery,
  normalizeUrl,
  type CapName,
  type RetrievalStats,
} from "@/lib/groundtruth/limits";
import { classifyTier, sourceNameOf } from "@/lib/groundtruth/tiers";
import {
  computeGrounding,
  STATUS_ORDER,
  type CheckResult,
  type Claim,
  type ClaimStatus,
  type Drift,
  type AiAuthorship,
  type EvidenceSource,
} from "@/lib/groundtruth/types";

type Db = SupabaseClient<Database>;

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const AI_MODEL = "google/gemini-3.7-flash";
const FIRECRAWL_V2 = "https://api.firecrawl.dev/v2";


/* ---------------------------------- AI ---------------------------------- */

async function callAi(system: string, user: string): Promise<string> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("LOVABLE_API_KEY is not configured");

  const res = await fetch(AI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      "Lovable-API-Key": key,
    },
    body: JSON.stringify({
      model: AI_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`[groundtruth] AI gateway ${res.status}: ${body}`);
    if (res.status === 429) throw new Error("The AI service is rate limited. Try again shortly.");
    if (res.status === 402)
      throw new Error("AI credits are exhausted for this workspace. Add credits to continue.");
    throw new Error(`AI request failed (${res.status}).`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content ?? "";
}

/** OCR a screenshot with the gateway's default vision-capable model. */
export async function extractTextFromImage(dataUrl: string): Promise<string> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("LOVABLE_API_KEY is not configured");

  const res = await fetch(AI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      "Lovable-API-Key": key,
    },
    body: JSON.stringify({
      model: AI_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You transcribe screenshots. Return ONLY the text visible in the image, preserving reading order. No commentary, no markdown. If there is no readable text, return exactly: NO_TEXT",
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Transcribe the text in this screenshot." },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`[groundtruth] OCR gateway ${res.status}: ${body}`);
    throw new Error("Couldn't read text from this image — try pasting the text instead.");
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = (data.choices?.[0]?.message?.content ?? "").trim();
  if (!text || text === "NO_TEXT" || text.length < 3) {
    throw new Error("Couldn't read text from this image — try pasting the text instead.");
  }
  return text;
}



function parseJson<T>(raw: string, fallback: T): T {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  const start = cleaned.search(/[[{]/);
  if (start === -1) return fallback;
  const candidate = cleaned.slice(start);
  try {
    return JSON.parse(candidate) as T;
  } catch {
    // Trim trailing prose after the JSON value.
    const lastBrace = Math.max(candidate.lastIndexOf("}"), candidate.lastIndexOf("]"));
    if (lastBrace > 0) {
      try {
        return JSON.parse(candidate.slice(0, lastBrace + 1)) as T;
      } catch {
        return fallback;
      }
    }
    return fallback;
  }
}

/* ------------------------ AI-authorship estimate ------------------------- */

const AUTHORSHIP_SYSTEM = `You estimate how likely a piece of text was written by an AI language model, based ONLY on writing style.
Weigh: uniform sentence rhythm, low burstiness, generic transitions ("moreover", "in conclusion"), absence of specific concrete detail, hedging patterns, lack of personal voice or idiosyncrasy, template-like structure, tidy list-of-three constructions.
Never claim certainty. Short texts deserve low confidence.
Return STRICT JSON only, no markdown:
{"ai_likelihood": 0-100, "confidence": "low"|"medium"|"high", "signals": ["short reason", ...], "caveat": "one sentence"}`;

/**
 * One LLM call per check on the whole source text. Secondary signal only:
 * failures degrade to null so the grounding pipeline is never affected.
 */
export async function assessAiAuthorship(text: string): Promise<AiAuthorship | null> {
  const source = text.trim();
  if (source.length < 120) return null; // pure questions / too short to read style

  try {
    const raw = await callAi(
      AUTHORSHIP_SYSTEM,
      `Assess this text:\n"""\n${source.slice(0, 6000)}\n"""`,
    );
    const parsed = parseJson<{
      ai_likelihood?: unknown;
      confidence?: unknown;
      signals?: unknown;
      caveat?: unknown;
    }>(raw, {});

    const likelihood = Number(parsed.ai_likelihood);
    if (!Number.isFinite(likelihood)) return null;
    const confidence =
      parsed.confidence === "high" || parsed.confidence === "medium" ? parsed.confidence : "low";

    return {
      aiLikelihood: Math.max(0, Math.min(100, Math.round(likelihood))),
      confidence,
      signals: Array.isArray(parsed.signals)
        ? parsed.signals.filter((s): s is string => typeof s === "string").slice(0, 5)
        : [],
      caveat:
        typeof parsed.caveat === "string" && parsed.caveat.trim()
          ? parsed.caveat.trim()
          : "Estimate based on writing style, not definitive.",
    };
  } catch (error) {
    console.error("[groundtruth] authorship estimate failed", error);
    return null;
  }
}

/* --------------------------- Budget bookkeeping --------------------------- */

type SearchHit = { url: string; title?: string; description?: string };

function firecrawlKey(): string {
  const key = process.env["FIRECRAWL_API_KEY"];
  if (!key) throw new Error("FIRECRAWL_API_KEY is not configured");
  return key;
}

/**
 * Per-task Firecrawl budget. Every live call must be granted here first, so the
 * caps are enforced by a counter rather than by convention. The daily
 * whole-app budget is reserved atomically in the database.
 */
class RetrievalBudget {
  searches = 0;
  scrapes = 0;
  cacheHits = 0;
  cacheMisses = 0;
  budgetPaused = false;
  unverifiedClaims: string[] = [];
  dailyCallsUsed = 0;
  eventCallsUsed = 0;
  private caps = new Set<CapName>();
  private perClaimSearches = new Map<number, number>();
  private perClaimScrapes = new Map<number, number>();

  markCap(cap: CapName) {
    this.caps.add(cap);
  }

  private get totalCalls() {
    return this.searches + this.scrapes;
  }

  /**
   * Reserve one live call against the whole-app daily AND event budgets.
   * Both are hard stops that outrank the per-task ceilings.
   */
  private async reserveGlobal(): Promise<boolean> {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data, error } = await supabaseAdmin.rpc("gt_reserve_firecrawl_calls_v2", {
        _count: 1,
        _daily_budget: LIMITS.dailyCallBudget,
        _event_budget: LIMITS.eventCallBudget,
      });
      if (error) {
        console.error("[groundtruth] global budget reservation failed", error);
        // Fail closed: a broken counter must not become unlimited spend.
        this.budgetPaused = true;
        this.markCap("daily-budget");
        return false;
      }

      const result = (data ?? {}) as {
        granted?: number;
        day_used?: number;
        event_used?: number;
        exhausted_scope?: "daily" | "event" | null;
      };
      this.dailyCallsUsed = result.day_used ?? this.dailyCallsUsed;
      this.eventCallsUsed = result.event_used ?? this.eventCallsUsed;

      if ((result.granted ?? 0) < 1) {
        this.budgetPaused = true;
        this.markCap(result.exhausted_scope === "event" ? "event-budget" : "daily-budget");
        return false;
      }
      return true;
    } catch (err) {
      console.error("[groundtruth] global budget reservation threw", err);
      this.budgetPaused = true;
      this.markCap("daily-budget");
      return false;
    }
  }

  async grantSearch(claimIndex: number): Promise<boolean> {
    if (this.totalCalls >= LIMITS.maxCallsPerTask) {
      this.markCap("calls-per-task");
      return false;
    }
    if ((this.perClaimSearches.get(claimIndex) ?? 0) >= LIMITS.maxSearchesPerClaim) {
      this.markCap("searches-per-claim");
      return false;
    }
    if (!(await this.reserveGlobal())) return false;
    this.perClaimSearches.set(claimIndex, (this.perClaimSearches.get(claimIndex) ?? 0) + 1);
    this.searches += 1;
    return true;
  }

  async grantScrape(claimIndex: number): Promise<boolean> {
    if (this.totalCalls >= LIMITS.maxCallsPerTask) {
      this.markCap("calls-per-task");
      return false;
    }
    if (this.scrapes >= LIMITS.maxScrapesPerTask) {
      this.markCap("scrapes-per-task");
      return false;
    }
    if ((this.perClaimScrapes.get(claimIndex) ?? 0) >= LIMITS.maxScrapesPerClaim) {
      this.markCap("scrapes-per-claim");
      return false;
    }
    if (!(await this.reserveGlobal())) return false;
    this.perClaimScrapes.set(claimIndex, (this.perClaimScrapes.get(claimIndex) ?? 0) + 1);
    this.scrapes += 1;
    return true;
  }

  /** Scrape slots left for this claim, ignoring the global budgets. */
  claimScrapeAttemptsLeft(claimIndex: number): number {
    return Math.max(LIMITS.maxScrapesPerClaim - (this.perClaimScrapes.get(claimIndex) ?? 0), 0);
  }

  toStats(): RetrievalStats {
    return {
      searches: this.searches,
      scrapes: this.scrapes,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      capsHit: [...this.caps],
      budgetPaused: this.budgetPaused,
      unverifiedClaims: this.unverifiedClaims,
      dailyCallsUsed: this.dailyCallsUsed,
      eventCallsUsed: this.eventCallsUsed,
    };
  }
}

/* ------------------------------- Firecrawl ------------------------------- */

async function searchWithCache(
  db: Db,
  budget: RetrievalBudget,
  claimIndex: number,
  query: string,
): Promise<SearchHit[]> {
  const key = normalizeQuery(query);

  const { data: cached } = await db
    .from("gt_search_cache")
    .select("results, fetched_at")
    .eq("query", key)
    .maybeSingle();

  if (cached && Date.now() - new Date(cached.fetched_at).getTime() < LIMITS.searchCacheTtlMs) {
    budget.cacheHits += 1;
    const hits = Array.isArray(cached.results) ? (cached.results as SearchHit[]) : [];
    return hits.filter((h) => typeof h?.url === "string");
  }

  budget.cacheMisses += 1;
  if (!(await budget.grantSearch(claimIndex))) return [];

  try {
    const res = await fetch(`${FIRECRAWL_V2}/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${firecrawlKey()}`,
      },
      body: JSON.stringify({ query, limit: 5 }),
    });
    if (!res.ok) {
      console.error(`[groundtruth] Firecrawl search ${res.status}: ${await res.text()}`);
      return [];
    }
    const json = (await res.json()) as {
      data?: SearchHit[] | { web?: SearchHit[] };
    };
    const data = json.data;
    const raw = Array.isArray(data) ? data : (data?.web ?? []);
    const hits = raw
      .filter((h) => typeof h?.url === "string")
      .map((h) => ({ url: h.url, title: h.title ?? "", description: h.description ?? "" }));

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("gt_search_cache")
      .upsert({ query: key, results: hits, fetched_at: new Date().toISOString() });

    return hits;
  } catch (error) {
    console.error("[groundtruth] Firecrawl search failed", error);
    return [];
  }
}

type ScrapedPage = {
  url: string;
  canonicalUrl: string | null;
  title: string | null;
  sourceName: string;
  publishedAt: string | null;
  content: string;
};

async function scrapeWithCache(
  db: Db,
  budget: RetrievalBudget,
  claimIndex: number,
  rawUrl: string,
): Promise<ScrapedPage | null> {
  const url = normalizeUrl(rawUrl);

  const { data: cached } = await db
    .from("gt_page_cache")
    .select("url, canonical_url, title, source_name, published_at, content, fetched_at")
    .eq("url", url)
    .maybeSingle();

  if (cached && Date.now() - new Date(cached.fetched_at).getTime() < LIMITS.pageCacheTtlMs) {
    budget.cacheHits += 1;
    return {
      url: cached.url,
      canonicalUrl: cached.canonical_url,
      title: cached.title,
      sourceName: cached.source_name ?? sourceNameOf(url),
      publishedAt: cached.published_at,
      content: cached.content ?? "",
    };
  }

  budget.cacheMisses += 1;
  if (!(await budget.grantScrape(claimIndex))) return null;

  try {
    const res = await fetch(`${FIRECRAWL_V2}/scrape`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${firecrawlKey()}`,
      },
      body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
    });
    if (!res.ok) {
      console.error(`[groundtruth] Firecrawl scrape ${res.status} for ${url}`);
      return null;
    }
    const json = (await res.json()) as Record<string, unknown>;
    const doc = (json["data"] ?? json) as {
      markdown?: string;
      metadata?: Record<string, unknown>;
    };
    const metadata = doc.metadata ?? {};
    const page: ScrapedPage = {
      url,
      canonicalUrl: (metadata["sourceURL"] as string) ?? (metadata["url"] as string) ?? url,
      title: (metadata["title"] as string) ?? (metadata["ogTitle"] as string) ?? null,
      sourceName: (metadata["siteName"] as string) ?? sourceNameOf(url),
      publishedAt:
        (metadata["publishedTime"] as string) ??
        (metadata["article:published_time"] as string) ??
        (metadata["modifiedTime"] as string) ??
        null,
      content: (doc.markdown ?? "").slice(0, 6000),
    };

    // Cache writes bypass RLS deliberately: the cache is shared, not user data.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("gt_page_cache").upsert({
      url: page.url,
      canonical_url: page.canonicalUrl,
      title: page.title,
      source_name: page.sourceName,
      published_at: page.publishedAt,
      content: page.content,
      fetched_at: new Date().toISOString(),
    });

    return page;
  } catch (error) {
    console.error(`[groundtruth] scrape failed for ${url}`, error);
    return null;
  }
}

/* -------------------------------- Pipeline ------------------------------- */

type Retrieved = { page: ScrapedPage; tier: number; snippet: string };

async function decompose(input: string): Promise<string[]> {
  const raw = await callAi(
    "You extract atomic, checkable factual claims from text. Respond with JSON only.",
    `Extract the atomic factual claims from the input below. Ignore opinions, predictions and rhetorical questions. If the input is a question rather than an assertion, produce the 1-3 factual sub-questions that must be verified to answer it, phrased as checkable statements.

Order the claims by how check-worthy they are: the most consequential, most falsifiable claims first.

Return JSON: {"claims": ["...", "..."]} with at most 12 claims, each a single self-contained sentence.

INPUT:
"""${input.slice(0, 6000)}"""`,
  );
  const parsed = parseJson<{ claims?: unknown }>(raw, {});
  const claims = Array.isArray(parsed.claims) ? parsed.claims : [];
  return claims
    .filter((c): c is string => typeof c === "string" && c.trim().length > 0)
    .map((c) => c.trim());
}

/** A claim is well grounded once it has one Tier 1 source or two Tier 1-2 sources. */
function isWellGrounded(found: Retrieved[]): boolean {
  const tier1 = found.filter((r) => r.tier === 1).length;
  const tier12 = found.filter((r) => r.tier <= 2).length;
  return tier1 >= 1 || tier12 >= 2;
}

async function retrieve(
  db: Db,
  budget: RetrievalBudget,
  claimIndex: number,
  claim: string,
): Promise<Retrieved[]> {
  const hits = await searchWithCache(db, budget, claimIndex, claim);
  if (hits.length === 0) return [];

  const found: Retrieved[] = [];

  // Sequential on purpose: early exit and the per-task counter need ordered decisions.
  for (const hit of hits) {
    if (budget.claimScrapeAttemptsLeft(claimIndex) === 0) {
      budget.markCap("scrapes-per-claim");
      break;
    }
    if (isWellGrounded(found)) {
      budget.markCap("early-exit");
      break;
    }

    const page = await scrapeWithCache(db, budget, claimIndex, hit.url);
    if (!page) continue;

    found.push({
      page: { ...page, title: page.title ?? hit.title ?? null },
      tier: classifyTier(page.canonicalUrl ?? hit.url),
      snippet: (page.content || hit.description || "").slice(0, 400),
    });
  }

  return found.sort((a, b) => a.tier - b.tier);
}


type Judgement = { status: ClaimStatus; justification: string; drift: Drift };

async function judge(claim: string, evidence: Retrieved[]): Promise<Judgement> {
  if (evidence.length === 0) {
    return {
      status: "Untraceable",
      justification: "No retrievable source discusses this claim.",
      drift: null,
    };
  }

  const evidenceBlock = evidence
    .map(
      (e, i) =>
        `[${i + 1}] ${e.page.sourceName} — Tier ${e.tier} — ${e.page.title ?? "untitled"} (${e.page.publishedAt ?? "no date"})\n${e.page.content.slice(0, 2500)}`,
    )
    .join("\n\n---\n\n");

  const raw = await callAi(
    "You are a strict evidence judge. You never invent evidence. Respond with JSON only.",
    `CLAIM: ${claim}

EVIDENCE:
${evidenceBlock}

Assign exactly one status from: ${STATUS_ORDER.join(", ")}.
- "Primary Source": a Tier 1 source directly states the claim.
- "Corroborated": two or more independent sources (Tier 1-3) support it.
- "Weak Evidence": only low-tier or indirect support.
- "Untraceable": the evidence does not address the claim.
- "Contradicted": the evidence states the opposite.

Also detect claim drift: only if a Tier 1 or Tier 2 source and a lower-tier source state the SAME fact with materially different wording (e.g. hedged vs absolute). If there is no genuine drift, use null.

Return JSON:
{"status":"...","justification":"one sentence quoting or paraphrasing the strongest evidence","drift":null or {"higherTierWording":"...","lowerTierWording":"...","higherTierSource":"...","lowerTierSource":"..."}}`,
  );

  const parsed = parseJson<{
    status?: string;
    justification?: string;
    drift?: Drift;
  }>(raw, {});

  const status = STATUS_ORDER.includes(parsed.status as ClaimStatus)
    ? (parsed.status as ClaimStatus)
    : "Weak Evidence";

  const drift =
    parsed.drift &&
    typeof parsed.drift === "object" &&
    typeof parsed.drift.higherTierWording === "string" &&
    typeof parsed.drift.lowerTierWording === "string"
      ? parsed.drift
      : null;

  return {
    status,
    justification:
      typeof parsed.justification === "string" && parsed.justification.trim()
        ? parsed.justification.trim()
        : "Judged against the retrieved evidence.",
    drift,
  };
}

async function compose(
  input: string,
  judged: { claim: string; status: ClaimStatus; sources: EvidenceSource[] }[],
): Promise<string> {
  if (judged.length === 0) {
    return "I couldn't isolate any checkable factual claim in that input, so there is nothing to verify yet. Try pasting a post or asking a factual question.";
  }

  const block = judged
    .map(
      (j) =>
        `CLAIM: ${j.claim}\nSTATUS: ${j.status}\nCITATIONS: ${
          j.sources.map((s) => `[${s.citationIndex}] ${s.sourceName} (Tier ${s.tier})`).join(", ") ||
          "none"
        }`,
    )
    .join("\n\n");

  return callAi(
    "You are GroundTruth, a source-native answer engine. You answer conversationally but every factual sentence carries inline numbered citations. Never cite a number that was not supplied.",
    `USER INPUT:
"""${input.slice(0, 3000)}"""

VERIFIED CLAIMS:
${block}

Write a short conversational answer (3-6 sentences, plain text, no markdown headings or bullet lists). Every factual sentence must end with its citation markers like [1] or [2][3]. If a claim is Untraceable or Contradicted, say so plainly in the sentence about it. Do not add facts that are not in the claims above.`,
  );
}

/* -------------------------------- Runner --------------------------------- */

const UPLOAD_BUCKET = "gt-uploads";
const SIGNED_URL_TTL = 60 * 60 * 24 * 7;

/** Stores a submitted screenshot in private storage; returns its object path. */
export async function storeCheckImage(db: Db, dataUrl: string): Promise<string | null> {
  const match = /^data:(image\/(png|jpeg|jpg|webp));base64,(.+)$/i.exec(dataUrl);
  if (!match) return null;
  const contentType = match[1]!;
  const ext = contentType.split("/")[1]!.replace("jpeg", "jpg");
  const bytes = Buffer.from(match[3]!, "base64");
  const path = `checks/${crypto.randomUUID()}.${ext}`;
  const { error } = await db.storage.from(UPLOAD_BUCKET).upload(path, bytes, { contentType });
  if (error) {
    console.error("[groundtruth] image upload failed", error);
    return null;
  }
  return path;
}

async function signImage(db: Db, path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await db.storage.from(UPLOAD_BUCKET).createSignedUrl(path, SIGNED_URL_TTL);
  if (error) {
    console.error("[groundtruth] signing image failed", error);
    return null;
  }
  return data?.signedUrl ?? null;
}

export async function runGroundTruthCheck(
  db: Db,
  userId: string | null,
  input: string,
  forcedKind?: CheckResult["inputKind"],
  media?: { imagePath?: string | null; ocrText?: string | null },
): Promise<CheckResult> {
  const trimmed = input.trim();
  const inputKind: CheckResult["inputKind"] =
    forcedKind ?? (trimmed.length > 280 ? "pasted" : "question");

  const budget = new RetrievalBudget();

  // Independent secondary signal; runs alongside retrieval and never gates it.
  const authorshipPromise = assessAiAuthorship(media?.ocrText?.trim() || trimmed);

  const allClaims = await decompose(trimmed);
  const claimTexts = allClaims.slice(0, LIMITS.maxClaimsPerTask);
  if (allClaims.length > LIMITS.maxClaimsPerTask) {
    budget.markCap("claims-per-task");
    budget.unverifiedClaims = allClaims.slice(LIMITS.maxClaimsPerTask);
  }

  // Sequential across claims so the per-task call counter is authoritative.
  const retrievals: Retrieved[][] = [];
  for (let i = 0; i < claimTexts.length; i += 1) {
    retrievals.push(await retrieve(db, budget, i, claimTexts[i]!));
  }

  const judgements = await Promise.all(
    claimTexts.map((claim, i) => judge(claim, retrievals[i] ?? [])),
  );

  const stats = budget.toStats();
  console.info(
    `[groundtruth] retrieval cost — searches=${stats.searches} scrapes=${stats.scrapes} cacheHits=${stats.cacheHits} cacheMisses=${stats.cacheMisses} capsHit=${stats.capsHit.join("|") || "none"} budgetPaused=${stats.budgetPaused} daily=${stats.dailyCallsUsed}/${LIMITS.dailyCallBudget} event=${stats.eventCallsUsed}/${LIMITS.eventCallBudget} unverifiedClaims=${stats.unverifiedClaims.length}`,
  );


  // Assign global citation numbers.
  let citation = 0;
  const claims: Claim[] = claimTexts.map((text, i) => {
    const evidence = retrievals[i] ?? [];
    const sources: EvidenceSource[] = evidence.map((e) => {
      citation += 1;
      return {
        id: `${i}-${citation}`,
        citationIndex: citation,
        url: e.page.url,
        canonicalUrl: e.page.canonicalUrl,
        title: e.page.title,
        sourceName: e.page.sourceName,
        publishedAt: e.page.publishedAt,
        tier: e.tier,
        snippet: e.snippet,
      };
    });
    const judgement = judgements[i]!;
    return {
      id: `${i}`,
      position: i,
      text,
      status: judgement.status,
      justification: judgement.justification,
      drift: judgement.drift,
      sources,
    };
  });

  const answer = await compose(
    trimmed,
    claims.map((c) => ({ claim: c.text, status: c.status, sources: c.sources })),
  );
  const groundingScore = computeGrounding(claims);
  const aiAuthorship = await authorshipPromise;

  return persist(db, userId, {
    inputText: trimmed,
    inputKind,
    imagePath: media?.imagePath ?? null,
    ocrText: media?.ocrText ?? null,
    answer,
    groundingScore,
    aiAuthorship,
    claims,
    retrievalStats: stats,
  });
}

async function persist(
  db: Db,
  userId: string | null,
  result: Omit<CheckResult, "id" | "createdAt" | "imageUrl"> & { imagePath: string | null },
): Promise<CheckResult> {
  const { data: check, error } = await db
    .from("gt_checks")
    .insert({
      user_id: userId,
      input_text: result.inputText,
      input_kind: result.inputKind,
      image_url: result.imagePath,
      ocr_text: result.ocrText,
      answer: result.answer,
      grounding_score: result.groundingScore,
      ai_authorship: result.aiAuthorship,
      retrieval_stats: result.retrievalStats,
    })
    .select("id, created_at")
    .single();

  if (error || !check) throw new Error(error?.message ?? "Could not save this check.");

  const finalClaims: Claim[] = [];

  for (const claim of result.claims) {
    const { data: row, error: claimError } = await db
      .from("gt_claims")
      .insert({
        check_id: check.id,
        user_id: userId,
        position: claim.position,
        text: claim.text,
        status: claim.status,
        justification: claim.justification,
        drift: claim.drift,
      })
      .select("id")
      .single();

    if (claimError || !row) {
      console.error("[groundtruth] claim insert failed", claimError);
      continue;
    }

    const sourceRows = claim.sources.map((s) => ({
      check_id: check.id,
      claim_id: row.id,
      user_id: userId,
      citation_index: s.citationIndex,
      url: s.url,
      canonical_url: s.canonicalUrl,
      title: s.title,
      source_name: s.sourceName,
      published_at: s.publishedAt,
      tier: s.tier,
      snippet: s.snippet,
    }));

    let sources = claim.sources;
    if (sourceRows.length > 0) {
      const { data: inserted, error: sourceError } = await db
        .from("gt_sources")
        .insert(sourceRows)
        .select("id, citation_index");
      if (sourceError) console.error("[groundtruth] source insert failed", sourceError);
      if (inserted) {
        sources = claim.sources.map((s) => ({
          ...s,
          id: inserted.find((r) => r.citation_index === s.citationIndex)?.id ?? s.id,
        }));
      }
    }

    finalClaims.push({ ...claim, id: row.id, sources });
  }

  return {
    id: check.id,
    createdAt: check.created_at,
    inputText: result.inputText,
    inputKind: result.inputKind,
    imageUrl: await signImage(db, result.imagePath),
    ocrText: result.ocrText ?? null,
    answer: result.answer,
    groundingScore: result.groundingScore,
    aiAuthorship: result.aiAuthorship,
    retrievalStats: result.retrievalStats,
    claims: finalClaims,
  };
}

export async function loadCheck(db: Db, checkId: string): Promise<CheckResult | null> {
  const { data: check } = await db
    .from("gt_checks")
    .select("id, input_text, input_kind, image_url, ocr_text, answer, grounding_score, ai_authorship, retrieval_stats, created_at")
    .eq("id", checkId)
    .maybeSingle();
  if (!check) return null;

  const { data: claimRows } = await db
    .from("gt_claims")
    .select("id, position, text, status, justification, drift")
    .eq("check_id", checkId)
    .order("position", { ascending: true });

  const { data: sourceRows } = await db
    .from("gt_sources")
    .select(
      "id, claim_id, citation_index, url, canonical_url, title, source_name, published_at, tier, snippet",
    )
    .eq("check_id", checkId)
    .order("citation_index", { ascending: true });

  const claims: Claim[] = (claimRows ?? []).map((c) => ({
    id: c.id,
    position: c.position,
    text: c.text,
    status: c.status as ClaimStatus,
    justification: c.justification,
    drift: (c.drift as Drift) ?? null,
    sources: (sourceRows ?? [])
      .filter((s) => s.claim_id === c.id)
      .map((s) => ({
        id: s.id,
        citationIndex: s.citation_index,
        url: s.url,
        canonicalUrl: s.canonical_url,
        title: s.title,
        sourceName: s.source_name,
        publishedAt: s.published_at,
        tier: s.tier,
        snippet: s.snippet,
      })),
  }));

  return {
    id: check.id,
    inputText: check.input_text,
    inputKind: (check.input_kind as CheckResult["inputKind"]) ?? "question",
    imageUrl: await signImage(db, check.image_url ?? null),
    ocrText: check.ocr_text ?? null,
    answer: check.answer ?? "",
    groundingScore: Number(check.grounding_score ?? 0),
    aiAuthorship: (check.ai_authorship as AiAuthorship | null) ?? null,
    retrievalStats: {
      ...EMPTY_RETRIEVAL_STATS,
      ...((check.retrieval_stats as Partial<RetrievalStats> | null) ?? {}),
    },
    createdAt: check.created_at,
    claims,
  };
}
