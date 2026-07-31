# UX Journey Agent surface (audion-v3)

**Date:** 2026-07-31  
**Decision:** V3 owns the browser agent under `services/ux-journey-agent/`. There is **no** dedicated `/admin/ux-journey-agent` page. Product entries:

1. **Chat** — `inspect_website` HITL → live agent → convert  
2. **Studies → Wave → Start / Sync** — same agent for wave runs  

## Contract

| Action | Where | Behavior |
|--------|--------|----------|
| Inspect URL | Chat Approve | When `UX_JOURNEY_AGENT_URL` set: real browser job; else fixture fake progress |
| Live viewport | Chat during run | BFF `/api/ux-journey-agent/run/{jobId}/live` (+ stream) |
| Convert | Chat / Wave run panel | Evidence-rich `journey.from_ux_run` + deterministic fallback |
| Start agent jobs | Wave **Start** | Starts one agent job per run URL when agent configured |
| Poll progress | Wave **Sync** | Polls agent job status into run fields |

## Service

- Code: `services/ux-journey-agent/` (FastAPI + `audion-agent` soft fork)
- Auth: `UX_JOURNEY_AGENT_SECRET` (header `X-UX-Journey-Secret`)
- SSRF: blocks private/link-local/metadata hosts
- Soft-fork baseline: `0.12.6+audion.8` (tracking upstream `0.13.7` — see `services/ux-journey-agent/REBASE.md`)

## Env (web)

```bash
UX_JOURNEY_AGENT_URL=http://audion-v3-ux-journey-agent:8320
UX_JOURNEY_AGENT_SECRET=<shared>
```

## Paths

- Agent client: `apps/web/lib/ux-journey-agent-client.ts`
- Live inspect: `apps/web/lib/chat/inspect-website-live.ts`
- Convert: `apps/web/lib/journey-from-ux-run.ts`
- Studies: `apps/web/lib/ux-studies-native.ts`
- Deploy: `knowledge/deploy-urls.md`
