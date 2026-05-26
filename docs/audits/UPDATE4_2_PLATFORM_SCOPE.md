# Update 4.2 Platform Scope

## Included primary platforms

The Studio primary UI only includes platforms that matter now and can realistically be connected, published, or monitored through official APIs later:

- Facebook Pages
- Instagram Business
- TikTok Business
- YouTube Shorts
- YouTube Long-form
- LinkedIn Company Pages
- Google Business Profile
- Email
- Blog / SEO

These are defined in `client/src/components/marketing/studio/types.ts` as `SUPPORTED_PLATFORMS`.

## Excluded from primary Studio UI

The following platforms are intentionally not rendered in the primary Studio UI:

- Telegram
- WhatsApp
- Snapchat
- Pinterest
- X / Twitter
- Reddit

No new connection system was introduced for these channels.

## Platform UX

Platform setup lives inside the Platform Connections drawer and uses `PlatformConnectionCards`.

Each included platform card shows:

- Status
- Connect action
- Content support
- Publishing readiness
- Analytics support
- Ads support where relevant

The cards say `Connection flow required before direct publishing` where OAuth/publishing is not implemented. They do not promise live publishing.

## Preview scope

The existing preview engine remains canonical:

- `client/src/components/marketing/previews/index.tsx`

It now supports:

- Facebook
- Instagram
- TikTok
- YouTube
- YouTube Shorts
- YouTube Long-form
- LinkedIn
- Google Business
- Email
- Blog

`PreviewCanvas` wraps the preview engine and updates immediately when a generated draft exists.
