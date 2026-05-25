# Update 2.1 — Audience Contact QA

## Implemented
- Audience tab now supports:
  - Add contact
  - Search contacts
  - Filter by active/unsubscribed/bounced/all
  - List contacts
  - CSV/XLSX import via existing parse/import backend procedures
  - CSV export (client-side export from fetched contacts)

## Data path
- Uses existing admin procedures:
  - `getMarketingContacts`
  - `createMarketingContact`
  - `parseImportFile`
  - `importMarketingContacts`
  - `addSuppression` (for unsubscribed add-flow)

## Notes
- Bounced status direct set on create is not exposed as a dedicated backend setter in this flow.
