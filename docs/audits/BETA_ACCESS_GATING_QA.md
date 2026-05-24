# Beta Access Gating QA

Date: 2026-05-24

## Status

Classification: **FIXED FOR FRONTEND GATING, LIVE USER STATES NEED MANUAL QA**

## Problem Found

Expired complimentary/trial users could land on protected dashboard pages where child components mounted and fired paid-feature queries. That produced repeated 402/403 console noise and a broken-feeling dashboard instead of a clear upgrade path.

## Fixes Performed

- `client/src/components/ProtectedRoute.tsx`
  - Adds route-level expired-access detection for ended trials, expired/overdue subscriptions, and cancelled subscriptions past their end date.
  - Shows a polished billing recovery screen instead of mounting the protected feature page.
  - Keeps `/billing` and `/pricing` accessible so expired users can recover.
  - Preserves admin behavior and admin-preview access.
- `client/src/pages/BillingPage.tsx`
  - Disables nonessential school organization lookup when the current user is billing-locked.
  - Keeps billing status, pricing, checkout, and portal actions available.

## Expected Behavior

| User state | Expected result |
| --- | --- |
| Active trial | Dashboard allowed. |
| Active subscriber | Dashboard allowed. |
| Expired trial | Polished upgrade/paywall screen on protected pages; `/billing` allowed. |
| Overdue/expired subscription | Polished billing recovery screen; `/billing` allowed. |
| Cancelled with future end date | Access allowed through grace period. |
| Cancelled after end date | Billing recovery screen. |
| Admin | Admin preview bypass remains available. |

## Console QA

Unauthenticated route QA on local production build produced no critical console errors for `/dashboard` or `/billing`; both correctly redirect to `/login`.

Live expired-user QA still requires a real user row with expired `trialEndsAt` or expired subscription state.

## Remaining Manual Verification

- Log in as an expired trial user and confirm no dashboard child queries spam 403/402.
- Start checkout from the recovery screen.
- Confirm active users and active trial users are not blocked.
- Confirm admin preview can still inspect dashboards.
