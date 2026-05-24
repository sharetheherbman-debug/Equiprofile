/**
 * dupPersonDetection.ts
 *
 * Deterministic fuzzy duplicate-person detection for EquiProfile marketing contacts.
 *
 * Algorithm overview
 * ──────────────────
 * For each contact pair (a, b) where a.id > b.id (so the *lower* id is always
 * treated as the "primary" record):
 *
 *   1.  Exact email match → already blocked by unique constraint; skip here.
 *   2.  Trigram similarity of normalised full names ≥ 0.80 → +40 pts
 *                                                  ≥ 0.60 → +20 pts
 *   3.  Trigram similarity of normalised business names ≥ 0.75 → +30 pts
 *   4.  Same non-generic email domain (not gmail/yahoo etc.) → +25 pts
 *   5.  Same region → +10 pts
 *   6.  Same country → +5 pts
 *   7.  Same contactType → +5 pts
 *
 * totalScore ≥ DUP_THRESHOLD (55) → flagged as suspected duplicate.
 *
 * The algorithm is O(n²) over the contact list.  For typical marketing lists
 * (< 10 000 contacts) a single run completes in well under a second.
 *
 * No external dependencies — fully deterministic and reliable without AI.
 * GenX/Hugging Face signals can be layered on top as optional scoring boosts, but are never
 * required for a decision.
 */

export const DUP_THRESHOLD = 55;

// ─── normalisation helpers ────────────────────────────────────────────────────

/** Lowercase, strip punctuation/symbols, collapse whitespace. */
function normStr(s: string | null | undefined): string {
  return (s ?? "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

/** Extract the domain part of an email address (already lower-cased). */
function emailDomain(email: string): string {
  const at = email.lastIndexOf("@");
  return at >= 0 ? email.slice(at + 1).toLowerCase() : "";
}

/** Free/personal email providers — same domain across these does NOT imply same person. */
const GENERIC_EMAIL_DOMAINS = new Set([
  "gmail.com", "googlemail.com",
  "yahoo.com", "yahoo.co.uk", "yahoo.co.in", "yahoo.com.au",
  "hotmail.com", "hotmail.co.uk", "hotmail.fr",
  "outlook.com", "outlook.co.uk",
  "live.com", "live.co.uk",
  "icloud.com", "me.com", "mac.com",
  "protonmail.com", "pm.me",
  "mail.com",
  "aol.com",
  "msn.com",
]);

// ─── trigram similarity ───────────────────────────────────────────────────────

/**
 * Dice-coefficient trigram similarity, padded with leading/trailing spaces.
 * Returns 0.0 – 1.0.  Two identical strings → 1.0.
 */
function trigramSim(a: string, b: string): number {
  if (!a || !b) return 0;

  const makeTrigs = (s: string): Set<string> => {
    const padded = ` ${s} `;
    const tg = new Set<string>();
    for (let i = 0; i <= padded.length - 3; i++) {
      tg.add(padded.slice(i, i + 3));
    }
    return tg;
  };

  const ta = makeTrigs(a);
  const tb = makeTrigs(b);
  let intersect = 0;
  for (const t of ta) {
    if (tb.has(t)) intersect++;
  }
  const denom = ta.size + tb.size;
  return denom === 0 ? 0 : (2 * intersect) / denom;
}

// ─── public types ─────────────────────────────────────────────────────────────

export interface DupCandidate {
  id: number;
  email: string;
  name: string | null | undefined;
  businessName: string | null | undefined;
  country: string | null | undefined;
  region: string | null | undefined;
  contactType: string | null | undefined;
}

export interface DupResult {
  /** The later/secondary contact ID — this is the one that gets flagged. */
  contactId: number;
  /** The earlier/primary contact ID — the one we defer to. */
  suspectedDuplicateOf: number;
  /** 0–100 score; higher = more confident. */
  riskScore: number;
  /** Human-readable list of matching signals for the admin UI. */
  reasons: string[];
}

// ─── main detection function ──────────────────────────────────────────────────

/**
 * Scan a flat list of contacts and return all (secondary → primary) duplicate pairs
 * that exceed DUP_THRESHOLD.
 *
 * The input list is sorted by id ascending so the lower id is always treated as
 * the "canonical" record.  The function is purely in-memory and does not touch
 * the database.
 */
export function detectDuplicatePeople(contacts: DupCandidate[]): DupResult[] {
  // Sort ascending by id — earlier record is canonical
  const sorted = [...contacts].sort((a, b) => a.id - b.id);
  const results: DupResult[] = [];

  for (let i = 1; i < sorted.length; i++) {
    const a = sorted[i];
    const normNameA    = normStr(a.name);
    const normBizA     = normStr(a.businessName);
    const domainA      = emailDomain(a.email);
    const normRegionA  = normStr(a.region);
    const normCountryA = normStr(a.country);

    let bestScore = 0;
    let bestMatch: number | null = null;
    let bestReasons: string[] = [];

    for (let j = 0; j < i; j++) {
      const b = sorted[j];

      // Exact email match is already prevented by DB uniqueness — skip
      if (a.email.toLowerCase() === b.email.toLowerCase()) continue;

      let score = 0;
      const reasons: string[] = [];

      // ── Signal 1: name similarity ─────────────────────────────────────────
      const normNameB = normStr(b.name);
      if (normNameA && normNameB) {
        const nameSim = trigramSim(normNameA, normNameB);
        if (nameSim >= 0.80) {
          score += 40;
          reasons.push(`Similar name (${Math.round(nameSim * 100)}% match)`);
        } else if (nameSim >= 0.60) {
          score += 20;
          reasons.push(`Possible name match (${Math.round(nameSim * 100)}%)`);
        }
      }

      // ── Signal 2: business name similarity ───────────────────────────────
      const normBizB = normStr(b.businessName);
      if (normBizA && normBizB) {
        const bizSim = trigramSim(normBizA, normBizB);
        if (bizSim >= 0.75) {
          score += 30;
          reasons.push(`Similar business name (${Math.round(bizSim * 100)}% match)`);
        }
      }

      // ── Signal 3: same non-generic email domain ───────────────────────────
      const domainB = emailDomain(b.email);
      if (
        domainA &&
        domainA === domainB &&
        !GENERIC_EMAIL_DOMAINS.has(domainA)
      ) {
        score += 25;
        reasons.push(`Same email domain (@${domainA})`);
      }

      // ── Signal 4: same region ─────────────────────────────────────────────
      const normRegionB = normStr(b.region);
      if (normRegionA && normRegionB && normRegionA === normRegionB) {
        score += 10;
        reasons.push("Same region");
      }

      // ── Signal 5: same country ────────────────────────────────────────────
      const normCountryB = normStr(b.country);
      if (normCountryA && normCountryB && normCountryA === normCountryB) {
        score += 5;
        reasons.push("Same country");
      }

      // ── Signal 6: same contact type ───────────────────────────────────────
      if (a.contactType && b.contactType && a.contactType === b.contactType) {
        score += 5;
      }

      if (score >= DUP_THRESHOLD && score > bestScore) {
        bestScore = score;
        bestMatch = b.id;
        bestReasons = reasons;
      }
    }

    if (bestMatch !== null) {
      results.push({
        contactId: a.id,
        suspectedDuplicateOf: bestMatch,
        riskScore: Math.min(100, bestScore),
        reasons: bestReasons,
      });
    }
  }

  return results;
}
