# Update 1: Deployment Steps

**Branch**: copilot/update-growth-engine-foundation  
**Date**: 2026-05-24

---

## Prerequisites

- Node.js 20+
- MySQL 8.0+
- VPS with `/var/equiprofile/storage` writable by the app user
- (Optional) Redis for future BullMQ activation

---

## Step 1: Database Migration

Run the new migration:
```bash
# Using Drizzle Kit (if configured):
npx drizzle-kit push

# OR apply the SQL file directly:
mysql -u root -p equiprofile < drizzle/0022_media_assets_brand_growth_foundation.sql
```

New tables created:
- `mediaAssets`
- `brandProfiles`
- `brandAvatars`
- `growthProfiles`
- `contentScores`
- `platformStrategyRules`

---

## Step 2: VPS Storage Folder Setup

Run as root or with sudo:
```bash
mkdir -p /var/equiprofile/storage/{images,videos,avatars,voice,thumbnails,campaigns,generated,uploads,exports,cache,temp,logs}

# Change 'equiprofile' to your actual service user
chown -R equiprofile:equiprofile /var/equiprofile/storage
chmod -R 750 /var/equiprofile/storage
```

---

## Step 3: Environment Variables

Add to `.env`:
```
# Optional — defaults to /var/equiprofile/storage
EQUIPROFILE_STORAGE_ROOT=/var/equiprofile/storage
```

No other new env vars are required for this update.  
REDIS_URL is optional — if not set, queue falls back to in-process mode (current behaviour).

---

## Step 4: npm Dependencies

No new npm packages are required for this update.

All modules use:
- Node.js built-ins (`fs`, `path`, `crypto`)
- `nanoid` (already in package.json)
- `drizzle-orm` (already in package.json)

---

## Step 5: Nginx Configuration

Add the following to your Nginx config for serving generated media:
```nginx
location /media/generated/ {
    alias /var/equiprofile/storage/;

    types {
        image/jpeg  jpg jpeg;
        image/png   png;
        image/gif   gif;
        image/webp  webp;
        video/mp4   mp4;
        video/webm  webm;
        audio/mpeg  mp3;
        audio/wav   wav;
        audio/ogg   ogg;
        application/pdf pdf;
    }
    default_type application/octet-stream;

    add_header Cache-Control "public, max-age=86400, immutable";
    add_header X-Content-Type-Options "nosniff";

    # Block secrets and config files
    location ~ \.(env|sh|sql|log|json)$ { deny all; return 403; }
    location ~ /\. { deny all; return 403; }
}
```

Reload Nginx:
```bash
nginx -t && systemctl reload nginx
```

---

## Step 6: Seed Platform Strategy Rules

After deployment, trigger the seed via the admin UI:
- Go to Marketing Studio → Settings → click "Seed platform strategy rules"

Or via API (admin session required):
```
POST /trpc/admin.seedPlatformStrategyRules
```

This is idempotent — safe to run multiple times.

---

## Step 7: systemd Restart

```bash
systemctl restart equiprofile
```

Or if using PM2:
```bash
pm2 restart equiprofile
```

---

## Step 8: Validation

After deployment:
1. Visit Marketing Studio → Settings → confirm Brand Profile card appears
2. Visit Marketing Studio → Settings → confirm Avatar card appears
3. Visit Marketing Studio → Assets → confirm media jobs show with preview (if any exist)
4. Create a draft → confirm Growth Score appears in preview
5. Confirm existing Drafts/Approval/Calendar/Audience/Suppression tabs still work

---

## Redis/BullMQ Notes

BullMQ is NOT activated in this update.

Current state: media jobs run via `setTimeout` (in-process).

To activate BullMQ in a future update:
1. Confirm Redis is running: `redis-cli ping` → should return `PONG`
2. Set `REDIS_URL=redis://localhost:6379` in `.env`
3. Run `npm install bullmq`
4. Implement `BullMQAdapter` in `server/modules/growth-engine/queues.ts`
5. Update `getQueueAdapter()` to detect `REDIS_URL`

---

## Rollback Notes

If rollback is needed:
1. Drop the new tables (does not affect existing tables):
   ```sql
   DROP TABLE IF EXISTS platformStrategyRules;
   DROP TABLE IF EXISTS contentScores;
   DROP TABLE IF EXISTS growthProfiles;
   DROP TABLE IF EXISTS brandAvatars;
   DROP TABLE IF EXISTS brandProfiles;
   DROP TABLE IF EXISTS mediaAssets;
   ```
2. Revert to the previous git tag/commit
3. Restart the server

The existing `growthQueueJobs`, `emailCampaigns`, `emailUnsubscribes`, and all other existing tables are not modified by this update.

---

## Files Changed in This Update

**New files:**
- `drizzle/0022_media_assets_brand_growth_foundation.sql`
- `server/_core/storage/localMediaStorage.ts`
- `server/modules/growth-engine/mediaAssets.ts`
- `server/modules/growth-engine/brandProfiles.ts`
- `server/modules/growth-engine/brandAvatars.ts`
- `server/modules/growth-engine/growthIntelligence.ts`
- `server/modules/growth-engine/contentScoring.ts`
- `server/modules/growth-engine/queues.ts`
- `docs/audits/UPDATE1_ARCHITECTURE_SAFETY_CHECK.md`
- `docs/ops/VPS_MEDIA_STORAGE.md`
- `docs/ops/UPDATE1_DEPLOYMENT_STEPS.md`
- (QA audit docs)

**Modified files:**
- `drizzle/schema.ts` — 6 new table definitions added at end
- `server/modules/growth-engine/index.ts` — exports updated
- `server/_core/ai/orchestrator.ts` — output normalisation + media asset registration
- `server/routers.ts` — new admin procedures + brand/avatar enrichment in createMarketingDraft
- `client/src/pages/AdminCampaigns.tsx` — Assets tab preview + Settings Brand/Avatar cards + Growth Score
