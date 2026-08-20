# Mini-smoke — Luna + Vision (post-deploy)

**Date:** 2026-08-20  
**Knowledge:** `knowledge/ux-agent-luna-vision-2026-08-20.md`  
**Baseline buckets:** `knowledge/ux-journey-fail-buckets-baseline-2026-08-19.json`  
(URL-grounded: goal_ok **8.3%**, click_no_nav **66.7%**, click_blocked **20.8%**, nav_hover **4.2%**)

## Preflight / Deploy

1. Push agent changes to the branch Coolify builds for `audion-v3-ux-journey-agent` (`lfv0921nlqzl0qow9xse4it4`).
2. Coolify env: `UX_JOURNEY_OPENAI_MODEL=gpt-5.6-luna` (key already present).  
   `UX_JOURNEY_VISION_DETAIL=high` is baked in Dockerfile; optional Coolify override.
3. Queue deploy (force rebuild recommended once).
4. Confirm health exposes new fields:
   ```bash
   curl -sS https://uxagent.projects-a.plygrnd.tech/health
   # expect: openaiModel=gpt-5.6-luna, visionDetailLevel=high, useVision=true
   ```
   Pre-change images omit `visionDetailLevel` — that means the new build is not live yet.

## Mini-wave (6 runs)

Site: `https://www.bosch-ebike.com/de/`  
Focus: UC2 Service + UC3 Über uns × Fahrer + Interessent.

```bash
export UX_JOURNEY_AGENT_SECRET='…'
UEQ_MAX_STEPS=25 UEQ_ONLY_RUN='C,D,E,F' bash scripts/run-ueq-ebike-batch.sh
# store under knowledge/ueq-ebike-runs/2026-08-20-vision-smoke/
```

## Compare

```bash
python3 scripts/bucket-ux-journey-fail-reasons.py \
  knowledge/ueq-ebike-runs/2026-08-20-vision-smoke \
  --out knowledge/ux-journey-fail-buckets-vision-smoke-2026-08-20.json
```

Success signal: higher `goal_ok` and/or lower `click_no_nav` vs. baseline JSON above.

## Notes

- Full 24-run UEQ re-score optional; smoke is enough to validate Vision detail + prompt.
- Do not use `gpt-4o-mini` for inference — use `gpt-5.6-luna`.
