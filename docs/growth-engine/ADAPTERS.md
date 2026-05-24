# Growth Engine Adapters

## Purpose
Adapters let future apps plug into the same Growth Engine core without rewriting onboarding, CRM, lifecycle, referrals, social orchestration, or analytics.

## Contract
Each adapter defines:
- branding
- app identity
- onboarding types
- tenant model
- plan model
- feature flags
- content tone
- AI context
- lifecycle triggers

## Current implementation
- `EquiProfileAdapter` in `server/modules/growth-engine/adapters.ts`

## Registration flow
1. Implement `GrowthEngineAdapter` object.
2. Register with `registerGrowthEngineAdapter(adapter)`.
3. Use adapter id in app bootstrap/config.
4. Keep app-specific logic in adapter metadata, not in core engine services.

## Multi-app readiness
- Additional apps can add new adapters while reusing existing persistence and orchestration services.
- Core module remains app-agnostic and tenant-safe.

