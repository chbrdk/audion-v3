# Perception natural voice (2026-08-12)

## Problem

Step cards showed research-script copy (`Filterursache unklar`, `Ohne Erklärung zur Ursache bleibe ich unsicher`, `sichtbaren Seitencheck`) — copied from prompt examples and runtime gate softeners, not real shopper think-aloud.

## Fix

- **Prompt:** Browse/find sample (Grillplatte); Lab-B sample uses colloquial German; explicit anti-patterns for UX jargon.
- **Runtime:** `humanize_perception_voice()` in `finalize_perception_for_persona` rewrites script stubs from `noticed[]` + task goal.
- **Gates:** `_soften_browse_explore`, `_soften_to_hesitate`, `_hard_upgrade_abandon`, `scope_nav_home_perception` use natural copy.
- **Browse impatient completion_block** no longer pushes grey/filter Lab language.

## Spec

`specs/domain/ux-journey-perception.md` § Natural voice

## Code

`services/ux-journey-agent/perception.py` · `main.py` (completion_block + `task=` on prompt)
