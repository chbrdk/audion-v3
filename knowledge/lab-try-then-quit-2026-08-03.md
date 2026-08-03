# Try-then-quit — exploratory attempt before abandon

**Date:** 2026-08-03  
**Code:** `services/ux-journey-agent/perception.py` · L2 gate in `main.py`  
**Env:** `UX_JOURNEY_TRY_BEFORE_ABANDON` (default **1**)  
**Tests:** `test_perception.py` (`test_try_then_quit_*`, satisficing budget) · `test_confusion_abandon.py`

## Why

Humans with high time pressure still **try 1–2 interactions** (scroll / probe click) before quitting. Lab B smoke with hard abandon often exited at step 2 with immediate `stance=abandon` — too abrupt vs EBM owner behaviour.

## Behaviour

| Persona | Try budget (default) |
|---------|----------------------|
| Impatient `time_pressure ≥ 0.75` | env base (**1**) |
| Mid pressure | base + 1 |
| Patient `≤ 0.35` | base + 2 (satisficing) |
| High `exploration ≥ 0.65` | +1 (cap 5) |

After the first confusion / grey-filter cue:

1. Soften model `abandon` or hard-upgrade candidate → `hesitate` (`stanceSoftened`, `tryThenQuit`).
2. **Gate:** if the model only emitted `done`, do **not** force-done on that soften turn — allow exploratory proceed click when non-done actions exist, otherwise clear+nudge for scroll/click on the next step.
3. Count `exploratoryAttempts` in felt-state / `perceptionStats`.
4. When budget spent **and** cues persist → hard `stance=abandon` (`stanceUpgraded`) or L2 `forceNext`.

L2 confusion-abandon arms `forceNext` only when `count ≥ threshold` **and** `exploratoryAttempts ≥ tryBeforeAbandon`.

### Staging note (seed before gate fix)

First smoke after initial commit still exited at **2** steps because soften→hesitate emptied `done`-only actions and the old empty-filter path forced done. Follow-up commit blocks that collapse.
## Felt-state continuity

`clarityTrend` / `lowClarityStreak` feed the prompt and `should_prefer_abandon` so persistent low clarity after the try budget prefers quit over re-optimizing. Perception is never synthesized from free thinking (P4.1).

## Telemetry

`perceptionStats`: `exploratoryAttempts`, `stanceSoftened`, `tryThenQuitSoftens`, `lowClarityStreak`  
`confusionAbandon`: `tryBeforeAbandon`, `exploratoryAttempts`

## Verify

```bash
cd services/ux-journey-agent
python3 -m pytest test_perception.py test_confusion_abandon.py -q
```

Staging expect after deploy: Alex steps typically **3–8** (not always 2), friction 7–10, Soft-Q≈2, abandon still named after try.

## Next (out of scope here)

Full Nav-proof H3 / purchase / A+C multi-run waves — see `knowledge/persona-iteration-lab-2026-08-03.md` Extra levers.
