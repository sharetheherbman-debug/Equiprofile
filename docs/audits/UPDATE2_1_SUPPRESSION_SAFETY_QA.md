# Update 2.1 — Suppression Safety QA

## Safety checks retained
- Suppression list sources unsubscribes from `emailUnsubscribes` + related marketing contact metadata.
- Add suppression writes to `emailUnsubscribes` and marks contact unsubscribed.
- Remove suppression removes from `emailUnsubscribes` and reactivates unsubscribed contacts.
- Suppression search works by email/name/org.
- CSV export remains available in suppression tab.

## Send protection
- Campaign send/follow-up flows still exclude suppressed and unsubscribed/bounced contacts before sending.
