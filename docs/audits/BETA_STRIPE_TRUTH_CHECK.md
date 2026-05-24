# Beta Stripe Truth Check

Date: 2026-05-24  
Branch: `codex/beta-readiness-repair`

## Status

Classification: **PARTIAL**

Reason: the Stripe code paths are present and build cleanly, but local QA was run with `ENABLE_STRIPE=false` and no live Stripe keys/webhook secret. Checkout, portal, and live webhook delivery still require a test-mode or production Stripe session against a real database before Stripe can be called WORKING.

## Verified By Inspection

- tRPC billing procedures are registered under `billing` in `server/routers.ts`.
- REST billing routes are registered in `server/_core/billingRouter.ts`.
- Webhook endpoint is registered at `POST /api/webhooks/stripe` before JSON body parsing in `server/_core/index.ts`.
- Webhook signature handling uses `stripe.webhooks.constructEvent()` with `STRIPE_WEBHOOK_SECRET`.
- Pricing and checkout helpers live in `server/stripe.ts`.
- Dashboard billing UI uses `trpc.billing.createCheckout`, `trpc.billing.createPortal`, `trpc.billing.getPricing`, and `trpc.billing.getStatus` in `client/src/pages/BillingPage.tsx`.
- Register flow can create checkout after signup when pricing intent query params are present in `client/src/pages/auth/Register.tsx`.
- Public pricing page routes users into registration/trial intent rather than anonymous checkout in `client/src/pages/management/Pricing.tsx`.
- Admin diagnostics expose Stripe-related environment health through the admin/system settings surface.

## Webhook And Status Handling

The webhook handler covers:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

Subscription states update to `active`, `overdue`, `cancelled`, or `expired` depending on Stripe status. Checkout completion stores Stripe customer/subscription ids and marks the user active.

## Idempotency Fix Performed

`server/db.ts` now treats failed webhook attempts as retryable:

- `isStripeEventProcessed(eventId)` returns true only when the row is marked processed and has no error.
- `markStripeEventProcessed(eventId, error?)` records `processed=false` when an error is passed and only sets `processedAt` on success.

This prevents one failed webhook processing attempt from permanently suppressing Stripe retries.

## Env And Feature Flags

Current keys:

- `ENABLE_STRIPE`
- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_MONTHLY_PRICE_ID`
- `STRIPE_YEARLY_PRICE_ID`
- `STRIPE_STABLE_MONTHLY_PRICE_ID`
- `STRIPE_STABLE_YEARLY_PRICE_ID`
- `VITE_STRIPE_PUBLISHABLE_KEY`

`ENABLE_STRIPE=false` cleanly disables billing actions. Local validation used this disabled state.

## Acceptance Matrix

| Requirement | Result | Evidence |
| --- | --- | --- |
| Pricing page checkout | PARTIAL | Public pricing routes to signup with plan intent; anonymous direct checkout is not used. |
| Dashboard upgrade checkout | CODE VERIFIED | `BillingPage` calls `billing.createCheckout`; live redirect not run without Stripe keys. |
| Customer portal | CODE VERIFIED | `BillingPage` calls `billing.createPortal`; live redirect not run without Stripe keys/customer id. |
| Webhook endpoint | CODE VERIFIED | `POST /api/webhooks/stripe` registered before body parser. |
| Signature handling | CODE VERIFIED | Uses Stripe construct-event with webhook secret. |
| Idempotency | FIXED | Failed events remain retryable. |
| Subscription status update | CODE VERIFIED | Covered by webhook event branches. |
| Expired trial recovery | UI FIXED, LIVE STRIPE UNPROVEN | Expired users can reach `/billing`; checkout needs Stripe keys. |
| Active subscriber access | CODE VERIFIED | Protected route allows active users. |
| Cancelled/failed states | CODE VERIFIED | Overdue/expired/cancelled states are handled. |
| Admin billing health | CODE VERIFIED | Env diagnostics available through admin/system settings. |

## Remaining Live Proof Needed

Run against a real Stripe test account and reachable database:

1. Create an expired test user.
2. Start checkout from `/billing`.
3. Complete Stripe Checkout.
4. Confirm webhook updates `users.subscriptionStatus=active`.
5. Open customer portal.
6. Trigger `invoice.payment_failed`, `invoice.payment_succeeded`, and `customer.subscription.deleted`.
7. Confirm retry behavior by forcing a webhook failure and replaying the same event.
