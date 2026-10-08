# Human-behavior fidelity options (AUDION surfaces)

**Date:** 2026-10-07  
**Goal:** Near-real user behavior across **browse / journey**, **persona chat**, and **Facetime (Tavus)** — not a single saliency demo case.  
**Related:** `specs/domain/ux-journey-perception.md` · `specs/domain/ux-lab-archetypes.md` · `knowledge/persona-chat-humanize-2026-09-20.md` · `knowledge/tavus-video-chat.md` · `specs/domain/tavus-video-chat.md`

## Product truth

Closer-to-human comes from **fidelity stack + human-gold correlators** (`ux-lab-archetypes.md`), not from more scenario packs or a bigger LLM alone. Research (paired AI-vs-human usability, 2025) consistently shows: structural/task overlap can be high; **cognitive load, frustration, hesitation, and motor messiness** are systematically underestimated by pure LLMs.

## Shared fidelity layers (all three surfaces)

| Layer | What it buys | Efficiency | Moat? |
|-------|----------------|------------|-------|
| **A. Behavioral state machine** | Timing, hesitation, try-then-quit, abandon, repair, turn length — hard constraints the LLM may not violate | High — you already ship much of this in journey | Product rules, not model |
| **B. Bounded cognition** | Working memory, forgetting, goal drift, no omniscience (hypothesis-blind where needed) | High — ACT-R-style memory / grounded simulation patterns | Architecture |
| **C. Affect / load model** | Frustration, time pressure, confusion → stance, tone, latency | High — trait → numeric knobs already partially exist | Calibration vs humans |
| **D. Perception grounding (CV)** | What is actually visible / salient before decide | Medium — host MSI-Net/UMSI++ etc. | Less unique unless persona-conditioned |
| **E. Motor / interaction noise** | Misclicks, overshoot, backtrack, scroll thrash, typos | Medium — runtime injection | Feels human fast |
| **F. Human-gold loop** | Same tasks with real users → correlate Soft-Q, paths, themes, affect | Critical — without this you cannot claim “near real” | **Primary moat** |
| **G. Fine-tune / own model** | Style & path priors from *your* traces | Expensive; only after F | Only if proprietary data |

**Do not** use competent GUI agents (SeeClick, Mind2Web, UI-TARS) as the *persona* brain — they optimize success, not fallible humans. Optional as tools for *grounding* (“is this element on screen?”), never as “what would Sonja do?”

## Surface 1 — Surfing / UX journey

**Today:** Perception-in-loop, look-before-act + persona dwell, try-then-quit, browse-before-search, vision screenshots, Soft-Q + correlate.

**Highest ROI next:**

1. Keep/strengthen **A+C+E** (stance, dwell distributions, motor noise, path backtracks) — cheap, product-owned.
2. Add **D** only as *input* to perception (`noticed` budget from saliency + DOM), not as the decision maker.
3. **F** n≥3 human gold per archetype (already policy) — expand metrics: step timing histograms, scroll depth, abandon reason codes, not only Soft-Q.
4. Optional cognitive memory (B): episodic “what I already tried on this site” across steps so the agent doesn’t re-open the same mega-menu forever *or* invent perfect memory.

**De-prioritize:** Training an from-scratch browse model; swapping journey LLM for a GUI agent SOTA.

## Surface 2 — Persona chat

**Today:** Adaptive magazine prompt, humanize post-filter, voice few-shots, anti-assistant rules, eval catalog.

**Highest ROI next:**

1. **Dialogue dynamics (A+C):** reply latency jitter, filler/hedges by trait, topic drift, short non-answers, “wait I didn’t get that”, refusal to play researcher — not more facts in the prompt.
2. **B:** session working memory + selective recall (forget mid details; contradict softly when overloaded).
3. **F:** paired twin eval (same brief → human vs persona) on attitude change, themes, *and* load/frustration (known gap in literature).
4. Fine-tune (G) only if 1–3 plateau — LoRA on short in-character turns from gold chats.

**De-prioritize:** Bigger base model alone; RAG that sounds like documentation.

## Surface 3 — Facetime / Tavus

**Today:** Face + PAL from Audion magazine SSOT; conversational context; language; idle timeouts. Thinking/talking is still LLM/PAL; video is *presence*, not cognition.

**Highest ROI next:**

1. Same **persona behavioral controller** as chat (A+C): interruptibility, thinking pauses, “uh”, topic change mid-sentence — mapped into Tavus/PAL prompts + turn policies where the API allows.
2. **Prosody / nonverbal cues** via Tavus capabilities (pacing, emotion tags if available) driven by the *same* affect state as chat/journey — one state machine, three renderers.
3. **F:** short human gold calls scored for turn-taking, repair, affect — not visual likeness alone.
4. Do **not** expect saliency models to help Facetime; eye-contact/replica quality ≠ behavioral fidelity.

## “Own model?” decision rule

Build / fine-tune **only when**:

- You have proprietary **paired** traces (human + synthetic on same tasks) across ≥1 surface, and
- Prompt/runtime constraints no longer close the Soft-Q / path / affect gap, and
- The model predicts **persona-conditioned behavior** (not generic “find the button”).

Until then: **runtime fidelity stack + human gold** beats a custom foundation model on cost and ship speed. Open saliency/GUI models are optional sensors, not the product brain.

## Decision (2026-10-07)

**First build:** shared **Behavioral Controller** — `specs/domain/behavioral-controller.md` · compile in `apps/web/lib/behavior/compile-behavioral-policy.ts`. Traits + journey overrides + optional TG priors → one `BehavioralPolicy` for browse / chat / Facetime.

## Suggested evaluation scoreboard (all surfaces)

| Dimension | Browse | Chat | Facetime |
|-----------|--------|------|----------|
| Task / theme overlap vs human gold | paths, success, cheat flags | theme overlap, attitude Δ | topic coverage |
| Timing | dwell, step Δ, total time | latency, turn length | pause, overlap speech |
| Affect / load | frustrationHigh, abandon quality | named frustration, hedges | prosody + repair |
| Fallibility | misnav, backtrack, try-then-quit | misunderstanding, digression | interrupt / correction |
| Consistency | same persona × n runs variance | voice stability | face+voice+content align |

Claim “nahezu echt” only when scoreboard bands match human distributions — not when a single demo looks good.
