const PLACEHOLDER_PATTERNS = [
  /\blorem ipsum\b/i,
  /\bplaceholder\b/i,
  /\bmanual posting copy\b/i,
  /\btodo\b/i,
  /\bwrite copy here\b/i,
];

const BANNED_PHRASES = [
  "guaranteed results",
  "instant riches",
  "risk free forever",
];

const UNSUPPORTED_CLAIMS = [
  "clinically proven",
  "government approved",
  "100% guaranteed",
];

const EQUINE_TERMS = [
  "horse",
  "horses",
  "equine",
  "stable",
  "rider",
  "owner",
];

const DRIFT_TERMS = [
  "corporate office",
  "city skyline",
  "laptop lifestyle",
  "stock market",
  "gibberish",
];

export function hasPlaceholderCopy(text: string) {
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(text));
}

export function hasBannedPhrase(text: string) {
  const lower = text.toLowerCase();
  return BANNED_PHRASES.some((phrase) => lower.includes(phrase));
}

export function hasUnsupportedClaim(text: string) {
  const lower = text.toLowerCase();
  return UNSUPPORTED_CLAIMS.some((phrase) => lower.includes(phrase));
}

export function hasEquineContext(text: string) {
  const lower = text.toLowerCase();
  return EQUINE_TERMS.some((term) => lower.includes(term));
}

export function hasOffTopicDrift(text: string) {
  const lower = text.toLowerCase();
  return DRIFT_TERMS.some((term) => lower.includes(term));
}
