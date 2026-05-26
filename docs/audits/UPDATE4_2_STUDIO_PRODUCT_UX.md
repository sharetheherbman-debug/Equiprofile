# Update 4.2 Studio Product UX

## Product decision

The Marketing Studio now presents one premium AI creative workspace instead of an admin dashboard. The visible product is organized around four primary areas only:

- Create
- Campaigns
- Assets
- Autopilot

Brand setup, audience setup, platform connections, provider settings, presenter setup, and Developer Diagnostics are moved into drawers.

## Create

The Create area is command-first:

- Hero bar with `EquiProfile Marketing Studio`
- Standard / Elite quality toggle
- Approval mode indicator
- Autopilot shortcut
- Large command composer
- Example prompt chips
- Quick Create tiles
- Compact campaign context strip
- AI Team Progress
- Output Canvas
- Preview Canvas
- Sticky Action Bar

The Studio no longer starts from provider setup tables, admin cards, or backend status grids.

## Output Canvas

The output canvas renders:

- Campaign title
- Strategy
- Hook
- Script / body
- Shot list / storyboard
- Caption
- CTA
- Hashtags
- Visual direction
- Voiceover
- Media plan
- Schedule recommendation
- Compliance result
- Growth score
- Next actions

If the backend returns plain text, `normalizeDraftFromText` creates a readable structured fallback in the client.

## Campaigns

The Campaigns area is now a kanban/card workflow with:

- Drafts
- Needs Approval
- Scheduled
- Published
- Needs Attention

It no longer defaults to an admin table.

## Assets

The Assets area is now a media library with:

- All
- Images
- Videos
- Voice
- Avatar
- Scripts
- Thumbnails
- Uploads

The empty state is user-facing and truthful: text/campaign generation can be ready while media generation still needs setup.

## Autopilot

The Autopilot area is a guided launch wizard:

- Goal
- Platforms
- Frequency
- Quality
- Approval rule
- Plan length

Default launch mode is Approval Mode. It generates approval-ready plan drafts and does not fake direct publishing.

## Debug UX removal

Normal Studio areas do not render raw JSON, tenant scopes, provider matrices, base URLs, endpoint URLs, model names, task names, HF task names, raw provider failures, system health cards, or admin KPI cards.

Technical details are available only inside `SetupDrawer` under Developer Diagnostics, collapsed by default.
