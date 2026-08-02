# UX Journey Agent surface (audion-v3)

**Date:** 2026-08-01  
**Decision:** V3 owns the browser agent under `services/ux-journey-agent/`. There is **no** dedicated `/admin/ux-journey-agent` page. Product entries:

1. **Chat** — `inspect_website` HITL → live agent → convert  
2. **Studies → Wave → Start / Sync** — same agent for wave runs  

Think-aloud product schema: `specs/domain/ux-journey-think-aloud.md`.

## Contract

| Action | Where | Behavior |
|--------|--------|----------|
| Inspect URL | Chat Approve | When `UX_JOURNEY_AGENT_URL` set: real browser job; else fixture fake progress |
| Live viewport | Chat during run | BFF `/api/ux-journey-agent/run/{jobId}/live` (+ stream) |
| Convert | Chat / Wave run panel | Evidence-rich `journey.from_ux_run` + deterministic fallback |
| Start agent jobs | Wave **Start** | Starts one agent job per run URL when agent configured |
| Poll progress | Wave **Sync** | Polls agent job status into run fields |

## Persona → Agent (soft control)

Chat and Studies both send a **nested** `PersonaContext` via `toAgentPersonaContext` / `resolveAgentPersonaContext` (`apps/web/lib/chat/persona-agent-context.ts`). Flat BFF slices are obsolete.

Ideal payload shape (Agent `PersonaContext`):

```json
{
  "id": "persona-…",
  "name": "…",
  "headline": "role or archetype",
  "systemPrompt": "optional chat system prompt",
  "locale": "de",
  "profile": {
    "bio": "…",
    "location": "…",
    "values": ["…"],
    "interests": ["…"],
    "traits": ["Analytical: 0.82"],
    "painPoints": ["…"],
    "goals": ["…"],
    "channels": ["…"],
    "attentionSpan": "…",
    "confidence": 0.7,
    "techLiteracy": 0.8,
    "motivations": [{ "label": "…", "type": "intrinsic" }],
    "emotionalBaseline": "cautious",
    "stressTriggers": ["…"],
    "priorKnowledge": [{ "title": "…", "content": "…" }],
    "communicationStyle": { "vocabulary": [], "sentenceStructure": null, "skepticismLevel": null }
  },
  "dimensionOverrides": {
    "risk_aversion": 0.7,
    "time_pressure": 0.5,
    "exploration": 0.4,
    "detail_orientation": 0.9,
    "trust_skepticism": 0.8,
    "accessibility_need": 0.3
  },
  "dos": ["Prefer official nav"],
  "donts": ["Do not accept marketing cookies"],
  "heuristics": ["Prefer official nav over hero CTAs"],
  "extraInstructions": "…"
}
```

Product `PersonaDetail.journeyBehavior` maps into `dimensionOverrides` / `dos` / `donts` / `extraInstructions` / `heuristics`. All magazine `sections` plus knowledge feed `extraInstructions` / `priorKnowledge`.

Policy is **soft** (system prompt + heuristics each step). No hard click filters. Run results include `personaPolicy` (dimensions + heuristics); Chat inspect dock shows a quiet summary line plus compact scorecard when present.

## Think-aloud wire format

Each step’s `thinking` may include:

```text
<<THINK_ALOUD>>{"seen":"…","think":"…","priorKnow":"…","learned":"…","next":"…","why":"…","feel":{"label":"unsicher","valence":-1}}<</THINK_ALOUD>>
<<OBSERVATIONS>>[…]<</OBSERVATIONS>>
```

Parsed onto `step.thinkAloud` and `step.observations`; stripped from VO (`reasoning`).

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
- Persona mapper: `apps/web/lib/chat/persona-agent-context.ts`
- Live inspect: `apps/web/lib/chat/inspect-website-live.ts`
- Convert: `apps/web/lib/journey-from-ux-run.ts`
- Studies: `apps/web/lib/ux-studies-native.ts`
- Deploy: `knowledge/deploy-urls.md`

## Optional CHECKION single-page scan (spec only)

After Inspect / wave step URLs, AUDION may later offer a **single-page** CHECKION scan (not domain crawl, not Journey UI in CHECKION). Spec: `specs/domain/checkion-single-scan-trigger.md` · companion `checkion-v3/specs/domain/audion-journey-scan-trigger.md`. Does not change agent ownership or soft-fork policy above.
