# Phase 2 Design System

## Source of Truth Declaration

The **single visual source of truth** for EquiProfile is:

```
client/src/index.css          ← CSS variables + Tailwind v4 layer
client/public/manifest.json   ← PWA brand metadata
```

No additional styling framework is introduced in Phase 2. All tokens are expressed as CSS custom
properties and consumed via Tailwind utility classes and shadcn/ui primitives.

---

## Brand Color Tokens (CSS custom properties)

```css
/* Defined in @theme inline { … } block in index.css */

/* ── Core brand palette ─────────────────────────────── */
--color-brand-navy:   #1a3a5c   /* deep navy — primary brand anchor */
--color-brand-blue:   #2e6da4   /* primary blue — buttons, links, active states */
--color-brand-sky:    #4a9eca   /* lighter blue — hover states */
--color-brand-teal:   #3a9d8f   /* teal accent — secondary CTAs, icons */
--color-brand-warm:   #f5f0e8   /* warm cream — light section bg */
--color-brand-cream:  #faf8f4   /* cream ivory — off-white card bg */
--color-brand-forest: #2d6a4f   /* forest green — success, school accent */

/* ── Management site section palette ──────────────────── */
--ep-dark-bg:         #1e3a5f   /* primary dark section bg */
--ep-dark-bg-deep:    #0f2238   /* deepest dark — CTA gradient start */
--ep-dark-bg-alt:     #162d4a   /* hero overlay midpoint */
--ep-dark-cta-end:    #11253e   /* CTA gradient end */
--ep-section-light:   #f8f9fb   /* light section bg */
--ep-section-alt:     #f0f4f8   /* alternating light section */
--ep-gold:            #c5a55a   /* brand gold — decorative accents only */
```

## Surface Tokens (shadcn/ui semantic variables)

### Light Mode
```css
--background:              #f8f6f3   /* warm cream-ivory page bg */
--foreground:              #1a2e3e   /* deep warm navy text */
--card:                    #ffffff   /* white card bg */
--card-foreground:         #1a2e3e
--popover:                 #ffffff
--muted:                   #e8e3db   /* warm muted bg */
--muted-foreground:        #5a6b7a   /* secondary text */
--accent:                  #3a9d8f   /* teal accent */
--destructive:             #d94f4f   /* error red */
--border:                  #e0dbd3   /* warm border */
--input:                   #f0ece6   /* input bg */
--ring:                    #2e6da4   /* focus ring */

/* Sidebar */
--sidebar:                 #1a3a5c   /* deep navy sidebar */
--sidebar-foreground:      #edf2f7
--sidebar-accent:          #234b6e
--sidebar-accent-foreground: #f0f5fa
--sidebar-border:          #2a5278
--sidebar-ring:            #4a9eca
```

### Dark Mode
```css
--background:   #111827
--card:         #1a2435
--foreground:   #e8ecf1
--muted:        #263548
--accent:       #5ec4b6
--sidebar:      #0d1520
```

## Typography Scale

| Role | Font family | Class |
|---|---|---|
| Headings (h1–h6) | Playfair Display (serif) | `font-serif` |
| Body / UI | Inter (sans-serif) | `font-sans` (default) |
| Mono / code | system-ui monospace | (not themed) |

CSS variable aliases:
```css
--font-sans: "Inter", system-ui, sans-serif
--font-serif: "Playfair Display", Georgia, serif
```

Both fonts are loaded from Google Fonts via `@import` in `index.css`.

## Spacing Rhythm

Tailwind v4 spacing scale is used directly. Standard page patterns:

| Context | Padding |
|---|---|
| Main content area (desktop) | `p-6` |
| Main content area (mobile) | `p-3` |
| Card padding | `p-4` to `p-6` |
| Section vertical spacing | `py-14` to `py-20` |
| Mobile bottom nav clearance | `calc(5rem + var(--safe-area-bottom, 0px))` |

## Border Radius

```css
--radius: 0.625rem       /* base radius — cards, inputs */
--radius-sm: calc(var(--radius) - 4px)
--radius-md: calc(var(--radius) - 2px)
--radius-lg: var(--radius)
--radius-xl: calc(var(--radius) + 4px)
```

Common classes: `rounded-lg` (cards), `rounded-xl` (CTAs, icon containers), `rounded-full` (pills, badges)

## Shadows / Elevation

| Level | Usage |
|---|---|
| `shadow-sm` | Cards at rest |
| `shadow-md` | Dropdowns, popovers |
| `shadow-lg` | Modals, sheets |
| `hover:shadow-xl` | Card hover state |
| `shadow-black/10` | Navbar shadow on scroll |

Custom: `0 8px 24px -8px hsl(var(--primary) / 0.2)` — card hover (via `.card-hover` utility class)

## Focus States

All interactive elements use `outline-ring/50` via global `* { @apply border-border outline-ring/50 }`.
Sidebar items use `focus-visible:ring-2 focus-visible:ring-ring`.

## Status Colors

| State | Color | Class |
|---|---|---|
| Success | `#4ade80` / `#2d6a4f` | `text-green-500`, `text-brand-forest` |
| Warning | `#e0953d` | `text-amber-500` |
| Error / Destructive | `#d94f4f` | `text-destructive` |
| Info | `#2e6da4` | `text-primary` |
| Muted / Offline | `#9ca3af` | `text-gray-400` |
| Online indicator | `#22c55e` | `bg-green-500` |

## Dashboard Card Style (Canonical)

Use shadcn `<Card>`, `<CardHeader>`, `<CardContent>`:

```tsx
<Card className="hover:shadow-md transition-shadow">
  <CardHeader className="pb-2">
    <CardTitle className="text-base font-semibold">{title}</CardTitle>
    <CardDescription>{description}</CardDescription>
  </CardHeader>
  <CardContent>
    {/* content */}
  </CardContent>
</Card>
```

Interactive stat cards use `card-hover` utility class for lift animation.

## Table Style (Canonical)

Use shadcn `<Table>`, `<TableHeader>`, `<TableBody>`, `<TableRow>`, `<TableHead>`, `<TableCell>`.
No custom table HTML. Wrap in `<div className="overflow-x-auto rounded-lg border">`.

## Form Style (Canonical)

Use shadcn `<Form>`, `<FormField>`, `<FormLabel>`, `<FormControl>`, `<FormMessage>`.
Dialogs use `<Dialog>` or `<Sheet>`. Inputs use `className="bg-input"` for consistent bg.

## Empty / Loading / Error States

### Empty state (canonical)
```tsx
<div className="ep-empty">
  <SomeIcon />
  <p className="font-medium text-foreground">No items yet</p>
  <p className="text-sm text-muted-foreground">Add your first item to get started.</p>
  <Button size="sm" className="mt-2">Add Item</Button>
</div>
```
CSS: `.ep-empty { @apply flex flex-col items-center justify-center py-14 text-center; }`

### Loading state
Use shadcn `<Skeleton>` components matching the layout of the content to be loaded.

### Error state
Use shadcn `<Alert variant="destructive">` with a retry button.

## Mobile-Safe Spacing

PWA safe-area insets are defined in `:root` and used in layout:

```css
--safe-area-top:    env(safe-area-inset-top, 0px)
--safe-area-bottom: env(safe-area-inset-bottom, 0px)
--safe-area-left:   env(safe-area-inset-left, 0px)
--safe-area-right:  env(safe-area-inset-right, 0px)
```

Mobile content area bottom padding: `calc(5rem + var(--safe-area-bottom, 0px))`
Mobile top bar: `paddingTop: 'var(--safe-area-top, 0px)'`
Bottom nav: `paddingBottom: 'var(--safe-area-bottom, 0px)'`
More sheet inner: `paddingBottom: 'calc(1.5rem + var(--safe-area-bottom, 0px))'`

---

## Canonical Components

| Component | File | Status |
|---|---|---|
| Dashboard layout shell | `client/src/components/DashboardLayout.tsx` | **CANONICAL** |
| shadcn Card | `client/src/components/ui/card.tsx` | **CANONICAL** |
| shadcn Button | `client/src/components/ui/button.tsx` | **CANONICAL** |
| shadcn Table | `client/src/components/ui/table.tsx` | **CANONICAL** |
| shadcn Dialog / Sheet | `client/src/components/ui/dialog.tsx` / `sheet.tsx` | **CANONICAL** |
| shadcn Form | `client/src/components/ui/form.tsx` | **CANONICAL** |
| shadcn Badge | `client/src/components/ui/badge.tsx` | **CANONICAL** |
| shadcn Sidebar | `client/src/components/ui/sidebar.tsx` | **CANONICAL** |
| PageHeader | `client/src/components/PageHeader.tsx` | **CANONICAL** |
| ThemeToggle | `client/src/components/ThemeToggle.tsx` | CANONICAL |
| NotificationCenter | `client/src/components/NotificationCenter.tsx` | CANONICAL |

## Canonical Layout Shells

| Shell | Used by |
|---|---|
| `DashboardLayout` | All authenticated app pages |
| `PlanAwareLayout` | Plan-gated pages (wraps DashboardLayout) |
| `StudentDashboardLayout` | Student academy pages |
| `TeacherDashboardLayout` | Teacher academy pages |
| `ManagementLayout` | Management public marketing pages |
| `SchoolLayout` | School public marketing pages |
| `AuthLayout` / `AuthSplitLayout` | Login / register flows |

## What Must NOT Be Duplicated

1. Do not create another global CSS file alongside `index.css` — extend it only
2. Do not inline brand hex values in component files — use CSS variables or Tailwind token classes
3. Do not create a second sidebar component — use the canonical `DashboardLayout`
4. Do not create a second design token file — all tokens live in `index.css`
5. Do not introduce a second component library — extend shadcn/ui only
