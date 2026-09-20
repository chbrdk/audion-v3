# Humanize persona chat without dropping traits (2026-09-20)

**Context:** Corpus review of Vaillant GEO/Employer threads — personas sound like cooperative research assistants (meta U/BV/BR, mapping talk, long markdown) even though magazine traits exist.  
**Goal:** More human surface form **without** flattening goals/pains/traits/style.

## Status

**Implemented 2026-09-20** in adaptive prompt + native stream (see acceptance #16 in `specs/domain/chat-workspace.md`).

## Where to change (priority order)

Do **not** start with model fine-tuning. Personality SSOT is already magazine → adaptive prompt.

| Priority | Layer | Path | Why |
|----------|-------|------|-----|
| **1** | Chat rules (global) | `apps/web/lib/chat/adaptive-persona-chat-prompt.ts` → `chatRulesBlock()` · spec `specs/domain/chat-workspace.md` § Persona system prompt | Rules already ask for short turns; GEO tasks override them. Strengthen **anti-assistant** rules. |
| **2** | Task envelope (per turn) | `apps/web/lib/chat/native-stream.ts` (message assembly) | User prompts that dump U/BV/BR methodology pull the model into coach mode. Wrap researcher asks so the model answers **in character**, not as method helper. |
| **3** | Trait → surface form | same `adaptive-persona-chat-prompt.ts` → `traitBehaviorHint` / `styleRules` | Traits currently map to content habits (“ask for proof”) more than **form** (length, hedges, warmth, lists). |
| **4** | Custom voice overlay | Settings persona band → `persona_chat_prompts` · `ADAPTIVE_CUSTOM_VOICE_HEADING` | Per-persona catchphrases, dialect, “never use ## headings” — **overlay only**, never replace magazine. |
| **5** | Completions knobs | `native-stream.ts` `temperature` / `paths.chatCompletionMaxTokens` | Cap already 500; GEO still expands. Optional: lower max for “chat” vs raise only when user explicitly asks for lists. |
| **6** | Knowledge / RAG hygiene | RAG inject in stream · `knowledgeBlock` | Facts for grounding — must be labeled **do not speak like the docs / do not reveal internal mappings**. |
| **Later** | Model fine-tune | only if 1–6 insufficient | LoRA on short in-character turns; expensive and still needs good system rules. |

## What “human” means here (acceptance)

Keep: goals, pains, traits, skepticism, vocabulary, journey dos/donts.  
Change: **delivery**.

| Keep (character) | Humanize (surface) |
|------------------|--------------------|
| Opinions from goals/pains | 1–3 short beats, not essays |
| Trait-driven skepticism / impatience | Few or no `###` / numbered banks unless asked |
| Signature vocabulary | First-person lived voice (“ich würde …”), not “damit du testen kannst” |
| Domain knowledge when relevant | No framework echo (U/BV/BR labels, “Mapping-Einträge”, “Context-Export”) |
| Honest uncertainty | No closing “Wenn du willst, formuliere ich…” coach offers |

## Concrete rule additions (layer 1)

Add under `## Chat rules` (spec + code + tests):

1. **Anti-method:** Never name research frameworks, category codes (U/BV/BR), prompt banks, or internal knowledge labels in the reply. Enact them silently if the user wants questions — speak as yourself.
2. **Anti-coach:** Do not offer to refine prompts, rewrite categories, or help the researcher’s methodology unless they explicitly ask you to step out of character.
3. **Form from traits:** Map high impatience → one short answer first; high conscientiousness → one caveat, not a deck; low extraversion → less rapport filler.
4. **List budget:** At most one short list (≤3 bullets) unless the user asks for “9 Fragen” / “Liste”. Even then: questions in **your** wording, no category headers unless asked.
5. **Self-check:** Before sending, drop any sentence that explains *how* you structured the answer.

## Task envelope (layer 2) — GEO / employer elicitation

When the user message matches method dumps (e.g. contains `Unbranded/kategorial`, `U =`, `BV =`, `BR =`), prepend a **system/user bridge** (not replacing persona profile):

> The human is eliciting questions/opinions for research. Stay fully in character. Produce what *you* would ask or care about. Do not restate their category definitions. Do not thank them for the brief. Do not propose process improvements.

This preserves persona traits while neutralizing the “assistant complying with a brief” attractor seen in Michael/Lea/Markus threads.

## What not to do

- Do **not** put full U/BV/BR instructions into custom voice (that trains assistant mode).
- Do **not** raise `max_completion_tokens` to “fix” depth — depth should come from multi-turn, not longer monologues.
- Do **not** replace adaptive magazine assembly with a single custom system prompt (already rejected 2026-08-27).
- Do **not** dump RAG chunks into conversational voice; keep “Relevant context” clearly non-diegetic.

## Validation

Reuse corpus patterns from `knowledge/persona-chat-corpus-analysis.md`:

1. Replay 3 GEO threads (Michael, Lea, Markus) after rule change — score: meta phrases / markdown headers / coach offers should drop; trait-consistent content should remain.
2. Unit tests on `buildAdaptivePersonaChatSystemPrompt` asserting new rule strings.
3. Optional smoke: same persona + “hey wie geht’s” stays short; same persona + “9 Fragen U/BV/BR” returns questions **without** category essay.

## Related

- Adaptive assembly: `knowledge/adaptive-persona-chat-2026-08-27.md`
- Spec: `specs/domain/chat-workspace.md` § Persona system prompt
- Coolify export path: `knowledge/coolify-rest-env-ops-2026-09-20.md`
