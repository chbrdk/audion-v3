# A/B — UX Journey model nano vs mini (Lab B)

**Date:** 2026-08-03  
**Knob:** Coolify env `UX_JOURNEY_OPENAI_MODEL` on `audion-v3-ux-journey-agent`  
**Currently set:** `gpt-5.4-mini` (after this A/B)

## Comparison (same wave/persona)

| Metric | nano `71a1f59` job `5d513eed…` | mini job `9ddecccc…` |
|--------|--------------------------------|----------------------|
| Model in result | (nano default) | **gpt-5.4-mini** confirmed |
| missingPerceptionClears | **9** | **0** |
| retries | **10** | **1** |
| forcedDone | 2 | 1 |
| steps / with perception | 3 / 1 | 2 / 1 |
| Soft-Q Q2/Q3 | 2 / 2 | 2 / 2 |
| Lab correlate | 1.0 | 1.0 |
| Gold overlap | **1.0** (5/5) | **0.6** (miss Filter, unklar warum) |
| agentAbandon / stance | yes / abandon | **no** / proceed |
| Gold closer | true | **false** |
| meanClarity | 1.0 | **2.0** (optimistic) |

## Readout

- **Mini:** structured `<<PERCEPTION>>` compliance stark besser (0 clears) → billiger an Retries/Latenz.
- **Nano + P5 enrich:** human-ähnlicher Abandon + volle Gold-Salienz; teurer durch Missing-Block-Kampf.
- Mini war „sicherer“ (clarity 2, kein confusion-Tag) → impatient hard-upgrade greift nicht (braucht clarity≤1 oder confusion).

## Options

1. Stay mini + sharpen abandon gate (grey signal → upgrade even at clarity 2).  
2. Stay nano for Lab fidelity; accept retry cost.  
3. Hybrid later: mini for browse steps, nano/rules for abandon (not built).
