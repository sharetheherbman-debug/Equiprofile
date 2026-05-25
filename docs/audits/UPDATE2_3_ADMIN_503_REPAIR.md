# Update 2.3 Admin 503 Repair

## Audit Result

The repo-level cause found for `/admin` 503 risk was the service worker navigation fallback returning a 503 offline HTML response. Backend Express static serving already has a production SPA fallback for `/admin`, and AdminCampaigns lazy import is typechecked and built.

## Checked

- Express route order: API/tRPC routes are registered before static fallback.
- Static serving: `server/_core/vite.ts` serves management index for non-asset management routes including `/admin`.
- Service worker: navigation fallback could return `fallbackHtmlResponse()` with status 503.
- Dev server: `setupVite` was spreading the imported Vite config function instead of resolving it, which can break dev route/module serving.

## Repairs

- `client/public/service-worker.js` now uses a cache revision suffix for Update 2.3 to evict stale caches.
- Offline HTML fallback now returns status 200, avoiding false `/admin` server-failure presentation.
- `/admin` navigations are network-first with `cache: "no-store"` and then fallback to cached index only if needed.
- `server/_core/vite.ts` now resolves the Vite config function before creating the dev middleware server.

## Acceptance Notes

- Production `/admin` should load through Express static SPA fallback after build.
- Hard refresh and new service worker activation should clear the stale 503 fallback path.
- A true Nginx/backend 503 would still need VPS logs, but this PR removes the repo-level stale service-worker 503 cause.
