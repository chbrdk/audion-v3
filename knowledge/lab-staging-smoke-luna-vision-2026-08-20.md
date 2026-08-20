# Mini-smoke — Luna + Vision (post-deploy)

**Date:** 2026-08-20  
**Knowledge:** `knowledge/ux-agent-luna-vision-2026-08-20.md`  
**Runs:** `knowledge/ueq-ebike-runs/2026-08-20-vision-smoke/`  
**Buckets:** `knowledge/ux-journey-fail-buckets-vision-smoke-2026-08-20.json`  
**Agent health at run:** `openaiModel=gpt-5.6-luna`, `visionDetailLevel=high`, `useVision=true`

**Follow-up:** Click/Hover keyword hygiene landed in `knowledge/ux-agent-click-hover-steer-2026-08-20.md` (meta-`navigation` hub bug). Re-smoke after that deploy.

## Result (4 runs: C, D, E, F · max_steps=25)

| Run | Steps | finalUrl | Bucket |
|-----|------:|----------|--------|
| C UC2 Service | 8 | `/de/` (home) | `click_blocked` |
| D UC2 Technik | 8 | `/de/` (home) | `click_blocked` |
| E UC3 Über uns (Fahrer) | 17 | `/de/unternehmen/ueber-uns` | **`goal_ok`** |
| F UC3 Über uns (Interessent) | 9 | `/de/` (home) | `click_blocked` |

### vs Baseline C/D/E/F only (16 runs from 2026-08-19)

| Bucket | Baseline | Vision smoke |
|--------|---------:|-------------:|
| `goal_ok` | 12.5% | **25.0%** |
| `click_no_nav` | 62.5% | **0%** |
| `click_blocked` | 18.8% | 75.0% |
| `nav_hover` | 6.2% | 0% |

**Lesen:** URL-Goal-Rate leicht besser (1/4 vs 2/16); klarer Fortschritt bei UC3 Fahrer (Über-uns erreicht). Viele Misses landen jetzt in `click_blocked` statt `click_no_nav` — Vision sieht die Nav, Click/Hover-Steering greift noch nicht zuverlässig. n=4 ist nur Smoke, kein A/B.

## Preflight (done)

Deploy `3417f35` live; `/health` confirmed luna + vision high.

## Re-run

```bash
set -a && source services/ux-journey-agent/.env.local && set +a
UEQ_DATE=2026-08-20-vision-smoke UEQ_REPEATS=1 UEQ_MAX_STEPS=25 UEQ_MAX_STEPS_UC3=25 \
UEQ_ONLY_RUN='C,D,E,F' UEQ_FORCE_RERUN=1 \
bash scripts/run-ueq-ebike-batch.sh

python3 scripts/bucket-ux-journey-fail-reasons.py \
  knowledge/ueq-ebike-runs/2026-08-20-vision-smoke \
  --out knowledge/ux-journey-fail-buckets-vision-smoke-2026-08-20.json
```
