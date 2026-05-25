# Update 3 Productization QA

## Studio Productization

- Marketing Studio remains the existing hidden-admin module.
- No duplicate Marketing Studio, Growth Engine, AI orchestration, CRM, suppression, scheduler, or posting system was added.
- Main Studio has a premium workspace:
  - Campaign Brief
  - Command + AI Team Output
  - Live Preview + Actions

## Main Studio Rules

- No generic admin KPI cards.
- No raw provider endpoints, model lists, task matrix, or backend errors in the main workspace.
- Setup state is friendly and key-first.
- Generated content appears immediately in the generated answer and preview panel.

## Provider Setup

- Normal Settings cards:
  - Connect GenX
  - Connect Hugging Face
  - Connect Qwen
- Advanced provider repair is hidden by default.
- Base URLs, models, task model overrides, raw diagnostics, queue/task details are advanced-only.

## Command Flow

Prompt tested in code:
`Create a 30-second Facebook reel for UK stable owners.`

Expected inference:
- intent: `facebook_reel`
- platform: Facebook
- format: reel
- duration: 30 seconds
- audience: UK stable owners
- output includes strategy, hook, script/body, shot list, caption, CTA, hashtags, visual direction, media plan, compliance notes, score, approval/schedule actions.

## Brand DNA

- Brand DNA now reads as guided business teaching:
  - What do you sell?
  - Who do you sell to?
  - What makes you different?
  - How should the AI sound?
  - What should it never claim?
  - What platforms matter most?
  - Who is your presenter/avatar?
- Preset button: `Use EquiProfile UK Equestrian SaaS preset`.

## Platforms

- Platform cards remain draft-mode truthful.
- Cards explain required permissions, what works now, what comes next, and supported generated formats.
- No fake publishing.

## Audience/Suppression

- Add contact, search contacts, export contacts, status/tags/source, and suppression panel remain in place.
- Suppressed/unsubscribed contacts remain protected by the existing campaign compliance path.

## Tests

- Capability router tests
- Agent registry tests
- Marketing Studio product shell tests
- Infer marketing request tests
- Existing marketing contacts/suppression tests
