#!/usr/bin/env bash
# Start UX Journey Agent locally for Persona Lab iteration (fast loop).
# Usage:
#   export OPENAI_API_KEY=sk-...   # or put in services/ux-journey-agent/.env.local
#   ./scripts/local-lab-agent-serve.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
AGENT_DIR="$ROOT/services/ux-journey-agent"
cd "$AGENT_DIR"

export PATH="${HOME}/.local/bin:${PATH}"
# shellcheck disable=SC1091
[[ -f "${HOME}/.local/bin/env" ]] && source "${HOME}/.local/bin/env"

if [[ ! -d .venv ]]; then
  echo "Missing .venv — run: ./scripts/local-lab-agent-setup.sh" >&2
  exit 1
fi
# shellcheck disable=SC1091
source .venv/bin/activate

if [[ -f .env.local ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.local
  set +a
fi

if [[ -z "${OPENAI_API_KEY:-}" && -z "${ANTHROPIC_API_KEY:-}" ]]; then
  echo "Set OPENAI_API_KEY or ANTHROPIC_API_KEY (e.g. in $AGENT_DIR/.env.local)" >&2
  exit 1
fi

# Lean lab defaults — skip heavy video polish / live polling
export PORT="${PORT:-8320}"
export UX_JOURNEY_DEFER_VIDEO_FINALIZE="${UX_JOURNEY_DEFER_VIDEO_FINALIZE:-1}"
export UX_JOURNEY_VIDEO_TRANSCODE="${UX_JOURNEY_VIDEO_TRANSCODE:-0}"
export UX_JOURNEY_VIDEO_VOICEOVER="${UX_JOURNEY_VIDEO_VOICEOVER:-0}"
export UX_JOURNEY_LIVE_POLLING_LOOP="${UX_JOURNEY_LIVE_POLLING_LOOP:-0}"
export UX_JOURNEY_SCORECARD="${UX_JOURNEY_SCORECARD:-1}"
export UX_JOURNEY_MAX_FAILURES="${UX_JOURNEY_MAX_FAILURES:-10}"
export UX_JOURNEY_MAX_STEPS="${UX_JOURNEY_MAX_STEPS:-15}"
export UX_JOURNEY_SLOWMO="${UX_JOURNEY_SLOWMO:-1}"
export AUDION_AGENT_USE_JUDGE="${AUDION_AGENT_USE_JUDGE:-0}"
export AUDION_BROWSER_LOADING_OVERLAY="${AUDION_BROWSER_LOADING_OVERLAY:-0}"

echo "Local UX Journey Agent on http://127.0.0.1:${PORT}"
echo "  max_failures=${UX_JOURNEY_MAX_FAILURES} scorecard=${UX_JOURNEY_SCORECARD} video_transcode=${UX_JOURNEY_VIDEO_TRANSCODE}"
exec uvicorn main:app --host 127.0.0.1 --port "${PORT}" --reload
