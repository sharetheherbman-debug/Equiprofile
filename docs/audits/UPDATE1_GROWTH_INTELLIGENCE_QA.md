# Update 1: Growth Intelligence QA

---

## Tables

| Table | Status |
|---|---|
| `growthProfiles` | ✅ Created |
| `contentScores` | ✅ Created |
| `platformStrategyRules` | ✅ Created |

---

## Platform Strategy Rules

| Platform | Seeded via `seedPlatformStrategyRules()` |
|---|---|
| Facebook | ✅ |
| Instagram | ✅ |
| TikTok | ✅ |
| YouTube | ✅ |
| LinkedIn | ✅ |
| Google Business | ✅ |
| Email | ✅ |

**Important**: All rules are described as "best-practice strategy guidelines" only. No fake algorithm claims.

---

## Content Scoring

| Dimension | Scoring Logic | Status |
|---|---|---|
| hookScore | Presence, length, question mark, "you/your" address | ✅ |
| platformFitScore | Format/platform match, hashtag count, duration | ✅ |
| conversionScore | CTA presence, action verb in CTA, CTA length | ✅ |
| clarityScore | Total script+caption length | ✅ |
| complianceScore | Prohibited claims detection | ✅ |
| viralPotentialScore | Audience address, questions, hashtags, duration, length | ✅ |
| overallScore | Average of all 6 dimensions | ✅ |

All scores are 0-100.

---

## Content Score Persistence

| Feature | Status |
|---|---|
| Score computed on draft creation | ✅ |
| Score returned in API response `growthScore` field | ✅ |
| Score persisted in `contentScores` table | ✅ |
| Score shown in Marketing Studio Preview | ✅ |
| Improvement suggestions shown in Preview | ✅ |

---

## Notes

- Content scoring is deterministic heuristics (no AI provider required)
- Scoring failures are non-critical — draft creation succeeds even if scoring fails
- AI-powered scoring can be added in a future update
