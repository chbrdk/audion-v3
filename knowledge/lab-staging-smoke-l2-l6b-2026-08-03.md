# Staging smoke — Persona Lab after L2–L6b deploy

**Date:** 2026-08-03  
**Commit:** `836b1a7` on `main`  
**Study / wave:** `study-persona-lab-l2-l6b-deploy-smoke-2026-08-03-msdm3k8z` / `wave-persona-lab-b-deploy-smoke-msdm3k9g`  
**Job (good):** `e5ce3caf-a64f-4bc5-89a5-658a6a686cb9`  
**Persona (DB):** `persona-alex-lab-ungeduldig-msdfje0b` with `timePressure: 0.9`

## Agent (uxagent) — Pass / closer 1.0

| Signal | Observed |
|--------|----------|
| Model | `gpt-5.4-nano` |
| `stepBudget` | maxSteps **10**, minSteps 3, `impatientApplied: true`, tp **0.9** |
| `confusionAbandon` | enabled, count **2**, `forced: true` |
| Steps | **4** |
| Friction | **8** |
| Fit | **3** |
| Goal | false |
| Think-Aloud | grau / disabled / Abbruch in done-step `result` |

Local `correlatePersonaLabRun` on job dump → **closer score 1.0**.

## Web (audion-v3) — Gap

| Issue | Evidence |
|-------|----------|
| Fixture persona `persona-alex-lab-impatient` | Agent got `{id}` only → tp 0.5, abandon off (first smoke job `4f33c8c6…`) |
| Agent `summary` empty | Wave `finding` = generic „Browser agent completed run.“ |
| `validEvidence` | stayed `false` despite confusion tags + done narrative (L5 not applied on sync, or not deployed) |
| Soft-Q L6 | Evaluate notes lack Soft-Q draft line; Q2/Q3 stay null even after manual `validEvidence=true` |

**Likely:** Coolify **web** image not yet on `836b1a7` (agent service is). Confirm web redeploy, then re-sync/evaluate.

## Web redeploy retest (same day, later)

Job `a8e4fdf4…`: `validEvidence=true`, Soft-Q notes present, Q2=2 (friction path).  
Empty `summary` still left finding generic → Soft-Q missed Q3 confusion until done-step text was used.

**Fix:** `resolveFindingFromAgentResult` in `ux-wave-scorecard.ts` (done.result / reasoning fallback).  
With done finding patched on wave → Soft-Q **Q2=2, Q3=2**.
