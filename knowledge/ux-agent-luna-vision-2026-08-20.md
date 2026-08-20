# UX Journey Agent — Luna + Vision (2026-08-20)

**Trigger:** UEQ eBike / BSH / EBM batch runs — AI goal-reached often ~17%; dominant fail = nav / mega-menu / blocked clicks, not “wrong chat model”.

## Decisions

| Lever | Choice |
|-------|--------|
| Live agent model | Keep **`gpt-5.6-luna`** (`UX_JOURNEY_OPENAI_MODEL`) |
| GPT-4o | Removed from first-party chat/infer defaults (TTS `gpt-4o-mini-tts` unchanged) |
| Vision | `use_vision=True` + **`UX_JOURNEY_VISION_DETAIL=high`** (was implicit `auto`) |
| Mega-menu | Prompt + path-finding: screenshot Ground Truth → hover/look → target |

## Fail taxonomy (batch bucketing)

Script: `scripts/bucket-ux-journey-fail-reasons.py`

| Bucket | Meaning |
|--------|---------|
| `goal_ok` | Agent / coverage reports goal reached |
| `nav_hover` | Think-aloud / steps mention hover, mega-menu, submenu, “nicht klickbar”, Nav öffnet nicht |
| `click_blocked` | Click fails / blocked / element not interactable |
| `click_no_nav` | Stuck on home / logo loop / no URL progress toward task keywords |
| `max_steps` | Hit max_steps without goal |
| `empty_actions` | Empty model actions / consecutive failures |
| `other` | Complete but unclassified miss |

## Baseline (UEQ eBike 2026-08-19)

URL-grounded fail buckets (`scripts/bucket-ux-journey-fail-reasons.py` — ignores unreliable `success` / early `gateSignals.goalReached`):

| Bucket | Count | Rate |
|--------|------:|-----:|
| `click_no_nav` | 16 | 66.7% |
| `click_blocked` | 5 | 20.8% |
| `goal_ok` | 2 | 8.3% |
| `nav_hover` | 1 | 4.2% |

Artifact: `knowledge/ux-journey-fail-buckets-baseline-2026-08-19.json`  
LLM-inferred goal rate in UEQ benchmark was ~16.7% (think-aloud proxy); URL-grounded is stricter.

Weakest qualitative: UC1 Flow App, UC3 Interessent Über uns (nav).

## Smoke after deploy

Mini-wave (6 runs): UC2 Service + UC3 Über uns × 2 personas × 1–2 waves on `https://www.bosch-ebike.com/de/`.

Compare `goal_ok` + `nav_hover` share vs. baseline via fail-bucket script.

## Coolify / Deploy

App `audion-v3-ux-journey-agent` (`lfv0921nlqzl0qow9xse4it4`):

- `UX_JOURNEY_OPENAI_MODEL=gpt-5.6-luna` (env key already set)
- `UX_JOURNEY_VISION_DETAIL=high` (Dockerfile bake; Coolify override optional)
- After **push + redeploy**, `/health` must show `openaiModel` + `visionDetailLevel`
- Smoke protocol: `knowledge/lab-staging-smoke-luna-vision-2026-08-20.md`

## Related

- Spec: `specs/domain/ux-journey-perception.md` § Vision / path-finding §13
- Code: `services/ux-journey-agent/main.py`, `perception.py`
- Paths: `knowledge/paths.md` · `UX_JOURNEY_VISION_DETAIL`
