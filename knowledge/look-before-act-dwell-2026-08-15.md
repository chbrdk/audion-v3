# Look-before-act + persona dwell (Gate 5d, 2026-08-15)

**Spec:** `specs/domain/ux-journey-perception.md` § Gate 5d  
**Code:** `services/ux-journey-agent/perception.py` · live gate in `main.py`  
**Env:** `UX_JOURNEY_LOOK_BEFORE_ACT` (default **1**), optional `UX_JOURNEY_DWELL_SECONDS_IMPATIENT` / `_MID` / `_PATIENT`  
**Tests:** `test_perception.py` (`test_look_before_act_*`, `test_dwell_seconds_*`, `test_finalize_look_*`)

## Why

Perception schema existed, but the agent still **acted in the same breath** as landing. Humans: land → look at the viewport → then click. Gate 5d forces that beat.

## Rule

1. On first turn after a URL (initial or change): arm `lookBeforeActPending`.
2. Soften perception → `hesitate` + `lookBeforeActRequired` + dwell seconds from `time_pressure`.
3. Strip deep actions (`click`/`input`/`navigate`/`done`); keep `wait`/`scroll`/`extract`.
4. **Exception:** cookie/consent dismiss clicks stay allowed (banner must not block looking).
5. If only deep actions were proposed → inject typed `wait(dwellSeconds)`.
6. Soft look actions satisfy the gate for that URL; cookie-only does **not**.
7. New URL re-arms the look turn.

## Sequence

land → look/dwell → (optional cookie) → then category/scroll/search gates (5b/5c) → act.
