# UX Journey — Click/Hover steering harden (2026-08-20)

**Trigger:** Vision smoke (`knowledge/lab-staging-smoke-luna-vision-2026-08-20.md`) — Vision ok, but C wrongly hubbed to `/routenplanung-navigation` via meta-keyword `navigation`; D/F skipped path-finding gate.

## Changes

| Lever | Fix |
|-------|-----|
| Opener keywords | Drop meta `navigation`/`menü`/`menu`; prefer quoted labels; add UEQ tokens (Service, Über uns, Technik, …) |
| Target keywords | Quoted labels + `ueber-uns`/`unternehmen`/`service`/… |
| Path-finding gate | Also true for „Öffne … in der Navigation“ |
| Hub evaluate | Segment-aware score; penalize `…-navigation` substring hits |
| `scope_nav_home_perception` | Merge Vision `noticed`, don't wipe |
| `menuHoverCoords` | Store viewport CSS px for CDP click sweep |
| Fail buckets | Don't treat task boilerplate „blockierter Navigation“ as `click_blocked` |
| Destination quality (2026-08-26) | Penalize newsletter/UTM CTAs in hub/target evaluate; boost help/wartung/ersatzteil; bucket `goal_soft` for soft service landings |

## Verify

```bash
cd services/ux-journey-agent && python -m pytest test_perception.py -q -k 'path_finding or nav_open or keyword or scope_nav or select_nav'
```

Redeploy agent; re-smoke C,D,E,F.
