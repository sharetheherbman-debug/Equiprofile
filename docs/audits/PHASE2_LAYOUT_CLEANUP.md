# Phase 2 Layout Cleanup

## Canonical Layout Shell

**`client/src/components/DashboardLayout.tsx`** is the canonical authenticated app shell.

It provides:
- shadcn/ui `SidebarProvider` + `Sidebar` + `SidebarInset`
- Plan-aware primary nav (standard plan vs. stable plan)
- Resizable desktop sidebar (mouse drag, persisted to localStorage)
- Collapsible sidebar (icon-only mode)
- Mobile top header with avatar / notifications / theme toggle
- Mobile bottom navigation bar (4 primary tabs + "More" sheet)
- "More" sheet with all features grouped by category
- Admin preview mode banner
- Online/offline indicator
- TrialBanner injected above page content
- Safe-area inset support for notched devices
- V2 ambient background depth effect

## Wrappers Retained (Not Deleted)

### PlanAwareLayout
**File:** `client/src/components/PlanAwareLayout.tsx`
**Reason:** Provides additional plan-gate UI (upgrade prompts) on top of DashboardLayout.
**Status:** Retained as compatibility wrapper.

### StudentDashboardLayout
**File:** `client/src/components/StudentDashboardLayout.tsx`
**Reason:** Academy student pages have a distinct product context (educational, not equestrian yard).
Student dashboard visual identity is intentionally differentiated from the main app.
**Status:** Retained. Full visual refactor deferred to Prompt 5 (academy rebuild).

### TeacherDashboardLayout
**File:** `client/src/components/TeacherDashboardLayout.tsx`
**Reason:** Same justification as StudentDashboardLayout.
**Status:** Retained. Deferred to Prompt 5.

### ManagementLayout
**File:** `client/src/components/management/ManagementLayout.tsx`
**Reason:** The management marketing site is a separate Vite build target (`VITE_SITE=management`).
Its layout shell (Navbar + Footer) cannot share the dashboard layout.
**Status:** Retained. This is the canonical public marketing shell.

### SchoolLayout
**File:** `client/src/components/school/SchoolLayout.tsx`
**Reason:** The school marketing site is a separate Vite build target (`VITE_SITE=school`).
**Status:** Retained.

### AuthLayout / AuthSplitLayout
**Files:** `client/src/components/AuthLayout.tsx`, `client/src/components/AuthSplitLayout.tsx`
**Reason:** Auth pages need their own minimal shell without sidebar or nav.
**Status:** Both retained. AuthSplitLayout is the enhanced version with side image.

## Duplicated Logic Removed

None removed in Phase 2. Rationale:
- All layouts serve distinct build targets or product contexts.
- Premature consolidation risks breaking routes across management/school/app builds.
- Phase 1 audit identified them as parallel shells, not identical duplicates.

## Shared Visual Primitives — Extraction Candidates for Prompt 3

The following patterns appear across multiple layouts and could be extracted in a future prompt
once all affected routes are QA'd:

| Pattern | Current location | Candidate extraction |
|---|---|---|
| Nav link with active indicator | ManagementNavbar, SchoolNavbar | Shared `<NavLink>` component |
| Mobile menu open/close animation | ManagementNavbar, SchoolNavbar | Shared `<MobileNavDrawer>` |
| Footer link grid | ManagementFooter, SchoolFooter | Shared `<SiteFooter>` |
| CTA section (dark gradient) | MgmtCTASection | Could be generic `<CtaSection>` |
| Safe-area spacing CSS | index.css (defined) | Already centralised |

**Do not extract these in Phase 2** — deferred to Prompt 3 to avoid scope creep.

## Duplicated Logic Intentionally Deferred

| Item | Reason |
|---|---|
| `StudentDashboard.tsx` inline design tokens (`STUDENT_ACCENT` etc.) | Deferred to Prompt 5 (academy rebuild) |
| `TeacherDashboard.tsx` inline design tokens | Deferred to Prompt 5 |
| `AdminCampaigns.tsx` inline styles | Deferred to Prompt 4 (Marketing Studio) |

## Files Changed in Phase 2

| File | Change type |
|---|---|
| `client/src/_core/hooks/useAuth.ts` | Bug fix — TypeScript import |
| `client/public/manifest.json` | PWA enhancement — added `id` + `display_override` |
| `docs/audits/PHASE2_*.md` | New documentation |

## Route QA Notes

All routes use exactly one layout shell:
- Authenticated routes → `DashboardLayout` (or `PlanAwareLayout` wrapper)
- Student/teacher routes → `StudentDashboardLayout` / `TeacherDashboardLayout`
- Management marketing routes → `ManagementLayout`
- School marketing routes → `SchoolLayout`
- Auth routes → `AuthLayout` or `AuthSplitLayout`

No route uses two layout shells simultaneously. No layout conflict detected.

## What Changes Were Explicitly Not Made

The following were considered and **not** changed to preserve stability:
- Did not delete any layout file
- Did not merge ManagementLayout and SchoolLayout (separate build targets)
- Did not refactor StudentDashboardLayout (academy rebuild is Prompt 5)
- Did not remove DashboardLayout's V1/V2 conditional (`isV2()`) — ambient effect is additive only
- Did not change sidebar width state management (localStorage persistence is correct UX)
