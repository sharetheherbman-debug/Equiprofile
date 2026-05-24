# Phase 1 Academy Gap Audit

## Existing studentRouter Status

PARTIAL/LIVE backend surface. Registered in appRouter; `studentProcedure` gates student/admin; includes lessons, progress, scenarios, virtual horse, tutor, messages, assignments, resources, and reports.


## Existing teacherRouter Status

PARTIAL/LIVE backend surface. Registered in appRouter; `teacherProcedure` gates teacher/admin; includes groups, students, tasks, lessons, competencies, messages, resources, assignments, and reports.


## Existing schoolRouter Status

PARTIAL. Registered in appRouter; `schoolOwnerProcedure` gates school_owner/admin; organization/member/invite management exists; invite email TODO remains.


## Frontend Academy/Student/Teacher/School Pages

- client/src/pages/StudentDashboard.tsx
- client/src/pages/TeacherDashboard.tsx
- client/src/pages/SchoolDashboard.tsx
- client/src/pages/Students.tsx (unregistered public candidate)
- client/src/pages/Schools.tsx (unregistered public candidate)
- client/src/pages/school/*.tsx marketing pages
- client/school/src/SchoolApp.tsx sub-app routes


## Lesson/Pathway Content Status

`server/lessonContent.ts`, `server/studentRouter.ts`, and `server/teacherRouter.ts` contain pathway/unit/scenario content. Marketing claims need manual count verification before reuse.


## Progress Tracking Status

Tables/procedures exist for pathway progress, lesson completion, student progress, competencies, reviews, and reports. End-to-end QA is still required.


## Quizzes/Scenarios Status

Scenario data and answer checking exist. Dedicated quiz builder, grading UI, and assessment workflows are not evident.


## Certificates Status

No certificate issuing/signing/download flow found. Treat as missing for Prompt 5.


## Payments Status

Student/teacher/school plan pricing exists and billing checkout accepts school plan values; live school billing/seat enforcement needs manual verification.


## Academy Subdomain Readiness

`client/school` entrypoint and `deployment/nginx/equiprofile.conf` school server block exist. DNS/Nginx/cookie/mobile QA remains.


## What Must Be Built in Prompt 5

- Dedicated Academy route/product structure.
- Certificates model/issue/download flow.
- Quiz/assessment authoring and results.
- School invite email delivery and seat-management polish.
- Student/teacher/school onboarding and QA scripts.
