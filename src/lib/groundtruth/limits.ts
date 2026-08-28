/**
 * Hard Firecrawl spend limits. These caps take priority over completeness:
 * an honest "Untraceable" is preferred over extra retrieval calls.
 */
export const LIMITS = {
  /** Claims sent to retrieval per task. Extra claims are reported as unverified. */
  maxClaimsPerTask: 6,
  /** Firecrawl search calls per claim. */
  maxSearchesPerClaim: 1,
  /** Firecrawl scrape calls per claim. */
  maxScrapesPerClaim: 3,
  /** Firecrawl scrape calls per task. */
  maxScrapesPerTask: 12,
  /** Searches + scrapes per task. */
  maxCallsPerTask: 18,
  /** Whole-app live retrieval budget per UTC day. */
  dailyCallBudget: 300,
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
  | "early-exit";

export type RetrievalStats = {
  searches: number;
  scrapes: number;
  cacheHits: number;
  cacheMisses: number;
  capsHit: CapName[];
  budgetPaused: boolean;
  unverifiedClaims: string[];
};

export const EMPTY_RETRIEVAL_STATS: RetrievalStats = {
  searches: 0,
  scrapes: 0,
  cacheHits: 0,
  cacheMisses: 0,
  capsHit: [],
  budgetPaused: false,
  unverifiedClaims: [],
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
