# Journey phase AI + validation — audion-v3

**Date:** 2026-07-30  
**Status:** Magazine Wave-2 slice  
**Related:** `knowledge/ai-workflows.md` · `knowledge/journeys-chat-gaps.md` · V2 `POST /journeys/{id}/ai/generate` · `POST /journeys/{id}/validate`

## Product goal

1. **Phase moments** — fill empty (or deepen) phase moments from `journey.moments` template.
2. **Validate** — rule-based fit report of journey vs selected persona (not LLM).

## 2026 pattern

| Concern | Practice | Mapping |
|---------|----------|---------|
| Moments | Structured suggestions → merge into phase elements; HITL when phase already has moments | Confirm if non-empty; stub/live apply via journey store / magazine PATCH |
| Validate | Deterministic scorer + explainable friction (V2 `JourneyValidationService`) | Proxy `validate`; stub scores from element density + persona goals/pains |
| Orchestration | Thin BFF, not a megaprompt agent | `withAiLiveOrStub` |

## Shipped

| Workflow | Next | Upstream |
|----------|------|----------|
| `generateJourneyPhaseMoments` | `POST /api/ai/journeys/[id]/phase/generate` | `POST /journeys/{id}/ai/generate` (`template_id: journey.moments`) |
| `validateJourney` | `POST /api/ai/journeys/[id]/validate` | `POST /journeys/{id}/validate` |

UI: phase slide **Generate moments**; journey topbar **Validate**.

## Deferred

- GET `validation-report` cache / history
- Chat-mode validation
- Per-element kind AI (`journey.phase.create` / name)
