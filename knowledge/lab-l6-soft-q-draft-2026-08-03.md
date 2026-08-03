# Lab L6 — Soft-Q draft from Think-Alouds

**Date:** 2026-08-03  
**Code:** `apps/web/lib/soft-q-draft.ts`  
**Wired:** `evaluateUxWaveFromRuns` + merge in `memoryEvaluateUxWave` / `dbEvaluateUxWave`  
**Tests:** `apps/web/__tests__/soft-q-draft.test.ts`  
**Paths:** `paths.softQDraftPath` / `paths.softQDraftKnowledgePath`

## Intent

On Evaluate, fill empty Soft-Q toward the human EBM band from **validEvidence** findings (confusion cues + friction), without hand-typing. Human edits stay; auto-drafts may refresh.

## Rules (deterministic)

| Signal | Soft-Q effect |
|--------|----------------|
| No `validEvidence` runs | Skip draft (basis note only) |
| Confusion cues (`PERSONA_LAB_CONFUSION_RES`) | Q2/Q3 → **2**, Q6 → 2, Q7 schulnote → 4 |
| High friction (≥7) without confusion | Q2 → 2, Q3 → 3 |
| Optimistic cues + low friction | Q2/Q3 → 4 |
| Hand-filled cell (value/rationale, not `Auto-draft`) | Preserved on re-evaluate |
| Prior `Auto-draft` rationale | May be overwritten by fresh draft |

Q4 stays `null` when Nav wasn’t in the slice. Q5 gets a weak choice only when confusion suggests H4-direction.

## Merge

`mergeSoftScoreDraft(draft, existing)` — draft fills empties; hand scores win.

## Verify

```bash
cd apps/web && pnpm exec vitest run __tests__/soft-q-draft.test.ts
```

EBM fixture wave re-evaluate keeps Q2=2 human rationale (not `Auto-draft`).

Confusion Think-Aloud (L3-style) → draft Q2/Q3=2 matching gold band.

## Optional L6b

LLM Soft-Q assist: `knowledge/lab-l6b-soft-q-llm-assist-2026-08-03.md` (`AUDION_SOFT_Q_LLM_ASSIST=1`).

## Perception cues (2026-08-03)

Findings may include Perception-in-the-Loop markers (`stance:abandon`, confusion tags, „Wahrgenommen:“). Soft-Q treats those like classic confusion cues.
