# BETA BLOCKER — Suppression List Recovery

## Scope
- `server/routers.ts` (`admin.getMarketingContacts`, `admin.addSuppression`, `admin.removeSuppression`)
- `client/src/pages/AdminCampaigns.tsx` (Suppression List tab)
- `drizzle/schema.ts` (`marketingContacts`, `emailUnsubscribes`)

## Root cause
Suppression tab queried `admin.getMarketingContacts(status: "unsubscribed")`, but that endpoint only returned rows from `marketingContacts`.

Legacy/manual unsubscribes stored only in `emailUnsubscribes` were not shown, even though suppression existed and was enforced.

## Fixes applied
1. **Unified suppression read path**
   - For `status: "unsubscribed"`, backend now reads from `emailUnsubscribes` and left-joins `marketingContacts` by email.
   - This preserves all historical unsubscribe-only records.

2. **Safe name enrichment**
   - If contact profile data exists in `marketingContacts`, suppression row includes name/org fields.
   - If not, row still appears with email + suppression metadata.

3. **Suppression UX improvements**
   - Suppression table now shows `reason` and `source`.
   - Added CSV export in Suppression tab.
   - Row keys now safely fall back to email when contact ID is absent.

## Data safety
- No deletion or destructive migration introduced.
- Existing suppression entries remain authoritative.
- `removeSuppression` behavior remains explicit and manual.

## Compliance impact
- Existing do-not-contact entries are now visible and auditable.
- Suppressed contacts remain excluded from campaign sends via suppression checks in backend send logic.
