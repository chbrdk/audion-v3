# Persona magazine character (ECHON parity)

AUDION persona UI should read like ECHON briefing/signal magazine pages — not an admin form or dual-pane list/detail.

## Index (`/personas`)

- Portrait grid (not a left rail list)
- Each card: full-bleed portrait, eyebrow, display name, role, status facet
- Filter search above the grid

## Detail (`/personas/[id]`)

1. Magazine topbar — edit actions only (right); no briefing-nav crumbs / no shell page-lead  
2. Compact hero grid: **editable portrait** (URL + AI generate) | title + ECHON `geo-places` gradient facet tiles (location, age, gender, attention, archetype, status)  
3. Soft lede (bio)  
4. Body bands (magazine, not v2 glass):
   - Traits — editable meters (label + score 0–100)
   - Interests | Values — editable lists (same as Goals)
   - Communication — editable structure + vocabulary chips; Tone layout also has open↔skeptical dial
   - Goals | Frustrations — editable lists
   - Channels (bubbles)
   - Notes — editable Accordion + TipTap cards (same pattern as project knowledge)
   - Visuals — editable style keywords + moodboard tiles (PATCH `{ visuals }`)
5. Avoid bold list leaders and oversized drop numerals — content will grow

## Width

- `.app-main` and `.audion-magazine.briefing-detail` are **uncapped** (`max-width: none`) so pages fill the stage next to the rail.
- Long-form reading measure stays on text blocks (lede, list body), not the article shell.

## Inline list editing

- Goals / Frustrations / Interests / Values: click text → inline input; Enter/blur saves; Esc cancels; hover expands card with bottom **Add item** row; delete confirms via `Dialog`
- Traits: click label → rename; score via range slider (0–100, stored 0–1); Add item / delete; PATCH `{ traits }`
- Communication: layout switcher **Quote** (pull-quote + vocabulary chips) / **Tone** (caption + open↔skeptical dial + chips); both editable; PATCH `{ communicationStyle }`
  Preference: `paths.commLayoutStorageKey` (sessionStorage)
- Notes: Accordion cards; TipTap body; PATCH `{ sections }`
- Visuals: click keyword → edit/remove; **+ Keyword**; click tile → category/caption/imageUrl; **Add tile** / remove; always shown (empty state); PATCH `{ visuals }`
- Portrait: click → Image URL overlay; **Generate** (AI stub); Clear → initials; PATCH `{ avatarUrl }`
- Field AI: **Suggest** on Interests / Values / Goals / Frustrations / Traits; Communication **Suggest vocab** + **Suggest structure** — dialog accept → merge + PATCH
- Persist goals/frustrations as objects; interests/values as `string[]` via PATCH
- Channels: bubble row; click / right-click → icon picker
- Topbar Edit dialog = **profile only** (name/role/status/bio/facets) — lists/channels/traits/communication/notes/visuals/portrait live on the magazine
- `socialMediaUsage` stays in the contract/fixtures but is **not** rendered as a separate magazine band (channels cover touchpoints)

## Source of truth

- CSS: `apps/web/app/globals.css` (`.audion-magazine-*`, `.audion-editable-list*`, `.audion-editable-traits*`, `.audion-editable-comm*`, `.audion-editable-visuals*`, `.audion-editable-portrait*`, `.audion-channel-*`)
- Markup: `persona-list-panel.tsx`, `persona-detail-panel.tsx`, `persona-editable-list.tsx`, `persona-editable-traits.tsx`, `persona-editable-communication.tsx`, `persona-editable-notes.tsx`, `persona-editable-visuals.tsx`, `persona-editable-portrait.tsx`, `persona-channel-bubbles.tsx`
- Helpers: `lib/persona-notes.ts`, `lib/persona-visuals.ts`
- Avatar / visual paths: `paths.personaAvatarBasePath`, `paths.personaVisualBasePath`

## Out of scope

KPI strip, pipeline panel, side-by-side personas list on detail, v2 sticky-note / glass chip chrome, knowledge/documents CRUD, moodboard generate, bilingual `profile_de`, live chat-api avatar proxy (stub only).
