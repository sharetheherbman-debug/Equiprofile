# Beta Marketing Visibility QA

Date: 2026-05-24

## Status

Classification: **RULES IMPLEMENTED BY SURFACE, LIVE ROLE QA REQUIRED**

## Visibility Rules

| Role / plan | Marketing visibility |
| --- | --- |
| Student | No Marketing Studio. |
| Pro / standard | No Marketing Studio. |
| Stable | Marketing Studio Coming Soon card. |
| School | Marketing Studio Coming Soon card. |
| Teacher | Limited lesson-promotion Coming Soon surface only. |
| Hidden Admin | Full Marketing Studio inside `/admin`, Marketing Studio tab. |

## Evidence

- Student dashboard search found no Marketing Studio surface.
- Pro dashboard search found no Marketing Studio surface.
- Stable dashboard contains `Marketing Studio - Coming Soon` copy in `client/src/pages/StableDashboard.tsx`.
- School dashboard contains `Marketing Studio - Coming Soon` copy in `client/src/pages/SchoolDashboard.tsx`.
- Teacher dashboard contains limited communications/lesson-promotion preview copy in `client/src/pages/TeacherDashboard.tsx`.
- Hidden admin Marketing Studio is loaded through `client/src/pages/Admin.tsx` and implemented in `client/src/pages/AdminCampaigns.tsx`.

## Copy Fixes

Stable and School Coming Soon cards now avoid claiming direct social publishing or fully live automation. They describe planning, CRM, email, and approval-first workflows as beta/internal-coming surfaces.

## Remaining Manual Verification

- Log in as Student, Pro, Stable, School, Teacher, and hidden-admin users.
- Confirm sidebar/nav does not leak Marketing Studio to Student or Pro.
- Confirm Coming Soon cards have no dead buttons and do not imply live publishing.
