# Try-then-quit explore budget bump (kämpfendes Drittel)

**Date:** 2026-08-04 (updated same day: default **3 → 4**)  
**Code:** `services/ux-journey-agent/perception.py` · `try_before_abandon_required`  
**Env:** `UX_JOURNEY_TRY_BEFORE_ABANDON` (default **4**)  
**Tests:** `test_perception.py` (`test_try_before_abandon_*`)  
**Spec:** `specs/domain/ux-journey-perception.md` § impatient try-then-quit

## Why

Staging try-then-quit / pathfind smokes landed impatient Alex at **~5** steps with floor 3 — still abrupt vs human “kämpfendes Drittel” who often finishes the tool with abandon pressure. Raise default to **4** so Alex typically lands **~5–7** steps without collapsing Sam contrast (patient still higher budget). Soften Lab B task copy so it no longer says “brich nach höchstens zwei Momenten ab”.

## Defaults (env unset)

| Persona | Try budget |
|---------|------------|
| Impatient `tp ≥ 0.75` | **4** |
| Mid | **5** |
| Patient `≤ 0.35` | **6** |
| + `exploration ≥ 0.65` | +1 (cap 6) |

Rough step estimate: `1 (navigate) + tries + 1 (done)` → Alex **~6**, Sam **~7–8**.

## Deploy

Agent image (perception). Optional Coolify override:

```bash
UX_JOURNEY_TRY_BEFORE_ABANDON=4
```

## Verify

```bash
cd services/ux-journey-agent && python3 -m pytest test_perception.py test_confusion_abandon.py -q
```

Staging expect: Alex steps **5–7**, friction 7–10, Soft-Q≈2, Sam steps **> Alex**.
