# CHECKION fetch-page for AUDION research

**Status:** Accepted — 2026-08-03  
**CHECKION API:** `specs/api/fetch-page.md` (checkion-v3)  
**Related:** `knowledge/project-research-sse-2026.md` · `specs/domain/checkion-single-scan-trigger.md`

## Purpose

When AUDION’s HTTP research crawl is blocked (CloudFront 403 / WAF), fall back to CHECKION’s thin Chromium `POST /api/fetch-page` for the **same seed URL** — text only, not a WCAG scan.

## Ownership

| Concern | Owner |
|---------|--------|
| Research job + synthesize | AUDION |
| Chromium navigation + bot-guard text | CHECKION `fetch-page` |
| Full a11y scan | CHECKION `POST /api/scans` (unchanged) |

## AUDION config

| Env | Role |
|-----|------|
| `NEXT_PUBLIC_CHECKION_BASE_URL` / `NEXT_PUBLIC_CHECKION_URL` / `NEXT_CHECKION_BASE_URL` | CHECKION origin |
| `CHECKION_API_TOKEN` | Bearer `checkion_…` for machine call |

Keys on `paths`: `envCheckionApiToken`, `checkionApiFetchPage`, `checkionFetchPageTimeoutMs`.

## Flow

1. HTTP crawl seed (browser-like UA).  
2. If seed blocked/failed and CHECKION configured → `POST {CHECKION}/api/fetch-page`.  
3. Continue host URL fallbacks (Presse etc.) as today.  
4. Synthesize from combined ok pages.

## Non-goals

- Replacing Easy Setup URL fetch  
- Domain crawl / GEO / full scan on research start  
- Using `X-Service-Secret` for fetch-page
