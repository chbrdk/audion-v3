# CloudFront 403 on Bosch eBike (not Cloudflare)

**Date:** 2026-08-03  
**Symptom:** UX wave runs tagged `cloudfront_403` / `validEvidence: false` against `https://www.bosch-ebike.com/...`

## Clarification

The blocker label says `cloudfront_403` because the edge is **AWS CloudFront** (response header `server: CloudFront`), not Cloudflare. The UI/docs sometimes say “Cloudflare” colloquially.

## Where the label comes from (AUDION)

`apps/web/lib/ux-wave-scorecard.ts` → `inferInfrastructureBlockers()` matches:

`\b403\b|cloudfront|access.?denied|request.?blocked`

in agent summary / error / step text → blocker `cloudfront_403` → often `validEvidence: false` even if `agentSuccess: true`.

## Root cause (verified 2026-08-03)

Probed live URL `https://www.bosch-ebike.com/de/service/produktkombinationen`:

| User-Agent | HTTP | Notes |
|---|---|---|
| `node` | **403** | CloudFront “Request blocked.” |
| `… HeadlessChrome/120…` | **403** | Same WAF block |
| Normal Chrome / Playwright-style Chrome UA (no Headless) | **200** | Real page |
| `curl/8.0` | **200** | (can vary by IP/cache) |

So Bosch CloudFront WAF blocks **bot / headless** User-Agents. The UX Journey Agent runs Playwright/Chromium **headless** on Coolify; default headless UA still contains `HeadlessChrome` → page is the CloudFront error HTML → scorecard tags `cloudfront_403`.

Research crawl already works around this via `paths.researchCrawlUserAgent` (browser-like, no `HeadlessChrome`). The journey agent did **not** set an equivalent `BrowserProfile.user_agent` by default.

## Fix (2026-08-03)

1. `services/ux-journey-agent/browser_ua.py` — `resolve_browser_user_agent()` default desktop Chrome UA (rejects `HeadlessChrome` overrides).
2. `main.py` `run_agent` passes `user_agent=` into `Browser(...)`.
3. Central refs: `paths.uxJourneyBrowserUserAgent` · env `UX_JOURNEY_USER_AGENT` · tests `test_browser_ua.py`.
4. After agent Coolify deploy: force-restart Bosch wave (`POST …/start` with `{ "force": true }`).

## Related

- `knowledge/project-research-sse-2026.md` (crawl UA)
- `knowledge/paths.md` · `knowledge/deploy-urls.md`
- Fixture EBM path can still hardcode 403 on some runs (`ux-study-store`) — separate from live agent.
