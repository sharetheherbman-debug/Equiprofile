# Beta Public Website Repair

Date: 2026-05-24

## Status

Classification: **REPAIRED**

## Navigation

Primary public navigation is now:

- About
- Features
- Pricing
- Contact
- Login
- Start Free Trial

Removed from primary nav:

- For Stables
- For Schools
- Academy
- AI Marketing
- AI Operations

Direct funnel pages remain in the router for campaign/deep-link use only.

## Files Updated

- `client/src/components/management/ManagementNavbar.tsx`
- `client/src/components/management/ManagementFooter.tsx`
- `client/src/pages/management/Home.tsx`
- `client/src/pages/management/Features.tsx`
- `client/src/pages/management/Pricing.tsx`
- `client/src/pages/management/StableLanding.tsx`
- `client/src/pages/management/SchoolLanding.tsx`
- `client/src/pages/management/AcademyLanding.tsx`
- `client/src/pages/management/AIMarketingLanding.tsx`
- `client/src/pages/management/AIOperationsLanding.tsx`

## Content Corrections

- Removed fake-testimonial style section from the homepage.
- Added a plain trust principles section with no fake testimonials, partnerships, or accreditation claims.
- Softened AI Marketing and AI Operations claims to beta/internal readiness language.
- Replaced "Talk to Sales" primary-style language with "Contact Us" or trial CTAs.
- Clarified that direct social publishing is not enabled yet.
- Kept direct campaign pages hidden from primary nav.

## Browser Evidence

Local production route QA after the CORS/static asset fix:

- `/`, desktop and mobile: mounted, no critical console errors.
- `/features`: mounted, no critical console errors.
- `/pricing`, desktop and mobile: mounted, no critical console errors.
- `/about`: mounted, no critical console errors.
- `/contact`: mounted, no critical console errors.

The observed nav labels were `EquiProfile`, `About`, `Features`, `Pricing`, `Contact`, `Log In`, `Start Free Trial`.

## Remaining Manual Verification

- Visual copy review on real mobile devices.
- Confirm paid ad campaign URLs still use the direct funnel pages intentionally.
