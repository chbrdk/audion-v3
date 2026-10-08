# Behavioral Controller — operator notes

**Spec:** `specs/domain/behavioral-controller.md`  
**Compile:** `apps/web/lib/behavior/compile-behavioral-policy.ts`  
**Contracts:** `packages/contracts/src/behavioral-policy.ts`  
**Tests:** `apps/web/__tests__/compile-behavioral-policy.test.ts`  
**Fidelity landscape:** `knowledge/human-behavior-fidelity-options-2026-10.md`

## Why

Persona traits, journey knobs, chat voice rules, and Tavus PAL prompts were interpreting the same human differently. Enterprise fidelity needs **one compiled policy** driven by magazine + optional TG priors, then surface adapters.

## Compile inputs → knobs

| Magazine / TG | Policy knobs (examples) |
|---------------|-------------------------|
| `traits` (Impatient, Thorough, Skeptical, …) | timePressure, detailOrientation, trustSkepticism, warmth, affectVolatility |
| `journeyBehavior.dimensionOverrides` | wins over traits |
| `techLiteracy`, `confidence`, `attentionSpan` | techLiteracy, confidence, attentionCapacity |
| `communicationStyle` | trustSkepticism, vocabulary, sentenceStructure |
| `goals` / `frustrations` / `stressTriggers` / `motivations` | qualitative envelope |
| `TargetGroupBehavioralPriors` | soft blend when persona knob is default; shared avoidances/triggers |

## Surfaces (wiring phases)

| Surface | Adapter use | Phase |
|---------|-------------|-------|
| **Chat** | `chat-adapter.ts` + `compilePolicyForPersona` (TG-aware) in prompts/stream | **2 done** |
| **Chat session** | `chat-session.ts` ticks + live envelope; **durable** in messages jsonb | **3 + 3b done** |
| **Video** | `video-adapter.ts` PAL rules; `video-session.ts` seeds from chat affect mirror | **4 + bridge done** |
| **Browse** | `browse-adapter.ts` via `resolveAgentPersonaContext` | **1b done** |
| **TG priors** | `tg-priors.ts` + `target_groups.behavioral_priors` jsonb | **5 done** |
| **Gold scoreboard** | `gold-scoreboard.ts` · `gold-store.ts` · `/studies/behavioral` · `GET/POST /api/behavioral/scoreboard` | **6 done** |
| **Reply rationale** | `reply-rationale.ts` · `chat-reply-rationale.tsx` above assistant answers | **7 done** |
| **TG priors editor** | `TargetGroupEditDialog` band · `tg-priors-form.ts` | **8a done** |
| **Gold mark UI** | `/studies/behavioral` expand + PATCH relabel | **8b done** |
| **Chat dynamics** | `chat-dynamics.ts` · stream `behavior` + live envelope modes | **9 done** |

## Transparency (chat)

Collapsed **Why this reply** strip on completed persona-chat assistant turns. Data = compiled drivers + live stance (not model self-report). Guest embed hides it. Magazine edits (traits / journey dims) remain the control surface; this strip only **explains**.

**TG:** Edit dialog → Behavioral priors (blend + dim meters + cues/stress/avoid). Empty clears explicit priors.  
**Gold:** Studies → Behavioral gold → expand policy → Mark as human gold (PATCH).

## Session FSM

Chat: `loadOrInitChatBehavioralSession` → tick → `persistChatBehavioralSession` (memory + jsonb + `persona-affect-mirror`).  
Video start: `prepareVideoCallBehavioralContext` reads mirror so Facetime inherits chat mood.

## Audit

`policyId` + `schemaVersion` + per-knob `citations` — attach to journey jobs / chat threads / video sessions when wiring.

## Do not

- Re-derive trait→behavior differently inside chat prompts vs journey agent.
- Use GUI grounding models as the persona decision brain.
- Claim “near human” without human-gold correlation against these knobs.
