# Lab L5 — evidence gate (junk rejection)

**Date:** 2026-08-03  
**Code:** `apps/web/lib/ux-wave-scorecard.ts` (`isJunkEvidenceRun`, `hasUsableUxSubstance`, `inferValidEvidence`)  
**Tests:** `apps/web/__tests__/ux-wave-scorecard.test.ts`

## Rules

| Input | `validEvidence` |
|-------|-----------------|
| `cancelled: true` | **false** + caveat |
| Empty steps / only errors / crash text without Think-Aloud | **false** |
| Hard CloudFront 403 / archive without task complete | **false** (unchanged) |
| Task complete despite intermittent 403 | **true** + caveat (unchanged) |
| Honest abandon with Think-Aloud / done text / confusion tags | **true** even if `goalReached=false` |
| Agent success alone, no substance | still insufficient for UX Soft-Q |

## Verify

- L3 lab dump `a6386873…` → `validEvidence=true` (goal unmet, substance present)
- Cancelled stub → `validEvidence=false`
