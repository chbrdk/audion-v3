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

Persona Lab B-run: each step should expose `perception`; impatient abandon should name grey/filter in `noticed`.

## Human gold (P3)

Fixture: `knowledge/fixtures/perception-human-gold-b.json`  
Scorer: `perception_gold.py` — overlap of agent `noticed.what` vs human saliency labels.
