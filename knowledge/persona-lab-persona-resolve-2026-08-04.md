# Persona Lab — fixture → DB persona auto-resolve

**Date:** 2026-08-04  
**Code:** `apps/web/lib/lab-persona-resolve.ts` · wired in `packRunsToWaveRuns`  
**Tests:** `apps/web/__tests__/lab-persona-resolve.test.ts`  
**Paths:** `paths.personaLabImpatientDbPersonaId` / `personaLabPatientDbPersonaId` · env `AUDION_LAB_ALEX_PERSONA_ID` / `AUDION_LAB_SAM_PERSONA_ID`

## Problem (fixed)

from-pack used fixture ids (`persona-alex-lab-impatient`). Staging Postgres only has seeded DB ids → agent got `{ id }` → `time_pressure=0.5`. Ops had to PATCH the wave before Start.

## Behaviour

| Input | Output |
|-------|--------|
| `persona-alex-lab-impatient` | `persona-alex-lab-ungeduldig-msdfje0b` (or env) |
| `persona-sam-lab-patient` | `persona-sam-lab-geduldig-msdroy3t` (or env) |
| Already-DB lab id | unchanged (or env) |
| Other personas (Nachrüster etc.) | pass-through |

Priority: **env override → paths DB default → fixture id**.

Local fixtures also include the DB-shaped ids so fixture/auto mode still resolves traits.

## Ops

```bash
# Optional Coolify web overrides (defaults already match staging seeds):
AUDION_LAB_ALEX_PERSONA_ID=persona-alex-lab-ungeduldig-msdfje0b
AUDION_LAB_SAM_PERSONA_ID=persona-sam-lab-geduldig-msdroy3t
```

Create from pack `pack-ebm-persona-lab-b` → Start — **no PATCH**.

```bash
cd apps/web && pnpm exec vitest run __tests__/lab-persona-resolve.test.ts
```
