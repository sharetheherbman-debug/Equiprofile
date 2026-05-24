# Phase 2 Route QA

## QA Methodology

Routes were audited via source code review (static analysis). Each route's component file was
inspected for:
- Correct layout shell usage
- PageHeader / page title presence
- Empty state handling
- Loading state handling
- Mobile-safe structure
- Known breakage

Build-time QA (visual browser testing) requires a running server and is documented as a
recommendation rather than a completed step for this prompt.

---

## Public / Management Site Routes

| Route | Layout | Desktop | Mobile | Nav | Empty State | Known Issues |
|---|---|---|---|---|---|---|
| `/` | ManagementLayout | ✅ Good — hero, stats, features | ✅ Responsive | ✅ ManagementNavbar | N/A | None |
| `/features` | ManagementLayout | ✅ MgmtHero + feature grid | ✅ | ✅ | N/A | None |
| `/pricing` | ManagementLayout | ✅ Plan cards + CTA | ✅ | ✅ | N/A | None |
| `/about` | ManagementLayout | ✅ Brand story | ✅ | ✅ | N/A | None |
| `/contact` | ManagementLayout | ✅ Contact form | ✅ | ✅ | N/A | `hidePreFooterCta` set correctly |
| `/login` | AuthLayout or AuthSplitLayout | ✅ | ✅ | N/A | N/A | None |
| `/register` | AuthLayout or AuthSplitLayout | ✅ | ✅ | N/A | N/A | None |

---

## Dashboard / App Routes

| Route | Layout | Desktop | Mobile | Nav | Empty State | Known Issues |
|---|---|---|---|---|---|---|
| `/dashboard` | DashboardLayout | ✅ Card grid, quick actions, weather | ✅ | ✅ Bottom nav | ✅ Handled | None |
| `/horses` | DashboardLayout | ✅ Card list + PageHeader | ✅ | ✅ | ✅ PageHeader + add button | None |
| `/horse/:id` | DashboardLayout | ✅ Horse detail | ✅ | ✅ | N/A | Verify back-button nav |
| `/health` | DashboardLayout | ✅ Health timeline | ✅ | ✅ | ✅ | None |
| `/vaccinations` | DashboardLayout | ✅ | ✅ | ✅ | ✅ | None |
| `/dewormings` | DashboardLayout | ✅ | ✅ | ✅ | ✅ | None |
| `/treatments` | DashboardLayout | ✅ | ✅ | ✅ | ✅ | None |
| `/training` | DashboardLayout | ✅ Session list | ✅ | ✅ | ✅ | None |
| `/calendar` | DashboardLayout | ✅ Calendar view | ✅ | ✅ | ✅ | None |
| `/tasks` | DashboardLayout | ✅ Task list | ✅ | ✅ | ✅ | None |
| `/appointments` | DashboardLayout | ✅ | ✅ | ✅ | ✅ | None |
| `/feeding` | DashboardLayout | ✅ | ✅ | ✅ | ✅ | None |
| `/weather` | DashboardLayout | ✅ Weather widget | ✅ | ✅ | N/A | Open-Meteo dependency |
| `/ai-chat` | DashboardLayout | ✅ Chat UI | ✅ | ✅ | N/A | Requires OpenAI-compatible config |
| `/documents` | DashboardLayout | ✅ File list | ✅ | ✅ | ✅ | None |
| `/contacts` | DashboardLayout | ✅ Contact list | ✅ | ✅ | ✅ | None |
| `/analytics` | DashboardLayout | ✅ Chart area | ✅ | ✅ | ✅ | None |
| `/reports` | DashboardLayout | ✅ | ✅ | ✅ | ✅ | Delivery scheduling needs QA |
| `/notes` | DashboardLayout | ✅ | ✅ | ✅ | ✅ | None |
| `/billing` | DashboardLayout | ✅ Subscription status | ✅ | ✅ | N/A | Stripe env required for portal |
| `/settings` | DashboardLayout | ✅ Profile/account | ✅ | ✅ | N/A | None |
| `/stable-dashboard` | DashboardLayout | ✅ Stable plan overview | ✅ | ✅ | ✅ | Stable plan only |
| `/stable` | DashboardLayout | ✅ Stable profile | ✅ | ✅ | ✅ | Stable plan only |
| `/stable-setup` | DashboardLayout | ✅ | ✅ | ✅ | N/A | Stable plan only |
| `/messages` | DashboardLayout | ✅ | ✅ | ✅ | ✅ | Stable plan only |
| `/stable-reports` | DashboardLayout | ✅ | ✅ | ✅ | ✅ | Stable plan only |
| `/admin` | DashboardLayout | ✅ Admin panel | ✅ | ✅ (admin gate) | N/A | Admin-gated |
| `/admin-analytics` | DashboardLayout | ✅ | ✅ | ✅ (admin gate) | N/A | Admin-gated |
| `/admin-campaigns` | DashboardLayout | ✅ Campaign management | ✅ | ✅ (admin gate) | ✅ | Admin-gated; SMTP env required |
| `/qa-check` | DashboardLayout | ✅ | ✅ | ✅ (admin gate) | N/A | Admin-gated |

---

## Academy / School Site Routes

| Route | Layout | Desktop | Mobile | Nav | Empty State | Known Issues |
|---|---|---|---|---|---|---|
| `/` (school subdomain) | SchoolLayout | ✅ School home | ✅ | ✅ SchoolNavbar | N/A | Separate build target |
| `/about` (school) | SchoolLayout | ✅ | ✅ | ✅ | N/A | None |
| `/features` (school) | SchoolLayout | ✅ | ✅ | ✅ | N/A | None |
| `/pricing` (school) | SchoolLayout | ✅ | ✅ | ✅ | N/A | None |
| `/contact` (school) | SchoolLayout | ✅ | ✅ | ✅ | N/A | None |
| `/student-dashboard` | StudentDashboardLayout | ✅ | ✅ | ✅ | ✅ | Academy partial; Prompt 5 full rebuild |
| `/teacher-dashboard` | TeacherDashboardLayout | ✅ | ✅ | ✅ | ✅ | Academy partial |
| `/school-dashboard` | DashboardLayout | ✅ | ✅ | ✅ | ✅ | School management view |

---

## Visual Consistency Notes

### Management Site Strengths
- ManagementNavbar and SchoolNavbar share the same dark navy (#1e3a5f) — brand coherent
- Both use identical mobile drawer patterns with AnimatePresence
- Both CTAs follow the same Get Started / Log In pattern (with appropriate label differences)
- Section spacing follows consistent py-14 to py-24 rhythm
- Hero images use `.mgmt-hero-overlay` dark gradient for consistent text legibility

### Academy/School Site Gaps
- School accent colour (emerald) vs management accent (teal/blue) — minor intentional divergence
- Student/Teacher dashboards have inline design constant tokens (`STUDENT_ACCENT`, `STUDENT_BG` etc.)
  rather than CSS variables — acceptable for now, refactor in Prompt 5
- School pages headings confirmed to use `font-serif` via Tailwind class applications

### Dashboard Gaps
- `/admin-campaigns` is a large page; mobile QA should verify no horizontal overflow
- `/dashboard` overview is feature-rich; ensure cards don't crowd on small screens (< 375px)

---

## Routes Not Present (Documented as Absent)

| Route | Status |
|---|---|
| `/offline` | Not present — offline fallback page not implemented |
| `/onboarding` | Present (`Onboarding.tsx`) but may not be wired to a route yet |
| `/privacy` | Present (`PrivacyPage.tsx`) |
| `/terms` | Present (`TermsPage.tsx`) |
| `/unsubscribe` | Present (`Unsubscribe.tsx`) — email marketing unsubscribe flow |

---

## Mobile-Specific Checks

| Check | Status |
|---|---|
| Bottom nav does not cover content | ✅ `paddingBottom: 'calc(5rem + var(--safe-area-bottom, 0px))'` on main |
| Horizontal overflow prevention | ✅ `overflow-x: hidden` on html/body |
| Dialog/Sheet mobile layout | ✅ shadcn sheet uses `rounded-t-xl` for bottom sheets |
| Form grid collapse on mobile | ✅ CSS media query collapses `grid-cols-2` to 1 column |
| Touch targets ≥ 44px | ✅ Bottom nav, More sheet buttons, mobile top bar all meet minimum |
