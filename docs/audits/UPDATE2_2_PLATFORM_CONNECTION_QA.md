# Update 2.2 Platform Connection QA

## Result

PASS for product surface and Growth Engine wiring foundation. Direct social publishing remains intentionally disabled.

## Platforms Tab

The Platforms tab now shows cards for:

- Facebook
- Instagram
- TikTok
- YouTube
- LinkedIn
- Google Business
- Email

## Behavior

- Each platform card shows Connected / Draft mode / Error / Not connected.
- Each card states that draft mode is available.
- Social publishing is clearly marked as not enabled until OAuth/backend publishing exists.
- Connect buttons are placeholders and disabled.
- Social draft mode uses the existing `growthEngine.updateSocialConnection` mutation and existing Growth Engine social connection storage.
- Email is not pushed into the social connection enum. It is shown as an Email Studio/SMTP channel and does not call the social platform mutation.

## Existing Foundation Used

- `growthSocialConnections` schema/table
- `growthEngine.updateSocialConnection`
- `listSocialConnections("global")` surfaced through AI diagnostics

## Not Added

- No duplicate social connection table.
- No fake OAuth.
- No fake publishing.

## Remaining Work

Future social publishing requires real OAuth/app credentials and provider-specific publishing backends for Meta, TikTok, YouTube, LinkedIn, and Google Business Profile.
