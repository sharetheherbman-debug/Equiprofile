# AI Provider Generation QA

Date: 2026-05-24

## AI Settings panel (hidden admin)
Added/verified in `client/src/pages/AdminCampaigns.tsx`:
- GenX key status
- Hugging Face key status
- save GenX/HF keys
- test GenX text generation action
- test Hugging Face task route action
- recent errors panel
- queue status summary
- available capabilities summary

## Runtime behavior
- `createMarketingDraft` uses existing AI orchestration (`executeAITask`) and Growth queue persistence.
- Generated content is persisted as approval draft (status `draft`) before approval workflow actions.
- Missing provider keys return `Provider key missing` cleanly.

## Notes
In this CI sandbox, provider keys are not configured; live external provider execution is blocked by environment configuration.

