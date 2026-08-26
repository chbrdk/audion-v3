# UX Journey — Destination quality (2026-08-26)

**Trigger:** Hover-steer smoke landed C on `/service/…newsletter…` (URL-grounded “goal” but marketing CTA, not Help/Wartung).

## Rules

| Signal | Effect |
|--------|--------|
| `newsletter` / `utm_` / signup / promo in href or link text | −120 score |
| Service-intent task + help/wartung/ersatzteil/beratung/faq | +70 |
| Compact `/…/service` hub | +40 |
| Short non-CTA `/service/…` path | +25 |

Applied in Python (`destination_quality_adjust` / `_href_key_match_score`) and mirrored in hub/target evaluate JS (`qualityAdj`).

## Buckets

- `goal_ok` — URL matches task surface and is not a marketing CTA
- `goal_soft` — URL matches service-ish path but is newsletter/UTM/signup

## Smoke

```bash
UEQ_DATE=2026-08-26-quality UEQ_REPEATS=3 UEQ_ONLY_RUN='C,D,E,F' \
  UEQ_MAX_STEPS=25 UEQ_MAX_POLLS=180 UEQ_FORCE_RERUN=1 \
  ./scripts/run-ueq-ebike-batch.sh
python3 scripts/bucket-ux-journey-fail-reasons.py \
  knowledge/ueq-ebike-runs/2026-08-26-quality \
  --out knowledge/ux-journey-fail-buckets-quality-smoke-2026-08-26.json
```

### Result (n=12, commit `f81cba9`)

| Bucket | n | rate |
|--------|--:|-----:|
| `goal_ok` | 12 | **100%** |
| `goal_soft` | 0 | 0% |

C (Service) all three waves → `/de/service/zubehoer-nachruestung` (not newsletter). Prior hover-smoke C was `/service/…newsletter…?utm_…` → would now bucket `goal_soft`.

D: `produkte/uebersicht` ×1, `service/produktkombinationen` ×2. E/F: all `/unternehmen/ueber-uns`.
