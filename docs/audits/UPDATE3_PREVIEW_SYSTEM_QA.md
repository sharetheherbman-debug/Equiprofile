# Update 3 Preview System QA

## Implemented

- Added `client/src/components/marketing/PlatformPreview.tsx`.
- Studio right rail now renders the preview component instead of a generic inline placeholder.
- Preview supports platform tone/header treatment for:
  - Facebook
  - Instagram
  - TikTok
  - YouTube
  - LinkedIn
  - Google Business
  - Email

## Preview Content

Preview shows:
- platform header
- hook/title
- caption/body
- CTA
- hashtags
- image/video placeholder
- generated image/video when a real media URL exists
- draft mode badge when publishing is not connected

## Media Truth

- Prompt-only media direction is shown clearly.
- Video is only rendered with a playable `mediaUrl`.
- No fake playable media output is displayed.

## Tests

- `server/marketingStudio.product.test.ts` checks the dedicated preview component and Facebook draft-mode surface.
