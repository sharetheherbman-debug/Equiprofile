# Phase 1 Marketing Studio Gap Audit

## Existing Campaign DB Tables/Schema

| Export | SQL table |
| --- | --- |
| emailCampaigns | emailCampaigns |
| emailCampaignRecipients | emailCampaignRecipients |
| siteAnalytics | siteAnalytics |
| marketingContacts | marketingContacts |
| emailUnsubscribes | emailUnsubscribes |
| campaignSequences | campaignSequences |
| campaignSequenceRecipients | campaignSequenceRecipients |
| campaignSendLog | campaignSendLog |
| campaignReplies | campaignReplies |


## Existing Campaign Services/Templates

- server/_core/campaignService.ts
- server/_core/emailTemplates.ts
- server/_core/campaignReplyFetcher.ts
- server/_core/dupPersonDetection.ts
- server/routers.ts admin campaign procedures
- client/src/pages/AdminCampaigns.tsx


## Existing Email Sending Functions

- server/_core/email.ts: sendEmail, sendCampaignEmail, sendStableInviteEmail, sendCompensationEmail, auth/billing/reminder emails
- server/_core/reminderScheduler.ts campaign/reminder email links
- server/routers.ts admin sendCampaign/sendSequenceStep/sendTestEmail procedures


## Existing Import/Export/CSV Utilities

- shared/csvImport.ts
- server/_core/campaignService.ts parseCSV/autoMapColumns/mapRowToContact
- server/csvExport.ts
- client/src/lib/csvDownload.ts and client/src/lib/utils/csv.ts


## Already Usable

- Admin campaign UI is embedded in Admin.
- Templates, campaign creation, test send, campaign send, suppression, contacts import, replies, sequence templates and launch procedures exist.
- Public lead capture and unsubscribe procedures exist.


## Missing for Email Campaigns

- Dedicated Marketing Studio route/page separate from Admin.
- Production QA of SMTP, mailbox replies, bounce handling, sequence scheduling, and compliance copy.
- Consolidated campaign health/delivery analytics.


## Missing for Social Posting

- No social account OAuth/token schema found.
- No social post/media/queue/publish history schema found.
- No provider publishing services or webhook handlers found.
- No social composer/calendar frontend found.


## Missing for 5-Platform Autopilot

- YouTube: OAuth, channel selection, upload/status API.
- Instagram/Facebook via Meta: Meta OAuth, page/IG account mapping, media container/publish flow.
- TikTok: OAuth, content posting API, video validation/status polling.
- LinkedIn Company Pages: OAuth, organization URN, media upload.
- Google Business Profile: OAuth, location selection, local post/media API.


## What Should Wait Until Later

- Social posting integrations and token storage migrations should wait for Prompt 4.
- Do not remove current email campaign files in Phase 1.


## Exact Backend Files to Add in Prompt 4

- server/socialRouter.ts
- server/_core/social/oauth.ts
- server/_core/social/providers/meta.ts
- server/_core/social/providers/tiktok.ts
- server/_core/social/providers/linkedin.ts
- server/_core/social/providers/youtube.ts
- server/_core/social/providers/googleBusiness.ts
- server/_core/social/publisher.ts
- Drizzle migration for socialAccounts/socialPosts/socialPostTargets/socialPublishLog


## Exact Frontend Pages/Components to Add in Prompt 4

- client/src/pages/MarketingStudio.tsx
- client/src/components/marketing/SocialComposer.tsx
- client/src/components/marketing/SocialCalendar.tsx
- client/src/components/marketing/PlatformConnectionPanel.tsx
- client/src/components/marketing/CampaignHealthPanel.tsx
- client/src/components/marketing/AutopilotQueue.tsx
