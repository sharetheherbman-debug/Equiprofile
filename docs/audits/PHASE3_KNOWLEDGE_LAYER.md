# Phase 3 Knowledge Layer

## Design goals
- Lightweight
- Reusable
- Centralized
- Versionable
- Tenant-safe usage contracts

## Location
- `server/_core/ai/knowledge/templates.ts`

## Supported knowledge categories
- reusable prompts
- campaign templates
- launch templates
- CTA templates
- social templates
- onboarding templates
- brand voice rules
- UK equestrian terminology
- seasonal campaign knowledge
- stable management knowledge
- safety/compliance rules

## Current implementation
- Centralized constants with explicit categories and stable keys for future versioned packs.
- Prepared for expert-reviewed pack injection in future prompts.
