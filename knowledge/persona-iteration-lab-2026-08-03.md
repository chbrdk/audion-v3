# Persona iteration lab — small loops toward human EBM

**Date:** 2026-08-03  
**Goal:** Know within ~10–20 min whether a tweak moves us closer to human findings — not after a full 5-run wave.

## Anchor (gold band)

From baseline wave `audion-2026-07-30-mcp` / human narrative for **B-aufgabe1-nachruesten** (Alex / owner):

| Signal | Target band |
|--------|-------------|
| Task outcome | Often incomplete / abandoned, not clean success |
| Friction | High (~8–10), not 2–5 |
| Soft-Q Q2/Q3 | Confusion / matrix unclear (H1/H2 supported) |
| Step count | Humans quit early; agent should not burn 40–50 steps “searching harder” |
| Think-Aloud | Names greyed options / unclear dependency, not only “found Service” |

Infra (`cloudfront_403`) is out of scope for this lab — only UX closeness.

## Lab unit (one experiment = one change)

**Fixed:** 1 run only — `B-aufgabe1-nachruesten`, persona Alex, same URL/task as staging pack.  
**Default budget:** `maxSteps: 15` (forces early stop; faster + more human-like).  
**Do not** start A+C+Nav+purchase in the same iteration.

### Pass / fail (binary, write down before the run)

After Sync, check in order:

1. **Abandon or confusion named?** Think-Aloud / findings mention matrix / grey / “weiß nicht warum” / give-up — **pass signal**. Clean “goal reached, friction ≤4” — **fail** (too optimistic).
2. **Steps used ≤ 15 and stop reason ≠ silent timeout?** Prefer explicit abandon / done-with-partial.
3. **`time_pressure` (or trait) visible in run telemetry / personaPolicy?** If override was set to ≥0.8 and policy still ~0.5 → wiring bug, not UX.
4. **vs previous lab run:** friction ↑ or Soft-Q draft more confused = closer; completion↑ alone = farther.

One tweak per lab. If unclear, re-run same config once (seed jitter), then decide.

## Iteration ladder (build in this order)

| # | Tweak | What to change | Expect if working |
|---|--------|----------------|-------------------|
| L0 | **Baseline lab** | Current Alex + B, maxSteps 15, no code change | Document: steps, friction, abandon?, quotes |
| L1 | **Hard step budget from persona** | `time_pressure` ≥0.75 → clamp maxSteps (e.g. 8–12); ≤0.35 → allow pack default | Impatient Alex stops earlier than patient Sam on same task |
| L2 | **Explicit abandon heuristic** | Extra donts / heuristic: after 2 unexplained disabled controls → `done` + frustration | Findings mention grey options; validEvidence only if Think-Aloud has F-Fragen |
| L3 | **Confusion observations** | Schema tags on steps; scorecard weights them into friction | Friction jumps when tags fire even if URL “looks done” |
| L4 | **A/B persona contrast** | Same task, Alex impatient vs Sam patient (or journey dims flipped) | Segment / persona deltas show up in friction & abandon rate |
| L5 | **Evidence gate** | Reject cancelled / empty summary | No more validEvidence on junk |
| L6 | **Soft-Q draft from Think-Alouds** | Evaluate assist | Soft-Q fills toward human band without hand-typing |

Skip L6 until L0–L3 show directional movement.

## How to run a lab wave (ops)

1. Create study/wave from pack `paths.personaLabPackId` (`pack-ebm-persona-lab-b`) — single B run, `maxSteps: 15`, persona `persona-alex-lab-impatient`.
2. Start → Sync (staging or local agent).
3. Build snapshot: `waveRunToPersonaLabSnapshot(run, { narrativeBlob, timePressure })` then `correlatePersonaLabRun(snap)`.
4. **Self-check without agent:** `pnpm exec vitest run __tests__/persona-lab-correlate.test.ts` (gold vs optimistic fixtures).
5. Log one line below under **Lab log**.
6. Apply next ladder step only if L0 is recorded.

Code SoT:
- Pack: `apps/web/lib/fixtures/scenario-packs/ebm-persona-lab-b.ts`
- Correlator: `apps/web/lib/persona-lab-correlate.ts`
- Paths: `paths.personaLabPackId` / `personaLabImpatientPersonaId`

Staging study/wave refs: see `knowledge/paths.md` / Bosch staging IDs in prior notes (`study-ebm-produktkombinationen-bosch-ebike-msd6pgrg`).

## Extra levers (beyond the ladder)

- **Satisficing:** first “good enough” answer vs optimizing (purchase-intent vs owner).
- **Judge prompt separate from actor:** score “would this persona quit?” not “did the agent reach a page”.
- **Nav proof:** URL/title must match tool page (H3) — separate micro-lab, not mixed with matrix.
- **2 seeds only when L1+ stable:** variance check, not every day.
- **Human clip gold:** 1 short labeled clip for B; agent must land in band or flag optimistic bias.

## Lab log

| When | Config | Steps | Friction | Abandon/confusion? | Correlate score | Verdict |
|------|--------|-------|----------|--------------------|-----------------|---------|
| 2026-08-03 L0a | pack lab + fixture id `persona-alex-lab-impatient` | 7 | 11 | no (Agent error) | 0.53 | **Fail** — persona not in staging Postgres → only `{id}` sent → `time_pressure=0.5` |
| 2026-08-03 L0b | seeded `persona-alex-lab-ungeduldig-msdfje0b`, force restart | 7 | 11 | no (Agent error after navigate) | 0.65→reject after usable_run gate | **Fail as UX sample** — policy OK (`time_pressure=0.9`, heuristics present) but agent dies after first navigation; empty Think-Aloud |
| 2026-08-03 L0c local | `./scripts/local-lab-run.sh` job `dac8e0af…` · OpenAI+Anthropic · maxFailures 10 | 9 | 7 | ja (grau / Filter nicht erklärt / Abbruch-Persona) | **1.0 closer** | **Pass** — Agent stabil; `time_pressure=0.9`; Confusion im Think-Aloud; fit=4; goal=true |
| 2026-08-03 L1 local | same lab + `_apply_persona_step_budget` · request max=40 | 6 | 8 | ja (grau/verwirr) · goal=false | **1.0 closer** | **Pass** — `stepBudget.maxSteps=10` (`impatientApplied`); minSteps=3; fit=3 |

**Staging study:** `study-persona-lab-l0-2026-08-03-msdfdbk8` · wave `wave-persona-lab-b-l0-msdfdbll`  
**Lesson:** Scenario packs must reference **DB persona ids** on staging (or seed fixture ids). Fixture-only ids resolve to `{ id }` and wipe traits.

**Next:** Diagnose journey-agent post-navigate crash on lab job; then L0c with usable Think-Aloud.
