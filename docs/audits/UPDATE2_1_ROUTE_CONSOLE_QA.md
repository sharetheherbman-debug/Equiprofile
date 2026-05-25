# Update 2.1 — Route / Console QA

## Target routes
- `/admin` -> Marketing Studio sections:
  - Create
  - Drafts
  - Calendar
  - Assets
  - Audience
  - Suppression
  - Brand
  - Settings

## QA summary
- Marketing Studio redesigned to a simpler chat-first creator workspace.
- Provider errors in creator flow are normalized to user-safe messaging.
- Provider/network internals remain visible in technical diagnostics only.

## Manual browser QA
- Full browser-route console pass requires interactive runtime environment and credentials.
- Backend and UI logic were updated to prevent raw provider endpoint errors in normal creator flow.
