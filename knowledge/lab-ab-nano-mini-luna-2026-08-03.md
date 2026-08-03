# A/B — nano vs mini vs gpt-5.6-luna (Lab B)

**Date:** 2026-08-03  
**Coolify env now:** `UX_JOURNEY_OPENAI_MODEL=gpt-5.6-luna` on agent  
**Job luna:** `e0a4ce65-fc7b-4656-9aa7-a28a76ec41d8`

Luna = GPT-5.6 cost tier (~nano-class). Docs: https://developers.openai.com/api/docs/models/gpt-5.6-luna

## Results

| Metric | nano `5d513eed` | mini `9ddecccc` | **luna `e0a4ce65`** |
|--------|-----------------|-----------------|---------------------|
| Model | gpt-5.4-nano | gpt-5.4-mini | **gpt-5.6-luna** |
| missingPerceptionClears | 9 | 0 | **0** |
| retries | 10 | 1 | **0** |
| forcedDone | 2 | 1 | **0** |
| Soft-Q Q2/Q3 | 2/2 | 2/2 | **2/2** |
| Lab correlate | 1.0 | 1.0 | **0.86** (fric 6 &lt; band 7) |
| Gold overlap | 1.0 | 0.6 | **1.0** |
| agentAbandon | yes | no (proceed) | **yes** (`disabled_option_unexplained`) |
| Gold closer | true | false | **true** |
| noticed | — | PL/Displays/grau | PL + Filter unklar warum + grau/Displays |

## Verdict

**Luna wins this Lab slice:** nano-tier cost intent + mini-like block compliance + human abandon + full gold. Correlate soft only because friction landed at 6 — fixed in `e1b9fe9` (`knowledge/lab-friction-band-floor7-2026-08-03.md`); re-smoke `1e6e8142…` → friction **8**, correlate **1.0**.

Leave agent on `gpt-5.6-luna` unless cost/latency regresses on longer runs.
