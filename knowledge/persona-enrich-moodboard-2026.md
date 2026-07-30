# Persona Enrich + Moodboard — 2026 agent/LLM approach (AUDION v3)

**Date:** 2026-07-30  
**Status:** Magazine UI + Wave-2 stub/live proxy shipped  
**Related:** `knowledge/ai-workflows.md` · V2 inventory `AUDION-v2/knowledge/ai-trigger-buttons-inventory.md`

## Product goal

1. **Enrich** — fill / deepen interests, values, goals, frustrations, traits, communication from persona context (bio, segment, project research).
2. **Moodboard / Visuals** — generate style keywords + visual tiles aligned to the persona (magazine `visuals` band).

## How we would build this in mid-2026 (best practice)

### Architecture (not a single megaprompt)

```
Magazine UI
  → Next BFF (/api/ai/personas/…/enrich|moodboard)
    → persona-api (structured LLM jobs) + optional image worker
      → Qdrant / project research (RAG) when available
```

| Layer | 2026 practice | AUDION mapping |
|-------|----------------|----------------|
| **Orchestration** | Tool-calling agent or thin job graph (LangGraph-class); model routing (cheap for field chips, flagship for enrich batch) | V2 already batches enrich via `AiAssistService` templates; v3 proxies that job |
| **Structured outputs** | Native JSON Schema / tool schemas (OpenAI strict, Anthropic tools, Instructor/BAML) — not “please return JSON” | Enrich merges typed fields into profile; moodboard tiles are typed records |
| **Memory / context** | Persona core (stable attributes) + semantic RAG (docs/research) + episodic (prior UX runs) | Enrich body may include `profile_overlay` + locale; research optional via project |
| **Moodboard generation** | Multimodal pipeline: brief → keywords → tile prompts → image gen → lockable tiles | V2: `POST …/moodboards` + Celery `moodboard.build`; v3 magazine maps to `visuals` |
| **Human-in-the-loop** | Suggest → review → Apply (never silent overwrite of locked tiles) | Field Suggest already; Enrich applies with refresh; moodboard stub replaces unlocked fixtures only |
| **Eval** | Sample CI + production: schema validity, duplicate rate, locale, identity drift on portraits | Fixture tests + live smoke with `NEXT_PERSONA_DATA_SOURCE=api` |

### Enrich pattern (recommended)

1. **Retrieve** — persona profile + optional project research chunks (Agentic RAG when context thin).
2. **Generate per facet** with separate templates (`persona.interests`, `persona.values`, …) — parallelizable; keeps schemas tight.
3. **Merge** with deterministic rules (dedupe, max_items, preserve user locks).
4. **Optional bilingual pass** (`output_locale` / `profile_de`) as a second structured call — not mixed into the same freeform blob.
5. **UI** — Apply + undo; show which facets changed.

Research anchors (2026): structured-output defaults across providers; PersonaAgent-style memory↔action loop ([ACL Findings 2026](https://aclanthology.org/2026.findings-acl.1315/)); PersonaVLM core/semantic/episodic/procedural memory for long-lived personas (CVPR 2026).

### Moodboard pattern (recommended)

1. **Think** — derive visual brief from enrich traits + channels + color palette.
2. **Recaption** — explicit keywords (materials, lighting, UI chrome) before image gen (OmniPersona-style knowledge replay / grounded prompts).
3. **Generate tiles** — one prompt per category (`portrait`, `tone`, `material`, `ui`, `space`); lock user-edited tiles on rebuild.
4. **Store** — tile URLs + captions; magazine reads `PersonaVisuals`.

Do **not** one-shot “make a moodboard” without intermediate keywords — identity drift and generic stock looks.

### What v3 ships today

| Workflow | Next | Upstream | UI |
|----------|------|----------|-----|
| `enrichPersona` | `POST /api/ai/personas/[id]/enrich` | `POST /personas/{id}/enrich` | Topbar **Enrich with AI** (confirm) |
| `generateMoodboard` | `POST /api/ai/personas/[id]/moodboard/generate` | `POST /api/persona-admin/{id}/moodboards` | Visuals **Generate moodboard** |

Modes: same as Wave 2 (`fixtures` stub · `auto` live→stub · `api` live-only).

### 2026 practice refresh (Jul 2026)

- Treat enrich facets as **versioned persona fragments** (core + task overlays), not one megaprompt.
- Moodboard: extract structured visual brief first (palette / lighting / texture / composition / type / emotion) → then tile prompts; keep a growing **negative prompt** per project to fight drift.
- Prefer **schema-constrained** outputs (Instructor / Zod response_format) + post validators over freeform JSON.
- HITL: confirm batch enrich; never overwrite locked tiles silently.

### Deferred (still P1/P2)

- Full bilingual `profile_de` round-trip in magazine
- Live tile image URLs mapped into public share CDN
- Locked-tile rebuild semantics in magazine UI
- Docs/knowledge CRUD for persona RAG
- Dedicated eval harness for enrich quality
