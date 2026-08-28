/**
 * Source-quality tiers. One maintainable domain -> tier table.
 * Tier 1 primary/official, 2 wire/major, 3 specialist, 4 blogs/social, 5 unknown.
 *
 * Tier 1 covers three kinds of source:
 *  - government / regulator filings (any .gov, plus sec.gov + EDGAR hosts)
 *  - institutional primary publishers (courts, standards bodies, preprints)
 *  - an organisation's OWN official property when the claim is about that org
 *    (see `classifyTier(url, entities)`): a firm announcing its own fund on its
 *    own site or newsroom is a primary source.
 */

/** Any host ending in one of these is Tier 1. */
const TIER_1_SUFFIXES = [".gov", ".mil", ".int"];

/** Explicit domain -> tier table. Longest-suffix match wins over the defaults. */
export const DOMAIN_TIERS: Record<string, number> = {
  // ---- Tier 1: filings, regulators, courts, institutions ----
  "sec.gov": 1,
  "edgar.sec.gov": 1,
  "efts.sec.gov": 1,
  "secdatabase.com": 1,
  "federalregister.gov": 1,
  "supremecourt.gov": 1,
  "pacer.gov": 1,
  "courtlistener.com": 1,
  "europa.eu": 1,
  "who.int": 1,
  "imf.org": 1,
  "worldbank.org": 1,
  "arxiv.org": 1,

  // ---- Tier 1: official corporate properties / newsrooms ----
  "a16z.com": 1,
  "future.com": 1,
  "sequoiacap.com": 1,
  "ycombinator.com": 1,
  "openai.com": 1,
  "anthropic.com": 1,
  "blog.google": 1,
  "abc.xyz": 1,
  "news.microsoft.com": 1,
  "investor.apple.com": 1,
  "ir.tesla.com": 1,
  "investor.nvidia.com": 1,
  "nvidianews.nvidia.com": 1,
  "spacex.com": 1,
  "anduril.com": 1,

  // ---- Tier 2: wire services and majors ----
  "reuters.com": 2,
  "apnews.com": 2,
  "bloomberg.com": 2,
  "wsj.com": 2,
  "ft.com": 2,
  "nytimes.com": 2,
  "economist.com": 2,
  "bbc.com": 2,
  "bbc.co.uk": 2,
  "washingtonpost.com": 2,

  // ---- Tier 3: specialist press and reference databases ----
  "techcrunch.com": 3,
  "theverge.com": 3,
  "arstechnica.com": 3,
  "wired.com": 3,
  "cnbc.com": 3,
  "axios.com": 3,
  "theinformation.com": 3,
  "fortune.com": 3,
  "politico.com": 3,
  "sciencedirect.com": 3,
  "nature.com": 3,
  "statnews.com": 3,
  "theguardian.com": 3,
  "forbes.com": 3,
  "businessinsider.com": 3,
  "crunchbase.com": 3,
  "pitchbook.com": 3,

  // ---- Tier 4: blogs, social, user-generated ----
  "substack.com": 4,
  "medium.com": 4,
  "reddit.com": 4,
  "x.com": 4,
  "twitter.com": 4,
  "facebook.com": 4,
  "tiktok.com": 4,
  "instagram.com": 4,
  "linkedin.com": 4,
  "youtube.com": 4,
  "quora.com": 4,
  "blogspot.com": 4,
  "wordpress.com": 4,
  "news.ycombinator.com": 4,
  "wikipedia.org": 4,
};

export const TIER_LABELS: Record<number, string> = {
  1: "Tier 1 Primary",
  2: "Tier 2 Wire/Major",
  3: "Tier 3 Specialist",
  4: "Tier 4 Blog/Social",
  5: "Tier 5 Unverified",
};

export function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

function matches(host: string, domain: string) {
  return host === domain || host.endsWith(`.${domain}`);
}

const STOPWORDS = new Set([
  "the",
  "and",
  "inc",
  "llc",
  "lp",
  "ltd",
  "corp",
  "company",
  "capital",
  "partners",
  "ventures",
  "fund",
  "group",
  "holdings",
]);

/** Compact tokens from an entity name: "Andreessen Horowitz" -> ["andreessenhorowitz","andreessen","horowitz"]. */
function entityTokens(entity: string): string[] {
  const words = entity
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
  if (words.length === 0) return [];
  return [words.join(""), ...words];
}

/**
 * True when the host looks like an official property of one of the entities the
 * claim is about (their own domain, newsroom or blog subdomain).
 */
export function isOfficialSourceFor(url: string, entities: string[]): boolean {
  const host = hostnameOf(url);
  if (!host || entities.length === 0) return false;
  // Never treat a platform/press domain as an entity's own property.
  if (DOMAIN_TIERS[host] !== undefined && DOMAIN_TIERS[host] >= 2) return false;
  for (const domain of Object.keys(DOMAIN_TIERS)) {
    if (matches(host, domain) && DOMAIN_TIERS[domain]! >= 2) return false;
  }

  const registrable = host.split(".").slice(-2).join("."); // a16z.com
  const brand = registrable.split(".")[0] ?? "";
  const labels = host.split(".");

  return entities.some((entity) =>
    entityTokens(entity).some(
      (token) =>
        token.length > 2 &&
        (brand === token ||
          brand.startsWith(token) ||
          token.startsWith(brand) ||
          labels.includes(token)),
    ),
  );
}

/** Verified/official social accounts count as the org's own announcement (Tier 1). */
function isOfficialSocialPost(url: string, entities: string[]): boolean {
  const host = hostnameOf(url);
  if (!host) return false;
  const social = ["x.com", "twitter.com", "linkedin.com", "youtube.com"];
  if (!social.some((d) => matches(host, d))) return false;
  const handle = (() => {
    try {
      return new URL(url).pathname.toLowerCase().replace(/[^a-z0-9/]/g, "");
    } catch {
      return "";
    }
  })();
  return entities.some((entity) =>
    entityTokens(entity).some((token) => token.length > 3 && handle.includes(`/${token}`)),
  );
}

/**
 * @param entities Names the claim is about. When supplied, an entity's own
 * official site/newsroom/verified account is treated as Tier 1 primary.
 */
export function classifyTier(url: string, entities: string[] = []): number {
  const host = hostnameOf(url);
  if (!host) return 5;

  if (TIER_1_SUFFIXES.some((s) => host.endsWith(s))) return 1;

  let mapped: number | null = null;
  let bestLength = -1;
  for (const [domain, tier] of Object.entries(DOMAIN_TIERS)) {
    if (matches(host, domain) && domain.length > bestLength) {
      mapped = tier;
      bestLength = domain.length;
    }
  }

  if (entities.length > 0) {
    if (isOfficialSourceFor(url, entities)) return 1;
    if (isOfficialSocialPost(url, entities)) return 1;
  }

  if (mapped !== null) return mapped;
  // Recognisable publisher-ish domain but not mapped: specialist/secondary.
  return 3;
}

export function sourceNameOf(url: string): string {
  return hostnameOf(url) ?? "unknown source";
}
