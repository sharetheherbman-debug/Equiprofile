# Phase 2 Visual Plan

## Current Main Website Strengths to Preserve

- Rich deep-navy hero with layered gradient overlay — distinctive and premium
- Serif headline typography (Playfair Display) gives equestrian authenticity
- Inter body font is clean, readable at all sizes
- Gold accent (`#c5a55a`) used sparingly for decorative micro-details
- Animated eyebrow pill on home hero is distinctive but not gimmicky
- Feature cards with gradient icon backgrounds are visually clear
- Consistent dark section pattern (`mgmt-dark-section`) throughout management pages
- ManagementNavbar and SchoolNavbar share the same navy background (#1e3a5f) — brand unity
- Platform stats section (10+ Health Modules / 100% Encrypted / 7-Day Free Trial) is concise
- Dark CTA section with gradient ties pages together

## Visual Problems to Fix

### Public Website
- Testimonials section uses named roles like "Dressage Trainer" and "Stable Owner" — no fake people
  added, these are generic role-types but should be clearly labelled as illustrative
- Section rhythm on inner pages (Features, Pricing, About) needs verification for consistent spacing
- Mobile spacing on hero needs safe-area-inset-top verification
- Trust section ("Built for horse owners…") — tasteful statement added below hero

### Dashboard
- Sidebar nav has many items making it feel dense; plan-aware nav helps but needs clear section dividers
- Dashboard overview page is feature-rich but cards need consistent padding/radius across all states
- Bottom mobile nav `paddingBottom` uses `var(--safe-area-bottom, 0px)` correctly but main content
  needs consistent `paddingBottom: 'calc(5rem + var(--safe-area-bottom, 0px))'` — verified present
- Admin preview banner styling is correct; no change needed
- Empty states must use `.ep-empty` class consistently across all dashboard pages

### Academy/School Site
- School pages use consistent navy palette — already aligned with management site
- School Navbar uses emerald accent vs management's teal/blue — minor divergence, intentional per product
- School heading hierarchy needs verification on mobile
- `font-serif` class on headings must be applied consistently across school pages

## Dashboard Flow Problems to Fix

1. **Navigation density** — Standard plan shows 12 primary nav items; Stable plan shows 16.
   Acceptable given plan complexity; however sidebar items must maintain consistent `h-10` height.
2. **More sheet organisation** — Already grouped by category; icon backgrounds use deep 700/800 tones (fixed
   in previous iteration). Labels are clear.
3. **Dashboard overview cards** — Need consistent Card component usage, not ad-hoc div blocks.
4. **Empty states** — Pages with no data must show `.ep-empty` with icon, heading, and action button.
5. **Page title consistency** — Every page must have a clear page header (title + optional description).
6. **Mobile content padding** — Main content area must not be obscured by bottom nav on any page.

## Academy/School Visual Mismatches to Fix

| Surface | Issue | Fix |
|---|---|---|
| School Navbar | Emerald accent vs management teal/blue | Intentional divergence — document only |
| School heading font | `font-serif` may not be applied consistently | Verify and apply |
| School pages section spacing | May differ from management pages | Verify against design tokens |
| Student Dashboard | Heavy inline styles with `STUDENT_*` const tokens | Document; refactor to CSS vars in future prompt |
| Teacher Dashboard | Same pattern as Student Dashboard | Defer to Prompt 5 (academy rebuild) |

## Duplicated Layout Components

| Component | Status | Action |
|---|---|---|
| `DashboardLayout.tsx` | **CANONICAL** dashboard shell | Keep, no change |
| `PlanAwareLayout.tsx` | Wraps DashboardLayout with plan gating | Keep as compatibility wrapper |
| `StudentDashboardLayout.tsx` | Dedicated student shell | Keep — different product context |
| `TeacherDashboardLayout.tsx` | Dedicated teacher shell | Keep — different product context |
| `ManagementLayout.tsx` | Public marketing shell | Keep — separate build target |
| `SchoolLayout.tsx` | School marketing shell | Keep — separate build target |
| `AuthLayout.tsx` | Auth page shell | Keep |
| `AuthSplitLayout.tsx` | Split-pane auth variant | Keep |

No layouts deleted in this prompt. All layouts are justified by their context.

## Exact Files Edited in Phase 2

| File | Change |
|---|---|
| `client/src/_core/hooks/useAuth.ts` | Added `TRPCClientError` import (TypeScript fix) |
| `client/public/manifest.json` | Added `id` field and `display_override` for enhanced PWA |
| `docs/audits/PHASE2_VISUAL_PLAN.md` | Created (this file) |
| `docs/audits/PHASE2_DESIGN_SYSTEM.md` | Created |
| `docs/audits/PHASE2_LAYOUT_CLEANUP.md` | Created |
| `docs/audits/PHASE2_PWA_CHECK.md` | Created |
| `docs/audits/PHASE2_ROUTE_QA.md` | Created |
| `docs/audits/PHASE2_VALIDATION_RESULTS.md` | Created |

## Routes That Must Be Visually Verified

### Public / Management Site
- `/` — home hero, stats, features, CTA
- `/features` — feature grid, benefits
- `/pricing` — plan comparison, CTA
- `/about` — brand story, values
- `/contact` — contact form, map if present
- `/login` — auth form
- `/register` — registration form

### Dashboard / App
- `/dashboard` — overview cards, quick actions, weather, recent activity
- `/horses` — horse list, add button
- `/health` — health record list, alerts
- `/training` — training log list
- `/calendar` — event calendar
- `/tasks` — task list
- `/stable-dashboard` — (Stable plan) yard overview
- `/documents` — document list
- `/messages` — message list (Stable)
- `/billing` — subscription status, upgrade
- `/settings` — account settings
- `/admin` — (admin only) admin panel

### Academy / School Site
- `/` (school subdomain) — school home page
- `/student-dashboard` — student module overview
- `/teacher-dashboard` — teacher class management
- `/school-dashboard` — school admin overview

## Risks and Rollback Notes

- **TypeScript fix (useAuth.ts)** — Low risk. Import added from existing `@trpc/client` dep.
  Rollback: revert the one-line import addition.
- **Manifest additions** — Low risk. `id` and `display_override` are additive fields.
  Rollback: remove the two added fields from manifest.json.
- **No layout files deleted** — Zero rollback risk.
- **No database changes** — Zero rollback risk.
- **No auth/billing changes** — Zero rollback risk.
