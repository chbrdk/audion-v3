# Target group — linked personas layout

**Surface:** TG detail magazine body (`TargetGroupLinkedPersonas`)  
**Component:** `apps/web/components/target-group-linked-personas.tsx`  
**Preference key:** `paths.tgLinkedPersonasLayoutKey` → `audion.v3.tgLinkedPersonasLayout` (sessionStorage)

## Modes

| Mode | Markup | Use |
|------|--------|-----|
| `cards` (default) | `ul.audion-tg-grid.audion-tg-grid--nested` + `audion-tg-card` | Same visual language as TG index |
| `list` | `ol.audion-magazine-list.audion-tg-linked-list` | Compact numbered magazine rows |

Toggle chrome matches communication band: `.audion-editable-comm-chrome` + `.audion-editable-comm-layout-switch` (Cards | List).

## Notes

- Preference is session-scoped (same pattern as `paths.commLayoutStorageKey`).
- Empty state has no switch.
- Links always go through `paths.routes.personaDetail(id)`.
