# Suppression Final QA

Date: 2026-05-24

## Scope
Suppression list completeness and legacy unsubscribe visibility.

## UI behavior
Suppression tab in `AdminCampaigns` includes:
- email
- name/org
- reason
- source
- date
- search
- export CSV
- add suppression
- remove suppression

## Legacy data proof
Legacy unsubscribe records are sourced from `emailUnsubscribes` via:
- `admin.getMarketingContacts` when `status: "unsubscribed"`
- joined to `marketingContacts` for name/org enrichment
- ordered by `emailUnsubscribes.unsubscribedAt`
- mapped with reason/source/date fields

Implementation location:
- `server/routers.ts` (`getMarketingContacts` unsubscribed branch)

## Delivery safety
Suppression enforcement remains in send/import flows using `emailUnsubscribes` checks in server campaign logic.

