# Audion shell width

**Date:** 2026-07-30

Audion overrides DS `.app-main` (`max-width: 1120px` + ultra-wide ladder) so the main stage always uses the full width available beside the rail:

```css
.app-main { max-width: none; width: 100%; }
.audion-magazine.briefing-detail { max-width: none; width: 100%; }
.audion-index { max-width: none; width: 100%; }
```

Reading measure for long copy stays on text blocks (lede, list body), not the article shell.

Project layout: `.audion-project-intro` = description (~2/3) + Team right (max 32rem); `.audion-project-split` = TG | Personas 50/50; Context below.
