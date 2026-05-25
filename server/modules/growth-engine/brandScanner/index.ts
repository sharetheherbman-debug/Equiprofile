const PRIVATE_IP_PATTERNS = [
  /^127\./,
  /^10\./,
  /^0\./,
  /^169\.254\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
];

const CTA_KEYWORDS = ["book", "start", "join", "try", "contact", "apply", "register", "subscribe", "download", "request"];
const AUDIENCE_HINTS = ["stable owners", "riding schools", "horse owners", "coaches", "instructors", "yard managers"];
const TONE_HINTS = ["premium", "friendly", "professional", "expert", "trusted", "practical", "calm"];

export type BrandScanResult = {
  url: string;
  title: string;
  description: string;
  brandKeywords: string[];
  ctas: string[];
  tone: string[];
  audience: string[];
  logoCandidates: string[];
  socialLinks: string[];
  offers: string[];
  visualIdentitySuggestions: string[];
};

export function validateBrandScanUrl(inputUrl: string) {
  const parsed = new URL(inputUrl);
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only http/https URLs are allowed for brand scan");
  }
  if (parsed.protocol === "file:") {
    throw new Error("file:// URLs are blocked");
  }

  const host = parsed.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost")) {
    throw new Error("localhost is blocked for security");
  }
  if (host.endsWith(".local") || host.endsWith(".internal")) {
    throw new Error("internal domains are blocked");
  }
  if (PRIVATE_IP_PATTERNS.some((pattern) => pattern.test(host))) {
    throw new Error("private or loopback IP ranges are blocked");
  }

  return parsed.toString();
}

function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--([\s\S]*?)-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractMetaContent(html: string, name: string): string {
  const regex = new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']+)["']`, "i");
  return (html.match(regex)?.[1] ?? "").trim();
}

function extractTitle(html: string): string {
  return (html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ?? "").trim();
}

function extractLinks(html: string): string[] {
  return Array.from(html.matchAll(/href=["']([^"']+)["']/gi))
    .map((match) => String(match[1]))
    .filter(Boolean);
}

function extractLogoCandidates(html: string): string[] {
  return Array.from(html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi))
    .map((match) => String(match[1]))
    .filter((src) => /logo|brand|mark/i.test(src));
}

function topKeywords(text: string, limit = 12): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 4)
    .filter((word) => !["with", "that", "from", "your", "this", "have", "will", "into", "about", "them", "their"].includes(word));

  const counts = new Map<string, number>();
  for (const word of words) {
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
}

function uniqueByPrefix(values: string[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = value.toLowerCase().slice(0, 64);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function scanBrandWebsite(input: {
  url: string;
  timeoutMs?: number;
  maxHtmlBytes?: number;
  fetchHtml?: (url: string, opts: { timeoutMs: number }) => Promise<string>;
}): Promise<BrandScanResult> {
  const url = validateBrandScanUrl(input.url);
  const timeoutMs = Math.max(2_000, Math.min(30_000, input.timeoutMs ?? 10_000));
  const maxHtmlBytes = Math.max(20_000, Math.min(1_000_000, input.maxHtmlBytes ?? 250_000));

  const fetchHtml = input.fetchHtml ?? (async (targetUrl: string, opts: { timeoutMs: number }) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), opts.timeoutMs);
    try {
      const response = await fetch(targetUrl, { signal: controller.signal, redirect: "follow" });
      if (!response.ok) throw new Error(`Brand scan failed with status ${response.status}`);
      const html = await response.text();
      return html;
    } finally {
      clearTimeout(timer);
    }
  });

  const html = await fetchHtml(url, { timeoutMs });
  if (Buffer.byteLength(html, "utf8") > maxHtmlBytes) {
    throw new Error("Brand scan HTML size exceeds security limit");
  }

  const safeText = stripHtml(html);
  const title = extractTitle(html);
  const description = extractMetaContent(html, "description") || extractMetaContent(html, "og:description");
  const links = extractLinks(html);

  const ctas = uniqueByPrefix(
    safeText
      .split(/[.!?]/)
      .map((line) => line.trim())
      .filter((line) => CTA_KEYWORDS.some((keyword) => line.toLowerCase().includes(keyword)))
      .slice(0, 8),
  );

  const audience = uniqueByPrefix(
    AUDIENCE_HINTS.filter((hint) => safeText.toLowerCase().includes(hint)).concat(
      safeText.match(/for\s+([a-z\s]{4,40})/gi)?.slice(0, 5).map((item) => item.replace(/^for\s+/i, "").trim()) ?? [],
    ),
  ).slice(0, 8);

  const tone = uniqueByPrefix(TONE_HINTS.filter((hint) => safeText.toLowerCase().includes(hint))).slice(0, 6);

  const socialLinks = uniqueByPrefix(
    links.filter((link) => /instagram|facebook|tiktok|youtube|linkedin|x.com|twitter/i.test(link)),
  ).slice(0, 12);

  const offers = uniqueByPrefix(
    safeText
      .split(/[.!?]/)
      .map((line) => line.trim())
      .filter((line) => /(offer|discount|trial|book|demo|launch|free)/i.test(line))
      .slice(0, 10),
  );

  const brandKeywords = topKeywords(`${title} ${description} ${safeText}`);
  const logoCandidates = uniqueByPrefix(extractLogoCandidates(html)).slice(0, 10);

  return {
    url,
    title,
    description,
    brandKeywords,
    ctas,
    tone,
    audience,
    logoCandidates,
    socialLinks,
    offers,
    visualIdentitySuggestions: [
      tone.includes("premium") ? "Use premium minimal visuals and high-contrast typography" : "Use clean modern visuals with product-first composition",
      logoCandidates.length ? "Reuse logo-safe spacing and color hierarchy from detected brand assets" : "Create a consistent lockup with logo-safe clear space",
      brandKeywords.some((keyword) => keyword.includes("stable") || keyword.includes("equestrian"))
        ? "Use equestrian-context imagery with practical operations framing"
        : "Use audience-context imagery tied to core offers",
    ],
  };
}
