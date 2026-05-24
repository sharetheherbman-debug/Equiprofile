# Beta Marketing Studio Rebuild

Date: 2026-05-24

## Status

Classification: **REBUILT FOR HIDDEN ADMIN**

## File Rebuilt

- `client/src/pages/AdminCampaigns.tsx`

The old campaign/admin campaign wall was replaced with a structured hidden-admin Marketing Studio. It remains the single admin campaign UI rather than adding a duplicate product surface.

## Tabs Implemented

1. Overview
2. Composer
3. Email Studio
4. Audience / CRM
5. Suppression List
6. Sequences / Automations
7. Replies / Inbox
8. Media Studio
9. Avatar Studio
10. Video Studio
11. Calendar
12. Approval Queue
13. Platforms
14. Analytics
15. Settings
16. AI Providers / Diagnostics

## UX Rules Applied

- Each tab has a clear header and purpose.
- Empty, loading, and error states are explicit where data is loaded.
- Primary actions either call real backend contracts or are disabled as internal beta.
- Suppression list, CRM, email campaigns, replies, and sequences are separate sections.
- Social platform publishing is explicitly disabled for beta.
- Mobile layout uses wrapping tabs and stacked cards/tables.

## Backend Contracts Used

- `admin.getCampaigns`
- `admin.createCampaign`
- `admin.startCampaign`
- `admin.cancelCampaign`
- `admin.getMarketingContacts`
- `admin.createMarketingContact`
- `admin.importMarketingContacts`
- `admin.getSuppressionList`
- `admin.addSuppressionEntry`
- `admin.removeSuppressionEntry`
- `admin.getCampaignReplies`
- `admin.getCampaignSequences`
- `admin.createCampaignSequence`
- `admin.getGrowthEngineOverview`
- `admin.getAIDiagnostics`
- `admin.generateMarketingDraft`
- `admin.createMediaJob`
- `admin.approveMarketingItem`
- `admin.rejectMarketingItem`
- `admin.scheduleMarketingItem`
- `admin.getSiteSettings`
- `admin.saveSiteSetting`

## Remaining Manual Verification

- Hidden-admin login and tab-by-tab data QA against production database.
- Real campaign send dry-run with SMTP configured.
- Long-table mobile scroll QA on actual device.
