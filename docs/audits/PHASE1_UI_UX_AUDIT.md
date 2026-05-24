# Phase 1 UI/UX Audit

## Current Public Website Visual Issues

- Management and school marketing entrypoints have divergent themes/tokens.
- Root-level bitmap assets and public images are not fully normalized.
- Marketing pages show mixed V1/V2 visual systems.


## Current Dashboard Visual Issues

- V1 and V2 dashboard variants coexist behind `VITE_UI_VERSION`.
- DashboardLayout, PlanAwareLayout, StudentDashboardLayout, and TeacherDashboardLayout create parallel shells.
- Cards/tables/forms/buttons mix shadcn primitives with ad hoc Tailwind.


## Current Academy Visual Issues

- StudentDashboard and TeacherDashboard are very large multi-view files.
- School/academy marketing theme differs from management theme.
- Student/teacher/school states need mobile QA and consistent empty/loading/error patterns.


## Current Auth Visual Issues

- AuthSplitLayout/AuthLayout coexist and may not match Prompt 2 visual system.
- Disabled OAuth states should be checked visually.


## Mobile Layout Issues

- Bottom nav exists, but dense dashboard/admin/campaign views may overflow.
- Large tables and modals require viewport/keyboard QA.


## Duplicated Layout Components

- client/src/components/DashboardLayout.tsx
- client/src/components/PlanAwareLayout.tsx
- client/src/components/StudentDashboardLayout.tsx
- client/src/components/TeacherDashboardLayout.tsx
- client/src/components/management/ManagementLayout.tsx
- client/src/components/school/SchoolLayout.tsx
- client/src/components/AuthLayout.tsx
- client/src/components/AuthSplitLayout.tsx


## Inconsistent Card/Table/Form/Button Patterns

- Button size/icon patterns vary.
- Tables mix custom and shadcn patterns.
- Forms mix Dialog, Sheet, modal, and inline patterns.
- Card radius, padding, borders, and emphasis vary.


## Missing Design Tokens

- Unified color roles across management/school/app dashboards.
- Spacing/radius/elevation rules for operational UI.
- Status colors for health, alerts, billing, academy progress, and campaigns.
- Dashboard vs marketing typography scale.


## Exact Visual System Needed in Prompt 2

- Token-led system with no runtime behavior changes.
- Consolidated shell/sidebar/bottom-nav patterns without deleting routes.
- Normalized card/table/form/button states using existing shadcn primitives.
- Theme variants for management, stable, and academy surfaces.
- Desktop/mobile screenshot verification after visual changes.
