# Update 3.1 Studio Visual Replacement QA

## Replacement Summary

The Studio tab layout in `client/src/pages/AdminCampaigns.tsx` was hard-replaced with a single cohesive premium workspace instead of another stack of generic admin cards.

## Required Surfaces

- Top status row: AI, Media, Platforms/Draft mode, Approval
- Left panel: Campaign Brief
- Center panel: Studio Chat and generated assistant result
- AI team progress: Strategist, Copywriter, Creative Director, Compliance, Scheduler
- Right panel: Preview + Actions
- Secondary tabs remain outside the workspace: Studio, Campaigns, Assets, Audience, Platforms, Brand DNA, Approvals, Calendar, Settings

## Debug UX

The main Studio no longer exposes endpoint URLs, model names, raw JSON, task matrices, queue details, or raw provider failure lists. Those remain in Advanced provider repair.

## Preview Behavior

Generated drafts are stored in local Studio state via `setDraft(data.draft as DraftPayload)` and passed immediately into `PlatformPreview`, so the preview panel updates in the same workflow after generation.

## Agent States

The visible AI team timeline now presents user-understandable states:

- waiting
- active
- complete
- blocked

Users do not configure agents.
