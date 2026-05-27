# AUTONOMOUS MARKETING OS ROADMAP

## Phase 2 core outcomes
- Stable media generation with truthful lifecycle and retries.
- Deterministic post-processing overlays for brand assets.
- Scene-plan truth for long-form requests (no fake 3-minute renders).

## Social platform execution scope
- Formats: TikTok/Reels/Shorts/LinkedIn/Facebook/Email variants.
- Add platform rule packs: duration, CTA style, caption limits, forbidden claims, safe zones.

## Autonomy layers
1. **Planner agent**: campaign objective, audience, budget, cadence.
2. **Creative agent**: scripts, hooks, scene briefs, prompt variants.
3. **Render agent**: model routing + retries + post-processing.
4. **Publisher agent**: approval-gated scheduling and posting.
5. **Optimizer agent**: A/B iteration from analytics feedback.

## Scheduling + posting
- Queue-based posting with policy checks and approval status gates.
- Time-window optimizer per platform and account timezone.

## Analytics + self-learning
- Unified event schema for impressions, watch time, CTR, conversion.
- Per-platform performance memory for prompt/model selection.
- Continuous A/B testing loop with confidence thresholds.

## Campaign memory + agents
- Persist campaign context, winning hooks, and rejected variants.
- Keep provider vault external to per-tenant EquiProfile settings.
- Multi-app workspace architecture: shared AI/media core, app-specific brand overlays and governance.

## Platform-specific algorithm heuristics
- Shorts/Reels/TikTok: first-2-second hook, fast movement cadence, subtitle pacing.
- LinkedIn: authority-first narrative and evidence framing.
- Facebook: benefit-led storytelling + clear CTA.
- Email: subject-line + preview-text optimization with suppression safety.

## Deferred
- Academy integration remains later phase.
- Fully autonomous publish without approval remains blocked until trust scoring and guardrails mature.
