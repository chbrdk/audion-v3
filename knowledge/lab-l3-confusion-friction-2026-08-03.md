# Lab L3 — confusion tags → friction floor

**Date:** 2026-08-03  
**Code:** `services/ux-journey-agent/main.py`  
**Tests:** `test_confusion_friction.py`

## Behaviour

- Optional observation field `tag` ∈  
  `disabled_option_unexplained` | `filter_cause_unknown` | `selection_order_surprise`
- Auto-infer from note / Think-Aloud / L2 abandon cues when tag missing
- Scorecard gets `confusion: { tags[], tagCount, floor, applied, raisedFrom, abandonBump }`
- Tag sources: observation · narration · abandon_cue · **perception.confusion**
- Friction floor (env) — aligned to Persona Lab gold **7–10**:
  - 1 tag → `UX_JOURNEY_CONFUSION_FRICTION_FLOOR_1` (default **7**)
  - 2+ tags → `UX_JOURNEY_CONFUSION_FRICTION_FLOOR_2` (default **8**)
  - perception `stance=abandon` + ≥1 tag → uses floor_2 even if tagCount=1
- Floor **raises** LLM friction when below; never lowers an already-high score

## Why

Optimistic end-of-run LLM can report low friction while “goal looks done”. Deterministic tags keep friction in the human gold band when matrix/grey confusion fired.

## Lab L3 local (2026-08-03)

- Job `a6386873-96e8-431e-a110-e9c826bc3d68`
- `scorecard.confusion.tagCount=6` (narration + observation + abandon cues); tags include `disabled_option_unexplained` + `selection_order_surprise`
- Friction **8**, fit **3**, goal false, L2 force still on; floor=8 with `applied=false` (LLM already ≥ floor — unit tests cover raise path)
- Fallback OpenAI **`gpt-5.4-nano`**; correlate **1.0**
