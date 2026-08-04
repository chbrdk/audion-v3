# Try-then-quit explore budget bump (4–6 steps)

**Date:** 2026-08-04  
**Code:** `services/ux-journey-agent/perception.py` · `try_before_abandon_required`  
**Env:** `UX_JOURNEY_TRY_BEFORE_ABANDON` (default **3**, was 1)  
**Tests:** `test_perception.py` (`test_try_before_abandon_*`)

## Why

Staging try-then-quit smoke landed impatient Alex at **3** steps. Human EBM band for Lab B wants more exploratory try before quit → target **4–6** steps, without collapsing Sam contrast (patient still higher budget).

## Defaults (env unset)

| Persona | Try budget |
|---------|------------|
| Impatient `tp ≥ 0.75` | **3** |
| Mid | **4** |
| Patient `≤ 0.35` | **5** |
| + `exploration ≥ 0.65` | +1 (cap 6) |

Rough step estimate: `1 (navigate) + tries + 1 (done)` → Alex **5**, Sam **7**.

## Deploy

Agent image only (perception). Optional Coolify override:

```bash
UX_JOURNEY_TRY_BEFORE_ABANDON=3
```

## Verify

```bash
cd services/ux-journey-agent && python3 -m pytest test_perception.py test_confusion_abandon.py -q
```

Staging expect: Alex steps **4–6**, friction 7–10, Soft-Q≈2, Sam steps **> Alex**.
