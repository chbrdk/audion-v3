# Browse / find — explore before site-search (Gate 5c, 2026-08-12)

**Spec:** `specs/domain/ux-journey-perception.md` § Gate 5c  
**Code:** `services/ux-journey-agent/perception.py` · live gate in `main.py`  
**Related:** Gate 5b `knowledge/browse-explore-before-abandon-2026-08-12.md`  
**Tests:** `test_perception.py` (`test_browse_category_*`, `test_block_early_site_search_*`, `test_hesitate_allows_category_*`)

## Why

Chat inspect “suche nach Grillplatte / Pizzastein” jumped to the **site search box** first. Real shoppers often infer **Garten/Outdoor** and scroll or open that category. Gate 5b only forced scrolls before *abandon* — search remained the efficient shortcut.

## Rule

While browse/find and target not yet visible:

1. **Block site-search** (`input`/`type`, search-ish clicks) until unlock.
2. **Unlock** when any of: target in URL/`noticed`, `browseScrollAttempts ≥ UX_JOURNEY_BROWSE_MIN_SCROLLS`, or ≥1 category/nav click.
3. Soft **category hints** from task (Grillplatte/Pizzastein → garten/outdoor/grill) on prompt + softened perception (`browseCategoryHints`).
4. During explore: `hesitate` may keep a **category click** overlapping hints/`noticed` (not only scroll/wait).
5. Lab-B destination-tool surfaces remain exempt.

## Preferred sequence

see → infer category → scroll or click that category → only then site search.
