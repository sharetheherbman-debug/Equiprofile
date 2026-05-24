# Marketing Studio Simple Creator QA

Date: 2026-05-24
Branch: `copilot/repair-marketing-studio-dashboard`

## Scope
Hidden-admin Marketing Studio was refactored to a simple flow:
Create → Preview/Edit → Approval Queue → Calendar → Assets.

## UI proof
- Default tab is `create` (`client/src/pages/AdminCampaigns.tsx`).
- Create form includes:
  - prompt: “What do you want to create?”
  - platform dropdown: Facebook, Instagram, TikTok, YouTube, LinkedIn, Google Business, Email
  - format dropdown: post, reel, short, email, carousel, image, video, avatar video
  - duration field for video/short/reel/avatar video
  - goal dropdown: signups, stable owners, schools, academy, retention, announcement
  - tone dropdown: professional, friendly, premium, educational, urgent, warm
  - Generate action
- Preview/Edit card shows and allows edits for:
  - title, hook, script, shot list, caption, CTA, hashtags,
    image prompt, video prompt, avatar script, compliance notes, approval status.
- User actions wired in UI:
  - regenerate
  - save edits
  - send to approval
  - approve
  - schedule

## Backend contract proof
Implemented admin contract actions in `server/routers.ts`:
- `createMarketingDraft`
- `updateMarketingDraft`
- `sendMarketingDraftToApproval`
- `approveMarketingDraft`
- `rejectMarketingDraft`
- `scheduleMarketingDraft`
- `createMediaJob` (existing, retained)
- `listMarketingDrafts`
- `listMarketingAssets`
- `listApprovalQueue`
- `listMarketingCalendar`

## Provider missing behavior
`createMarketingDraft` and compatibility generation path return clean:
- `status: "provider_missing"`
- `message: "Provider key missing"`
when provider keys are not configured.

