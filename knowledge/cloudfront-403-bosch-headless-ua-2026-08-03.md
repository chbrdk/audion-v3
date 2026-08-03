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
2. `main.py` `run_agent` passes `user_agent=` + `headers.User-Agent` into `Browser(...)`.
3. `/health` exposes `browserUserAgent` + `browserUserAgentSafe` (Coolify deploy probe).
4. Central refs: `paths.uxJourneyBrowserUserAgent` · env `UX_JOURNEY_USER_AGENT` · tests `test_browser_ua.py` · `test_health_ua.py`.
5. Force-restart hardened in `startUxWaveNativeOrFixture` (no longer re-enters `storeStartUxWave`, which preserves `complete`).
6. After agent Coolify deploy (`browserUserAgentSafe: true` on `https://uxagent.projects-a.plygrnd.tech/health`): `POST …/start` with `{ "force": true }`.

### Deploy note (2026-08-03)

Git push to `main` (`a1d6e1d`, `3d6ee02`) did **not** auto-roll staging within ~5+ minutes:

- Agent `/health` still missing `browserUserAgent` / `browserUserAgentSafe`
- Web start response still missing `forceApplied`

**Action:** manually Redeploy Coolify apps `audion-v3-ux-journey-agent` **and** `audion-v3-web`, then force-restart the Bosch wave. Verify agent first:

```bash
curl -sS https://uxagent.projects-a.plygrnd.tech/health | jq '{browserUserAgentSafe,browserUserAgent}'
# expect browserUserAgentSafe: true
```

## Related

- `knowledge/project-research-sse-2026.md` (crawl UA)
- `knowledge/paths.md` · `knowledge/deploy-urls.md`
- Fixture EBM path can still hardcode 403 on some runs (`ux-study-store`) — separate from live agent.
