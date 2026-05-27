# Production Marketing Engine Foundation Cleanup

## Scope

This update keeps the existing EquiProfile Marketing Studio and AI provider stack. It does not redesign the Studio, duplicate the Growth Engine, alter auth/billing/academy, or fake media output.

## Studio Orchestration

- Canonical frontend entry remains `client/src/components/marketing/studio/MarketingStudioV2.tsx`.
- Media-intent prompts now queue `admin.createMediaJob` immediately and independently from `admin.createMarketingDraft`.
- Draft generation can fail or time out without blocking the media attempt.
- Generate Image, Video, Voice, and Avatar actions can run from the command text even when no draft exists.
- Duplicate clicks are guarded while the same media request is pending.
- Tenant routing now uses `workspaceConfig.tenantId` instead of hardcoded `"global"` in the Studio flow.

## Reusable Workspace Context

`client/src/components/marketing/studio/workspaceConfig.ts` now carries the reusable context shape:

- `appId`
- `tenantId`
- `appName`
- `brandName`
- `defaultAudience`
- `defaultTone`
- `supportedPlatforms`
- `assetNamespace`
- `storagePrefix`

Current default remains EquiProfile/global for backward compatibility.

## Backend Media Cleanup

- GenX media execution keeps the proven `/api/v1/generate` payload shape with `params.prompt`, `params.input`, `params.quality`, `params.platform`, `params.response_format`, and video hints.
- GenX media no longer depends on specialist `/v1/models` IDs. If `/v1/models` exposes only chat/reasoning models, the registry adds a truthful generate-endpoint fallback candidate using `genx_model` or `gpt-5.4`.
- Queued GenX responses normalize to `job_pending` with `providerJobId`, `providerStatus`, and `source=app_genx_media_job`.
- Media asset metadata records the selected provider/model, route reason, endpoint family, provider job status, and source.
- Hugging Face diagnostics now distinguish explicit DB/env models from built-in media defaults.
- Qwen media remains unavailable unless a native DashScope media endpoint is implemented; text/vision/embedding behavior is unchanged.

## Route Hardening

- Sensitive probes such as `/.env`, `/proc/self/environ`, Terraform state, config secrets, GraphQL probes, redirect/proxy/fetch probes, and common PHP/WP scanner paths are denied before SPA fallback.
- Unknown API-like paths return JSON 404.
- Missing built frontend indexes now return a safe 503 message instead of an uncaught 500 or filesystem-path response.

## Post-Deploy Verification

Run on the VPS after deploy:

```bash
cd /var/equiprofile/app
git rev-parse --short HEAD
pm2 logs equiprofile --lines 100
mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "SELECT id, provider, task, status, jobId, publicUrl, errorMessage, outputMetadataJson, createdAt FROM mediaAssets ORDER BY id DESC LIMIT 10;"
```

Studio test prompt:

```text
Create a 5 second premium horse stable video introducing EquiProfile.
```

Expected minimum:

- `admin.createMediaJob` is called even if `admin.createMarketingDraft` fails.
- `mediaAssets` receives a new `text_to_video` row.
- GenX rows include `outputMetadataJson.source=app_genx_media_job` when GenX is selected.
- Status is `processing`, `completed`, `failed`, or `setup_needed`.
- No playable preview is shown unless `publicUrl` exists.
