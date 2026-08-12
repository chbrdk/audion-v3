# UX Journey Perception-in-the-Loop

**Status:** Accepted — 2026-08-03  
**Knowledge:** `knowledge/ux-journey-perception-in-loop.md`  
**Agent:** `services/ux-journey-agent/perception.py` + `main.py`  
**Legacy:** `specs/domain/ux-journey-think-aloud.md` (`<<THINK_ALOUD>>` still parsed → mapped)

## Product rule

Perception happens **before** action in the same step. Persona filters what is noticed. Non-perception (blind spots) must influence the decision in-loop — not a post-hoc judge.

## Wire format

Emitted inside `thinking`:

```text
<<PERCEPTION>>{…json…}<</PERCEPTION>>
```

### Required / validated fields

| Field | Type | Notes |
|-------|------|--------|
| `taskReminder` | string | What I am trying to do now |
| `noticed` | `{what, where?, relevance}[]` | Cap = salience budget |
| `ignoredGuess` | string \| null | What I skip / do not check |
| `think` | string | Interpretation, first person |
| `clarity` | 0–3 | 0 = lost, 3 = clear enough to act |
| `feel` | `{label, valence:-2..2}` | Affect |
| `confusion` | tag \| null | See tags below |
| `stance` | `proceed` \| `hesitate` \| `abandon` | Decision |
| `intent` | string | What I will do next (first person) |
| `why` | string | Justification |

### Natural voice (product)

`think`, `intent`, and `why` are **shopper think-aloud**, not UX-research notes.

- Use concrete UI nouns from `noticed` (Menü, Kategorie, Banner, Suchfeld, Button).
- Colloquial German, first person present — short sentences a real user would say aloud.
- **Forbidden in think/intent/why** (unless Lab-B destination tool with real grey/filter on screen):  
  `Filterursache`, `unklar warum`, `Erklärung zur Ursache`, `Seitencheck`, `sichtbare Bereiche prüfen`, `keine sichere Antwort`, `Ursache unklar`.
- `confusion` tags are **internal** — do not copy tag names or template phrases into persona channels.
- Runtime `humanize_perception_voice` rewrites research-script stubs before UI mapping.

### Confusion tags

`disabled_option_unexplained` | `filter_cause_unknown` | `selection_order_surprise`

### Relevance

`high` | `med` | `low`

## Salience budget (persona)

| `time_pressure` | Budget (max `noticed`) |
|-----------------|------------------------|
| ≥ 0.75 | 3 |
| ≤ 0.35 | 6 |
| else | 4 |

Extra −1 when `detail_orientation` < 0.35 (min 2). Extra +1 when ≥ 0.75 (max 7).

## Gate (runtime)

1. **P4.1 — no synthesize:** Missing/invalid `<<PERCEPTION>>` → nudge + clear `done`/`click`/… (soft wait/scroll only). Retries via `UX_JOURNEY_PERCEPTION_MISSING_RETRIES` (default 3). **Never** invent a perception from free-form thinking. **Never** force `DoneAgentOutput` solely because the block is missing.  
2. `stance=abandon` → only `done` allowed (still requires a valid PERCEPTION on that turn).  
3. `stance=hesitate` → only `scroll` / `wait` / `extract` (no deep `click`/`input`/`navigate`).  
4. `stance=proceed` → normal actions; soft intent↔target overlap (P2).  
5. **Impatient upgrade with try-then-quit:** `time_pressure ≥ 0.75` + (`confusion` tag or clarity≤1) + grey/filter signal → prefer abandon, but first require `UX_JOURNEY_TRY_BEFORE_ABANDON` (default **4**) exploratory hesitate/scroll/click (`stanceSoftened`) so impatient runs typically land ~**5–7** steps (human “kämpfendes Drittel” band — not instant 2–3-step quit). After budget + persistent low clarity → force `stance=abandon`. Intent-align thrash upgrades to abandon only after try budget. Patient personas keep a higher try budget (Sam contrast).  

5b. **Browse / find explore-before-abandon:** For tasks that ask to **look/search/find** something on a site (e.g. “suche nach Grillplatte”, “auf der Seite finden”) — and while the target is not yet in URL or `noticed` — **block `stance=abandon`** until at least `UX_JOURNEY_BROWSE_MIN_SCROLLS` (default **2**) downward `scroll` actions have run. Soften to `hesitate`/`proceed` with scroll intent (`browseExploreRequired`). Does **not** apply on Lab-B destination-tool surfaces (`lab_b_gold_context_allowed`). Path-finding home still uses § UI path-finding; this gate covers chat-inspect / simple product finds that lack Lab path cues.

5c. **Browse / find explore-before-site-search (category-first):** Same browse/find tasks as 5b. Until site-search is **unlocked**, runtime **strips** site-search actions (`input`/`type`/`send_keys`, and clicks whose target looks like Suche/Search/Suchfeld). Unlock when any of: target visible in URL/`noticed`, `browseScrollAttempts ≥ UX_JOURNEY_BROWSE_MIN_SCROLLS`, or ≥1 **category/nav click** from `noticed` / task category hints. Soft category hints (e.g. Grillplatte/Pizzastein → Garten/Outdoor/Grill) are injected into the perception prompt and onto softened perception (`browseCategoryHints`). While `browseExploreRequired` / early browse phase: `stance=hesitate` may keep a **category click** that overlaps hints or category-ish `noticed` (not only scroll/wait). Blind mega-menu thrash is still discouraged via intent-align + path rules; preferred sequence is **see → infer category → scroll or click that category → only then site search**. Lab-B destination-tool surfaces stay exempt.

6. Noticed enrich: cues already in perception think/why/intent may be promoted into `noticed[]` up to salience budget (no invented UI, no free-thinking invent).  
7. L2 regex confusion-abandon remains safety net — also gated on try-then-quit exploratory budget.  
8. Felt-state continuity: `clarityTrend` / `exploratoryAttempts` injected next step; prefer abandon when clarity stays low across steps after try budget.

## UI path-finding (site-agnostic)

For tasks that ask the persona to **find a destination via the UI** (start on home / “finde den Weg” / “nicht direkt im Tool”), runtime steers like a real user: visible labels and menus only — no site allowlists, no invented deep links.

1. While the current URL does not yet contain **task-derived target keywords**, treat the problem as **path-finding first**, not destination-tool interpretation.
2. Keywords (openers + targets) come **only from the task text** (e.g. Service, Beratung, Produktkombinationen). Do not inject brand- or fixture-only defaults.
3. If a selector-map node exposes the target (visible preferred; hidden mega-menu href still allowed), prefer a direct indexed `click`.
4. Otherwise prefer opening the nearest matching nav label. Aggregated top-nav nodes use a **coordinate-only** click near the matching label — never the removed 0.13.x `hover` tool and never index+coords together. Remap viewport CSS coords into LLM screenshot space before click when the runtime scales LLM→viewport.
5. **Menu-open (hover-equivalent):** Before any LLM click on path-home, emit one CDP `mouseMoved` at opener coords (selector-map bounds, or a synthetic top-strip fallback from task opener keywords). Follow with `wait(2)` whose ActionModel payload is **seconds-only** (coords stay on the CDP call — attaching them to `wait` fails validation and drops the steer). Evaluate `mouseover`/`mouseenter` remains a last resort. Opener index clicks must not target rootish `/` / `/de/` home links.
6. **Two-phase open→target:** After opener hover/`menu_wait`, prefer an on-page destination link via `evaluate` click on `a[href*=target]` (incl. shadow roots) — this follows a real page link, not a forbidden `navigate` deeplink. Then hub `/…/service/…`, then CDP/coords. Do not thrash the same opener coords.
7. Cookie/consent dismiss clicks take priority over nav DOM steering and over `minSteps` scroll fallbacks.
8. Self-loop root/home links never count as path progress — filter them from the first try, including **index clicks whose selector-map href is rootish** (logo) even when the action JSON has no `/de/` string.
9. **Path-finding home perception:** Do not invent destination-tool Filter / grau / „unklar warum“ cues while still on home. Confusion-abandon cues from those hallucinations must not burn the try-then-quit budget before real menu attempts.
10. **Forbidden while path-finding:** `navigate` / `go_to_url` (or equivalent) whose destination already encodes the target keywords. Initial study start URL load stays allowed. Honest abandon / `done` after try-then-quit remains a valid study outcome.
11. After a failed coordinate open, prefer a **different** visible control or shifted top-strip click — do not repeat the same coords, then deep-link.
12. Stop deterministic steering once the target surface is reached (URL matches target keywords) or the exploratory nav budget is spent.

## Step payload

```ts
step.perception  // full validated object
step.thinkAloud  // legacy alias mapped from perception (seen←noticed digest, next←intent, …)
```

## Felt-state memory

Cross-step digest injected into the next user context:

`clarityTrend`, `lastValence`, `confusionCount`, `openQuestions[]`, `lastNoticedDigest`, `exploratoryAttempts`, `lowClarityStreak`

## Soft-Q

Evaluate Soft-Q drafts use perception `confusion` / low clarity / negative valence from validEvidence **findings** (and caveats). When the synced finding is generic, Sync must prefer done-step / Think-Aloud / perception markers via `resolveFindingFromAgentResult` so L6 rule draft can fill Q2/Q3. High friction (≥7) alone still drafts Q2≈2 even without an explicit confusion tag. Evaluate must not leave the scenario-pack null Soft-Q shell in place when validEvidence runs exist — merge keeps hand edits only.

**Path-finding / Nav H3:** Agent result must include `finalUrl` (and `deeplinkCheat` when applicable). Sync maps these onto the wave run. For UI path-finding tasks, URL match to task target keywords overrides a pessimistic LLM `coverage.goalReached`. Soft-Q **Q4** drafts from Nav runs’ `goalReached`/`finalUrl`. Evaluate applies `applyNavH3HypothesisFromRuns` (landing → H3 refuted; miss → supported).
