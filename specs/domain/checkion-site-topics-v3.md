# CHECKION site topics — audion-v3 port

**Status:** Accepted — Wave 2 (2026-09-02)  
**Reference v2:** `AUDION-v2/knowledge/checkion-site-topics.md`  
**CHECKION v3 input:** `GET /api/domain-scans/:id/pages` (`checkion-v3/specs/api/domain-scan-pages.md`)

## Goal

Restore **CHECKION_SITE_TOPICS** prompt block and admin UI section for audion-v3 Collections, fed from v3 corpus pages + `classification.tags` (not v2 slim-pages).

## Endpoint

`GET /api/projects/:projectId/integrations/checkion/site-topics`

Query: `seed_url?`, `max_pages?` (default 400, max 2000)

Response (parity v2):

```typescript
{
  scan_id: string | null
  source: 'checkion_project' | 'by_domain'
  topics: Array<{ tag: string; page_count: number; weight_sum: number; median_score?: number }>
  pages_processed: number
  truncated: boolean
  seed_url_used?: string
  unavailable_reason?: string
}
```

## Resolution

1. Linked CHECKION mirror project via platform provisioning.
2. Latest **completed** domain scan for project (or matching `seed_url` host).
3. Paginate `domain-scans/:id/pages`; aggregate tags from `classification.tags`.
4. If no tags on any page → `unavailable_reason=no_tags_in_corpus` (distinct from v2 `no_tags_in_slim_pages`).

## Consumers

- AUDION suggest personas / target groups (prompt block)
- Plexon `persona_page_relevance` ranker (tag overlap boost)
- Project admin panel section „Site topics (CHECKION)“

## MCP (optional W2-A5)

`audion.project_checkion_site_topics` on audion-v3 MCP server.

## Tests

- Fixture corpus with tags → top tag counts
- Empty classification → unavailable_reason
- Linked project without scan → `no_scan`
