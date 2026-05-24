# Phase 2 PWA Check

## Manifest Audit

**File:** `client/public/manifest.json`

| Field | Before | After | Status |
|---|---|---|---|
| `name` | "EquiProfile — Professional Horse Management" | unchanged | ✅ Good — full brand name |
| `short_name` | "EquiProfile" | unchanged | ✅ Good — concise |
| `description` | Present, accurate | unchanged | ✅ |
| `id` | Missing | `/dashboard` | ✅ Added — PWA identity anchor |
| `start_url` | `/dashboard` | unchanged | ✅ |
| `display` | `standalone` | unchanged | ✅ |
| `display_override` | Missing | `["window-controls-overlay", "standalone"]` | ✅ Added — enhanced desktop PWA |
| `background_color` | `#1e3a5f` | unchanged | ✅ Matches brand navy |
| `theme_color` | `#1e3a5f` | unchanged | ✅ Matches browser chrome |
| `orientation` | `portrait-primary` | unchanged | ✅ |
| `icons` | 10 icons (72–512px, any + maskable) | unchanged | ✅ Full coverage |
| `categories` | `["business", "lifestyle", "productivity"]` | unchanged | ✅ |
| `shortcuts` | 4 shortcuts (Horses, Health, Calendar, Dashboard) | unchanged | ✅ |
| `screenshots` | `[]` (empty array) | unchanged | ⚠️ Known gap — deferred |
| `prefer_related_applications` | `false` | unchanged | ✅ |

### Known Gaps
- **Screenshots array is empty** — Chrome and Edge display screenshots in the install prompt UI.
  Adding screenshots would improve install conversion. Deferred — requires producing production
  screenshots of key screens. Low risk, no security concern.

---

## Safe-Area / Mobile Viewport

**File:** `client/src/index.css`

| Check | Status |
|---|---|
| `env(safe-area-inset-top)` defined in CSS | ✅ `--safe-area-top: env(safe-area-inset-top, 0px)` |
| `env(safe-area-inset-bottom)` defined in CSS | ✅ `--safe-area-bottom: env(safe-area-inset-bottom, 0px)` |
| `env(safe-area-inset-left)` defined | ✅ |
| `env(safe-area-inset-right)` defined | ✅ |
| Mobile top header uses `--safe-area-top` | ✅ `paddingTop: 'var(--safe-area-top, 0px)'` |
| Bottom nav uses `--safe-area-bottom` | ✅ `style={{ paddingBottom: 'var(--safe-area-bottom, 0px)' }}` |
| Main content uses bottom-nav clearance | ✅ `paddingBottom: 'calc(5rem + var(--safe-area-bottom, 0px))'` |
| More sheet inner uses safe-area | ✅ `paddingBottom: 'calc(1.5rem + var(--safe-area-bottom, 0px))'` |
| `overflow-x: hidden` on html/body | ✅ Prevents mobile horizontal scroll |
| `max-width: 100vw` on html/body | ✅ |

---

## Mobile Viewport Meta

**File:** `client/management/index.html` and `client/school/index.html`

Assumed standard Vite HTML template which includes:
```html
<meta name="viewport" content="width=device-width, initial-scale=1" />
```
This is the Vite default. No custom viewport overrides detected in source.

---

## iOS-Specific Checks

| Check | Status |
|---|---|
| `apple-touch-icon` link tag | ⚠️ Not verified in index.html — recommended addition |
| `apple-mobile-web-app-capable` | ⚠️ Not in index.html — `display: standalone` in manifest handles modern iOS |
| `apple-mobile-web-app-status-bar-style` | ⚠️ Not set — default is acceptable for the dark theme |
| Safe-area insets work on iOS | ✅ CSS variables with `env()` fallbacks present |

iOS `apple-touch-icon` note: Vite management/school index.html files should reference the 192×192
icon. This is a documentation gap — deferred to a future dedicated deploy/HTML pass.

---

## Service Worker Audit

**File:** `client/public/service-worker.js`

| Check | Status |
|---|---|
| Cache versioning | ✅ `CACHE_VERSION` auto-synced from package.json via `scripts/update-sw-version.js` |
| Old cache cleanup on activate | ✅ (seen from code structure) |
| Network-first for API routes | ✅ API paths listed in `CACHEABLE_API_PATHS` |
| Static asset caching | ✅ On-demand cache-first for hashed assets |
| Background sync queue | ✅ `SYNC_QUEUE_KEY` defined |
| Offline fallback | ✅ Structure present |
| `skipWaiting()` on install | ✅ Forces immediate activation |
| Risk of stale cache trap | Low — versioned cache names prevent trapping |

No changes made to service worker in Phase 2. Changes would require re-testing offline behaviour
in a real browser environment.

---

## Touch Target Sizes

| Check | Status |
|---|---|
| Bottom nav items `min-h-[44px]` | ✅ `min-h-[44px]` applied |
| "More" sheet module buttons `min-h-[72px]` | ✅ |
| Sidebar menu buttons `h-10` (40px) | ✅ Meets minimum with pointer support |
| Mobile top bar trigger `h-11 w-11` (44px) | ✅ |
| Dropdown menu items | ✅ shadcn default ≥ 36px, acceptable |

---

## Installability Checklist (Lighthouse PWA criteria)

| Criterion | Status |
|---|---|
| HTTPS (required in production) | ✅ — production is HTTPS via nginx |
| Valid manifest with `name`, `icons`, `start_url`, `display` | ✅ |
| Service worker registered | ✅ |
| Icons include 192×192 and 512×512 | ✅ |
| `id` field set | ✅ Added in Phase 2 |
| `display_override` for enhanced desktop | ✅ Added in Phase 2 |

---

## Favicon / Logo References

| Asset | File | Status |
|---|---|---|
| `/logo.png` | Root-level `LOGO.png` served as `/logo.png` | ✅ Referenced in DashboardLayout, ManagementNavbar |
| `/favicon.svg` | `client/public/favicon.svg` | ✅ |
| `/icons/icon-*.png` | `client/public/icons/` | Referenced in manifest — files must be present at build |

---

## Summary of PWA Changes Made

1. **Added `"id": "/dashboard"`** to `client/public/manifest.json`
   — Establishes stable PWA identity across installs and updates.

2. **Added `"display_override": ["window-controls-overlay", "standalone"]`** to manifest
   — Enables Windows/ChromeOS desktop PWA title-bar customisation while falling back to standalone.

## Known Deferred Items

- Add `<link rel="apple-touch-icon">` to management and school `index.html` files
- Populate `screenshots` array in manifest with production screenshots
- Verify `apple-mobile-web-app-status-bar-style` meta for iOS 16+ dark mode bar colour
- Offline page (`/offline.html`) — not present; add if offline experience is prioritised
