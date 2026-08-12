# Chat step strip thinness (2026-08-12)

## Symptom

Inspect dock StepStrip shows **Denken** as raw browser-use bookkeeping, e.g.

`thinking=None evaluation_previous_goal='Start' memory=… next_goal=…`

Screenshots / Target may exist, but persona channels (Gesehenes, Warum, Gefühl) look empty or unreadable. User cannot reconstruct what happened where.

## Root cause (not “fewer steps”)

1. `history.model_thoughts()` returns **AgentBrain** objects.
2. `_get_model_thoughts` did `str(item)` → Python/Pydantic repr with `thinking=None …`.
3. `_extract_thinking_text` only pulled quoted `thinking='…'`; **`thinking=None` left the whole dump** as “VO”.
4. Web fallback mapped that dump into `thinkAloud.think` → **Denken** lane.
5. Compact cards clamp Denken to 3 lines and keep other channels closed until expand — so a dump + thin meta feels especially empty.

**Fewer / fiery steps** (try-then-quit, max_steps) only reduce *how many* moments you get. They do **not** require dumping bookkeeping into the UI.

## Product intent

- **Bookkeeping** (`evaluation_previous_goal`, `memory`, `next_goal`, empty `thinking`) stays internal / meta.
- **Product channels** = `thinkAloud` / `perception` (seen, think, why, next, feel, …).
- When `thinking` is null, UI must still surface evaluation/memory/next as readable fallback channels — never the raw repr.

## Fix

- Agent: attribute-aware thought extraction; treat `thinking=None`; hunt `<<PERCEPTION>>` in structured fields when VO empty.
- Web: reject bookkeeping dumps; fallback `think` ← `evaluation_previous_goal`; open first useful compact lane.

## Related

- Spec: `specs/domain/ux-journey-think-aloud.md`
- Agent map: `services/ux-journey-agent/main.py` (`_get_model_thoughts`, `_extract_thinking_text`)
- UI: `apps/web/components/ux-journey-steps-strip.tsx` · `apps/web/lib/chat/ux-journey-steps.ts`
