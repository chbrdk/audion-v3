# Perception-in-the-Loop (UX Journey Agent)

**Date:** 2026-08-03  
**Spec:** `specs/domain/ux-journey-perception.md`  
**Code:** `services/ux-journey-agent/perception.py`  
**Paths:** `paths.uxJourneyPerceptionPath` / `paths.uxJourneyPerceptionKnowledgePath`

## Why

Humans: task → page → **what I see / how it feels / what matters** → decision → click or quit.  
What they **do not** notice (time pressure, tunnel vision) shapes that same moment.

Stop heuristics (L1–L3) alone are not perception. A post-hoc judge would be circular. Perception must gate action **in** the step loop.

## Architecture

One LLM call per step (screenshot + DOM already in context) + **hard gate** after parse:

- `<<PERCEPTION>>` required (legacy `<<THINK_ALOUD>>` mapped)
- `stance` filters allowed tools
- Felt-state carries affect/confusion across steps
- Summary/done text synthesized from perception trail when model summary is empty

## Persona → salience

| Dim | Effect |
|-----|--------|
| high `time_pressure` | small noticed budget; `ignoredGuess` expected; abandon stance preferred when clarity low |
| low `time_pressure` | larger budget; hesitate allowed |
| low `detail_orientation` | fewer copy/typo notices |
| high `trust_skepticism` | trust cues more salient in prompt |

Blind-spot rule: act only on `noticed`; inventing UI outside noticed is forbidden.

## Lab verify

```bash
cd services/ux-journey-agent
python -m pytest test_perception.py test_perception_gold.py test_l4_persona_contrast.py -q
```

Persona Lab B-run: each decision step should expose `perception`; impatient abandon should name grey/filter in `noticed` and show `stance=abandon` (or `stanceUpgraded`).

## P4 — breadth + hard abandon (2026-08-03)

| Lever | Behavior |
|-------|----------|
| Prompt | Impatient: fill budget with Zustand / Filter-Ursache / Produktlinie when visible |
| `finalize_perception_for_persona` | Enrich noticed from own think/why; hard-upgrade abandon when tp≥0.75 + confusion/low clarity + grey-filter cue |
| Align drop | Prefer abandon upgrade over click-retry thrash |
| Stats | `perceptionStats.stanceUpgraded` |

Staging expect after deploy: `abandonStep` set, gold overlap ≥0.5, Soft-Q Q2/Q3≈2, correlate ≥0.65.

## P4.1 — no thinking synthesize (2026-08-03)

Missing `<<PERCEPTION>>` no longer force-dones. Decision actions are cleared; model must emit the block. See `knowledge/lab-p4.1-block-done-without-perception-2026-08-03.md`.

## P5 — Filter / unklar warum + retry trim (2026-08-03)

See `knowledge/lab-p5-gold-cues-retries-2026-08-03.md`. Enrich folds gold cues into full budgets; default missing retries = 2.

## Try-then-quit + felt continuity (2026-08-03)

See `knowledge/lab-try-then-quit-2026-08-03.md`.

| Lever | Behavior |
|-------|----------|
| `UX_JOURNEY_TRY_BEFORE_ABANDON` | Default **4** exploratory actions after first confusion before hard abandon / L2 force (Alex ~5–7 steps) |
| Soften | First confused step → `hesitate` (`stanceSoftened`) even if model said abandon |
| Hard upgrade | After try budget + persistent cues / low clarity → `stance=abandon` |
| Satisficing | Patient / low tp / high exploration → higher try budget |
| Felt-state | `clarityTrend`, `lowClarityStreak`, `exploratoryAttempts` in prompt + gate |
| Stats | `perceptionStats.exploratoryAttempts`, `stanceSoftened`, `tryThenQuitSoftens` |

Staging expect: Alex steps **3–8** (not always 2), friction 7–10, Soft-Q Q2/Q3≈2, abandon after try.

## Soft-Q L6b

Leave Soft-Q L6b **ON** on staging when clamp-safe (`AUDION_SOFT_Q_LLM_ASSIST=1`) — see `knowledge/lab-l6b-soft-q-llm-assist-2026-08-03.md`. Rule draft still floors Q2/Q3≈2 for Lab B.

## Human gold (P3)

Fixture: `knowledge/fixtures/perception-human-gold-b.json`  
Scorer: `perception_gold.py` — overlap of agent `noticed.what` vs human saliency labels.

## Next (deferred)

- Full Nav-proof H3 / purchase / A+C multi-run waves
- 2-seed variance as routine (not every deploy)
- Wave UI confusion timeline

