# Phase 1 Feature Status

| Feature | Status | Evidence/notes |
| --- | --- | --- |
| public website | LIVE | Management and school marketing routes exist. |
| login/register/logout | LIVE | REST auth routes and tests exist. |
| dashboard | LIVE | `/dashboard` exists in both apps with V1/V2 selection. |
| horses | LIVE | Routes plus CRUD/export/passport tRPC procedures. |
| health records | LIVE | Health page and healthRecords router. |
| vaccinations | LIVE | Route and router exist. |
| deworming | LIVE | Route and router exist. |
| treatments | LIVE | Route and router exist. |
| training sessions | LIVE | Route and router exist. |
| appointments | LIVE | Route and router exist. |
| calendar | LIVE | Calendar route and events procedures exist. |
| tasks | LIVE | Route and router exist. |
| stables | LIVE | Stable routes and stable-plan protected router exist. |
| messages | LIVE | Stable messaging route and router exist. |
| documents | LIVE | Upload/list/delete, local file serving, storage helpers. |
| notes | LIVE | Notes router and tests exist. |
| billing/Stripe | PARTIAL | Feature-flagged Stripe checkout/portal/webhook exist; env verification needed. |
| admin unlock | LIVE | Admin unlock router and adminUnlockedProcedure exist. |
| admin users | LIVE | Admin page and user management procedures exist. |
| AI chat | PARTIAL | Works when OpenAI-compatible config is present. |
| weather | LIVE | Open-Meteo current/forecast/hourly procedures; legacy LLM analyze remains. |
| exports | PARTIAL | CSV exports exist for many modules; PDF/older docs need reconciliation. |
| contacts | LIVE | Contacts route/router/export exist. |
| reports | PARTIAL | Report pages/procedures exist; scheduled delivery needs QA. |
| campaigns/email marketing | PARTIAL | Admin campaign UI, SMTP sending, templates, replies, sequences exist. |
| marketing contacts | PARTIAL | CRUD/import/suppression exist; compliance QA needed. |
| campaign sequences | PARTIAL | Schema and procedures exist; automation needs QA. |
| unsubscribe/replies | PARTIAL | Public unsubscribe and IMAP fetcher exist; mailbox env needed. |
| academy | PARTIAL | Student/teacher/school routers and pages exist; not a finished product rebuild. |
| student | PARTIAL | Dashboard, lessons, scenarios, tutor, tasks exist; needs end-to-end QA. |
| teacher | PARTIAL | Groups, assignments, resources, reports exist; needs QA. |
| school | PARTIAL | Org/member/invite backend exists; invite email TODO remains. |
| PWA/service worker | LIVE | Manifest and service worker exist. |
| analytics | PARTIAL | Internal analytics/CTA tracking exist; external analytics absent. |
| file uploads/S3 | PARTIAL | Local/proxy/S3 paths exist; env and storage mode decide behavior. |
| SMTP/email | PARTIAL | Nodemailer module/templates exist; env required. |
| OAuth | PARTIAL | OAuth route/status/env exist; provider config required. |
