# P4.1 — Block done without PERCEPTION (no thinking synthesize)

**Date:** 2026-08-03  
**Why:** Staging after P4 showed navigate→done with `forcedDone` after one missing-block retry. Model wrote grey/Performance Line in free thinking but never emitted `<<PERCEPTION>>`. Gate previously *rewarded* that by forcing DoneAgentOutput.

## Rule

- **Do not** synthesize `perception` from free-form thinking/reasoning.
- **Do** reject `done` / `click` / `input` / `navigate` until a valid `<<PERCEPTION>>` parses in the same turn.
- Missing block → nudge (harder text) + clear decision actions (soft scroll/wait only) + retry (`UX_JOURNEY_PERCEPTION_MISSING_RETRIES`, default 3).
- After retries: hard-block clear, continue loop — no force-done for missing perception.
- Stance-driven force-done still requires a parsed PERCEPTION on the done turn (retry nudge; else clear actions).

## Code

- `perception.clear_decision_actions` / `actions_need_perception` / `perception_missing_retries`
- `main._get_next_action_with_perception` rewritten
- Stats: `missingPerceptionClears`

## Staging expect

- No more 2-step nav→done with `stepsWithPerception=0` from missing-block force-done.
- At least one step with `perception` before abandon/done.
- Gold overlap / Soft-Q as before once block is present.
