# Local UX Journey Agent lab (fast iteration)

**Date:** 2026-08-03  
**Why:** Staging Coolify loops are slow for agent crash / persona policy debugging. Iterate on `services/ux-journey-agent` locally, then push once the lab run looks right.

## Prerequisites

- `uv` (install: `curl -LsSf https://astral.sh/uv/install.sh | sh`)
- Python 3.12 via uv
- `OPENAI_API_KEY` (optional `ANTHROPIC_API_KEY` for fallback — staging lacked this)

## One-time setup

```bash
cd /Users/christoph.bordeck/Desktop/GITHUB/audion-v3
./scripts/local-lab-agent-setup.sh
# edit services/ux-journey-agent/.env.local → OPENAI_API_KEY=...
```

Already done on this machine: `.venv` + Playwright Chromium.

## Loop

Terminal A:

```bash
./scripts/local-lab-agent-serve.sh
```

Terminal B:

```bash
./scripts/local-lab-run.sh
```

Inspect `/tmp/local-lab-run-<jobId>.json` — look for:
- `personaPolicy.dimensions.time_pressure` ≥ 0.75
- no streak of `action: "error"` / empty actions after navigate
- `summary`/`error` naming the real failure (after `2ed1118`)
- Think-Aloud / grey-option confusion cues

Correlate later with `apps/web/lib/persona-lab-correlate.ts` (map job → snapshot).

## Lean env (serve script defaults)

| Var | Lab default | Why |
|-----|-------------|-----|
| `UX_JOURNEY_VIDEO_TRANSCODE` | 0 | skip ffmpeg |
| `UX_JOURNEY_DEFER_VIDEO_FINALIZE` | 1 | no polish |
| `UX_JOURNEY_VIDEO_VOICEOVER` | 0 | no TTS |
| `UX_JOURNEY_LIVE_POLLING_LOOP` | 0 | less CPU |
| `UX_JOURNEY_MAX_FAILURES` | 10 | survive parse hiccups |
| `UX_JOURNEY_SLOWMO` | 1 | faster wall clock |
| `PORT` | 8320 | local |

## Unit tests (no browser)

```bash
cd services/ux-journey-agent && .venv/bin/python -m pytest test_history_error_steps.py test_browser_ua.py -q
```

## Paths

- Agent: `services/ux-journey-agent/`
- Scripts: `scripts/local-lab-agent-*.sh` · `scripts/local-lab-run.sh`
- Env example: `services/ux-journey-agent/env.local.example`
- Crash note: `knowledge/lab-agent-empty-actions-2026-08-03.md`
