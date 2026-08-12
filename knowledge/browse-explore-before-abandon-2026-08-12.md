# Browse / find — explore-before-abandon (2026-08-12)

**Spec:** `specs/domain/ux-journey-perception.md` § Gate 5b  
**Code:** `services/ux-journey-agent/perception.py` · live gate in `main.py`  
**Env:** `UX_JOURNEY_BROWSE_MIN_SCROLLS` (default **2**)  
**Tests:** `test_perception.py` (`test_browse_explore_*`)

## Why

Chat inspect / simple finds (“suche auf der Seite nach einer Grillplatte”) were quitting after ~6 steps without scrolling the homepage. Lab try-then-quit + impatient abandon are tuned for **tool confusion** (grau/Filter), not for “scroll once and look for the category.”

## Rule

While the task is a **browse/find** task and the target is **not yet** in the URL or `noticed`:

1. Count downward `scroll` actions in `felt_state.browseScrollAttempts`.
2. If `browseScrollAttempts < UX_JOURNEY_BROWSE_MIN_SCROLLS` and model chooses `stance=abandon` → **soften** to hesitate/proceed with scroll intent (`browseExploreRequired`, `stanceSoftened`).
3. Gate rejects `done`-only on that turn and prefers a typed scroll fallback (same pattern as try-then-quit).
4. Once scrolls are done **or** target keyword appears in URL/`noticed`, normal abandon / try-then-quit applies.

**Out of scope / exempt:** Lab B destination tool (`lab_b_gold_context_allowed`) — keep grey-filter abandon behaviour.

## Task classifier

`is_browse_find_task`: cues like `suche nach`, `finde`, `gucke`/`schaue` `auf der Seite`, `look for`, plus UI path-finding tasks.  
Targets: `browse_find_target_keywords` (regex after “suche nach …” / existing `_task_target_keywords`).
