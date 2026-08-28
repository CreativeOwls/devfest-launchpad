/**
 * Hard Firecrawl spend limits. These caps take priority over completeness:
 * an honest "Untraceable" is preferred over extra retrieval calls.
 */
export const LIMITS = {
  /** Claims sent to retrieval per task. Extra claims are reported as unverified. */
  maxClaimsPerTask: 8,
  /** Firecrawl search calls per claim (2nd is reserved for an SEC/EDGAR query). */
  maxSearchesPerClaim: 2,
  /** Firecrawl scrape calls per claim. */
  maxScrapesPerClaim: 3,
  /**
   * Scrapes each claim is guaranteed in the first pass, before any claim is
   * allowed a second scrape. This is what stops early claims starving later ones.
   */
  firstPassScrapesPerClaim: 1,
  /** Firecrawl scrape calls per task. */
  maxScrapesPerTask: 24,
  /** Searches + scrapes per task. */
  maxCallsPerTask: 32,

  /**
   * Whole-app live retrieval budget per UTC day. HARD stop — the daily budget
   * always wins over the (looser) per-task ceilings.
   */
  dailyCallBudget: 500,
  /** Whole-app live retrieval budget for the entire event, across all days. */
  eventCallBudget: 2000,
  /** Scrape cache freshness. */
  pageCacheTtlMs: 1000 * 60 * 60 * 24 * 14,
  /** Search cache freshness. */
  searchCacheTtlMs: 1000 * 60 * 60 * 24,
} as const;

export type CapName =
  | "claims-per-task"
  | "searches-per-claim"
  | "scrapes-per-claim"
  | "scrapes-per-task"
  | "calls-per-task"
  | "daily-budget"
  | "event-budget"
  | "early-exit";

export type RetrievalStats = {
  searches: number;
  scrapes: number;
  cacheHits: number;
  cacheMisses: number;
  capsHit: CapName[];
  budgetPaused: boolean;
  unverifiedClaims: string[];
  /** Live whole-app counters, for the retrieval cost line. */
  dailyCallsUsed: number;
  eventCallsUsed: number;
};

export const EMPTY_RETRIEVAL_STATS: RetrievalStats = {
  searches: 0,
  scrapes: 0,
  cacheHits: 0,
  cacheMisses: 0,
  capsHit: [],
  budgetPaused: false,
  unverifiedClaims: [],
  dailyCallsUsed: 0,
  eventCallsUsed: 0,
};

/** Normalized cache key for a URL: strips hash, tracking params and trailing slash. */
export function normalizeUrl(raw: string): string {
  try {
    const url = new URL(raw);
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|fbclid|gclid|mc_|ref$|ref_)/i.test(key)) url.searchParams.delete(key);
    }
    url.hostname = url.hostname.replace(/^www\./, "").toLowerCase();
    let out = url.toString();
    out = out.replace(/\/$/, "");
    return out;
  } catch {
    return raw.trim();
  }
}

/** Normalized cache key for a search query. */
export function normalizeQuery(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 500);
}
