# Lab L2 — confusion abandon (hard)

**Date:** 2026-08-03  
**Code:** `services/ux-journey-agent/main.py` (`_text_has_confusion_cue`, `_update_confusion_abandon_from_steps`, `_inject_confusion_abandon_if_armed`)  
**Tests:** `services/ux-journey-agent/test_confusion_abandon.py`

## Behaviour

- **When:** default on if `time_pressure >= 0.75`; override with `UX_JOURNEY_CONFUSION_ABANDON=0|1`.
- **Threshold:** `UX_JOURNEY_CONFUSION_ABANDON_AFTER` (default **2**) — count of **steps** that contain ≥1 confusion cue (grau / disabled / unklar / Filter…).
- **How:** `on_step_end` scans `_history_to_steps`; when count ≥ threshold, next prepare wraps `_force_done_after_last_step` → injects `AUDION_CONFUSION_ABANDON` context message + `DoneAgentOutput` (done-only).
- **Result field:** `confusionAbandon: { enabled, threshold, count, forced, cues[] }`.

## Why wrap `_force_done_after_last_step`

`AgentOutput` is reset every step in `_update_action_models_for_page`, and context messages are cleared at prepare start. Injecting from `on_step_end` alone would be wiped; the force-done hook runs after that reset (same path as max_steps / max_failures).

## Cue alignment

Regex set mirrors `apps/web/lib/persona-lab-correlate.ts` (`PERSONA_LAB_CONFUSION_RES`) so runtime abandon and correlate stay consistent.

## Lab L2 local (2026-08-03)

- Job `2d984769-4e77-4b21-b7c0-13a481e94701` — force fired; LLM died on done (502/429)
- Job `9a463717-438e-44f5-9dff-314ffbf6174f` — **clean pass**: 5 steps, friction 8, fit 3, goal false, `confusionAbandon.forced=true`, done text names grey displays / abandon; correlate **1.0**
