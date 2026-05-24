# Update 1: Brand Profile & Avatar QA

---

## Brand Profile

| Feature | Status |
|---|---|
| Table created | ✅ `brandProfiles` in migration 0022 |
| Schema defined | ✅ `drizzle/schema.ts` |
| Service module | ✅ `server/modules/growth-engine/brandProfiles.ts` |
| `getBrandProfile(tenantId)` | ✅ |
| `upsertBrandProfile(input)` | ✅ (insert or update) |
| `buildBrandContextString(profile)` | ✅ Returns injection string for AI prompts |
| Admin procedure `getBrandProfile` | ✅ |
| Admin procedure `updateBrandProfile` | ✅ |
| UI — Brand Profile card in Settings | ✅ |
| Injection into `createMarketingDraft` | ✅ Brand context and prohibited claims injected into prompt |

---

## Brand Avatars

| Feature | Status |
|---|---|
| Table created | ✅ `brandAvatars` in migration 0022 |
| Schema defined | ✅ `drizzle/schema.ts` |
| Service module | ✅ `server/modules/growth-engine/brandAvatars.ts` |
| `listBrandAvatars(tenantId)` | ✅ Active only |
| `getActiveBrandAvatar(tenantId)` | ✅ Most recent active |
| `createBrandAvatar(input)` | ✅ |
| `updateBrandAvatar(id, patch)` | ✅ |
| `archiveBrandAvatar(id)` | ✅ Status → "archived" |
| `buildAvatarPromptContext(avatar)` | ✅ Returns injection string |
| Admin procedure `listBrandAvatars` | ✅ |
| Admin procedure `createBrandAvatar` | ✅ |
| Admin procedure `updateBrandAvatar` | ✅ |
| Admin procedure `archiveBrandAvatar` | ✅ |
| UI — Avatar card in Settings | ✅ |
| Injection into `createMarketingDraft` | ✅ When format = "avatar video" |

---

## Acceptance Tests (manual)

1. Go to Marketing Studio → Settings
2. Fill in Brand Profile form and click Save → should toast success
3. Create a draft → brand voice/audience/CTA should influence generated content
4. Create a Brand Avatar in Settings
5. Create a draft with format = "avatar video" → avatar identity should appear in prompt
6. Archive avatar → should disappear from list

---

## Notes

- Brand profile is per-tenant (`tenantId`). Default tenant is "global" for admin use.
- Avatar archive is soft-delete (status = "archived", row remains in DB).
- Future: reference asset image upload for avatar visual reference.
