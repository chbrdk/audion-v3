# Chat step strip — readable compact preview (2026-08-12)

## Symptom

Inspect StepStrip cards read as label salad: `TARGET … DENKEN Start NÄCHSTER SCHRITT ERGEBNIS GESEHENES DENKEN` with no usable persona narrative. “Denken: Start” is browser-use `evaluation_previous_goal`, not thought.

## Causes

1. Fallback mapped raw `evaluation_previous_goal='Start'` into Denken.
2. Compact cards still rendered **closed** `ChannelLane` summaries → uppercase labels with no body.
3. Thin/missing `<<PERCEPTION>>` / VO leaves only bookkeeping + action target.

## Product rule

- Never show bookkeeping stubs (`Start`, `None`, dumps, single short tokens) as Denken.
- Compact: **one** open preview lane; hide other channel chrome until expand.
- Last-resort Denken: short action-beat from `action` + `target` (“Ich öffne …”).

## Related

- Spec: `specs/domain/ux-journey-think-aloud.md`
- Code: `apps/web/lib/chat/ux-journey-steps.ts` · `apps/web/components/ux-journey-steps-strip.tsx`
- Prior: `knowledge/chat-step-strip-thinness-2026-08-12.md`
