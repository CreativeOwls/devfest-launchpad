/**
 * Source-quality tiers. Maintainable domain mapping — add domains here.
 * Tier 1 primary, 2 wire/major, 3 specialist, 4 blogs/social, 5 unknown.
 */

const TIER_1_SUFFIXES = [".gov", ".mil", ".int"];

const TIER_1_DOMAINS = [
  "sec.gov",
  "courtlistener.com",
  "pacer.gov",
  "supremecourt.gov",
  "arxiv.org",
  "federalregister.gov",
  "europa.eu",
  "who.int",
  "imf.org",
  "worldbank.org",
  "investor.apple.com",
  "abc.xyz",
  "ir.tesla.com",
  "investor.nvidia.com",
  "news.microsoft.com",
  "openai.com",
  "anthropic.com",
  "blog.google",
];

const TIER_2_DOMAINS = [
  "reuters.com",
  "apnews.com",
  "bloomberg.com",
  "ft.com",
  "wsj.com",
  "nytimes.com",
  "economist.com",
  "bbc.com",
  "bbc.co.uk",
  "washingtonpost.com",
];

const TIER_3_DOMAINS = [
  "techcrunch.com",
  "theverge.com",
  "arstechnica.com",
  "wired.com",
  "cnbc.com",
  "axios.com",
  "theinformation.com",
  "politico.com",
  "sciencedirect.com",
  "nature.com",
  "statnews.com",
  "theguardian.com",
  "forbes.com",
  "businessinsider.com",
];

const TIER_4_DOMAINS = [
  "substack.com",
  "medium.com",
  "reddit.com",
  "x.com",
  "twitter.com",
  "facebook.com",
  "tiktok.com",
  "instagram.com",
  "linkedin.com",
  "youtube.com",
  "quora.com",
  "blogspot.com",
  "wordpress.com",
  "news.ycombinator.com",
  "wikipedia.org",
];

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

export function classifyTier(url: string): number {
  const host = hostnameOf(url);
  if (!host) return 5;
  if (TIER_1_SUFFIXES.some((s) => host.endsWith(s))) return 1;
  if (TIER_1_DOMAINS.some((d) => matches(host, d))) return 1;
  if (TIER_2_DOMAINS.some((d) => matches(host, d))) return 2;
  if (TIER_4_DOMAINS.some((d) => matches(host, d))) return 4;
  if (TIER_3_DOMAINS.some((d) => matches(host, d))) return 3;
  // Recognisable publisher-ish domain but not mapped: specialist/secondary.
  return 3;
}

export function sourceNameOf(url: string): string {
  return hostnameOf(url) ?? "unknown source";
}
