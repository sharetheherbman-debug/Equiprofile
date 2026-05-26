# Update 4.2 Visual QA

## Visual direction implemented

The Studio now uses a separate creative workspace visual system:

- Deep black and rich charcoal base
- Subtle green/sage creative accents
- Glass-style panels
- Large command area
- Large preview canvas
- Card and kanban workflows instead of admin tables
- Sticky action bar
- Mobile-first stacking

The visible Studio now stands apart from the generic admin panel while preserving the existing admin route.

## Desktop layout

Desktop uses:

- Hero module
- Sticky four-area product navigation
- Two-column Create layout
- Left/main content for command, quick create, context, AI progress, output
- Right column for preview and actions

## Mobile layout

Mobile uses responsive stacking:

- Hero first
- Primary area nav as horizontal scroll
- Command composer first
- Quick Create and context after command
- AI progress and output
- Preview and sticky actions below

No side menu is required for mobile.

## Accessibility checks in source

- Primary nav has `aria-label="Marketing Studio primary areas"`.
- Command textarea has `aria-label="Marketing command"`.
- Output Canvas, Preview Canvas, Campaign Kanban, Asset Library, Autopilot Wizard, Quick Create Tiles, Campaign Context Strip, and AI Team Progress have accessible labels.
- Buttons use readable text labels.
- Status indicators include text, not color-only meaning.

## Visual regression guardrails

Tests assert:

- Only four primary areas are visible.
- Admin KPI cards do not render inside the Studio module.
- Raw JSON/provider internals/model fields are not present in normal Studio sources.
- Included platform cards render through one supported platform source.
- Excluded platforms do not render in the V2 primary Studio source.

## Browser smoke note

Opened the built management preview at `http://127.0.0.1:4173/admin` after production build. The app shell loaded with no browser console errors. The page remained at the unauthenticated/loading shell because no local backend/admin session was available for authenticated Studio interaction.

Authenticated `/admin` visual QA still requires a valid local admin session or production test session. Source, typecheck, tests, preflight, production build, and the static browser smoke are the validation for this PR.
