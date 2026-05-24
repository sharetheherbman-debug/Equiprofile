# Update 1: Queue QA

---

## Queue Mode

**Current mode**: In-process fallback (same as pre-Update 1 behaviour)  
**BullMQ**: NOT activated — Redis not yet confirmed on target deployment

---

## QueueAdapter Interface

| Method | Status |
|---|---|
| `enqueue(job)` | ✅ FallbackQueueAdapter uses setTimeout (existing behaviour) |
| `getStatus()` | ✅ Returns pending count and mode |

---

## Queue Names Defined

| Queue | Constant |
|---|---|
| ai-generation | `QUEUE_NAMES.AI_GENERATION` |
| media-generation | `QUEUE_NAMES.MEDIA_GENERATION` |
| growth-analysis | `QUEUE_NAMES.GROWTH_ANALYSIS` |
| publish-prep | `QUEUE_NAMES.PUBLISH_PREP` |

---

## Admin Diagnostics

`admin.getQueueStatus` returns:
- `mode` — "fallback-in-process"
- `redisConfigured` — whether REDIS_URL is set
- `bullmqActive` — false (until BullMQ is implemented)
- `note` — clear explanation of current state
- `queues` — pending count per queue
- `nextSteps` — exact steps to activate BullMQ

---

## BullMQ Activation Checklist (Future)

- [ ] Confirm Redis: `redis-cli ping` → PONG
- [ ] Set `REDIS_URL` in `.env`
- [ ] `npm install bullmq`
- [ ] Implement `BullMQAdapter extends QueueAdapter` in `queues.ts`
- [ ] Update `getQueueAdapter()` to return `BullMQAdapter` when `REDIS_URL` is set
- [ ] Verify jobs survive server restart
- [ ] Verify retry/backoff works
- [ ] Update this QA doc

---

## Media Job Behaviour (Unchanged)

- Media jobs still use `setTimeout(fn, 0)` via orchestrator
- Jobs are tracked in `growthQueueJobs` table (existing, unchanged)
- New: output is normalised via `normaliseProviderOutput()`
- New: media asset is registered in `mediaAssets` table on completion

---

## Current Limitation

If the Node.js process restarts while a media job is `processing`, the job will remain stuck in "processing" state with no automatic retry.

**Fix**: BullMQ activation (above). Until then, admin must manually re-trigger failed jobs.
