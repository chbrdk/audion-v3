#!/usr/bin/env bash
# One-time / refresh setup for local UX Journey Agent lab.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
AGENT_DIR="$ROOT/services/ux-journey-agent"
cd "$AGENT_DIR"

export PATH="${HOME}/.local/bin:${PATH}"
if ! command -v uv >/dev/null 2>&1; then
  curl -LsSf https://astral.sh/uv/install.sh | sh
  # shellcheck disable=SC1091
  source "${HOME}/.local/bin/env"
fi

uv python install 3.12
uv venv .venv --python 3.12
# shellcheck disable=SC1091
source .venv/bin/activate
uv pip install -e "./audion-agent"
uv pip install -r requirements.txt
.venv/bin/playwright install chromium

if [[ ! -f .env.local ]]; then
  cp env.local.example .env.local
  echo "Created $AGENT_DIR/.env.local — add OPENAI_API_KEY (and optional ANTHROPIC_API_KEY)."
fi

echo "Setup OK. Next:"
echo "  1. Edit services/ux-journey-agent/.env.local"
echo "  2. ./scripts/local-lab-agent-serve.sh"
echo "  3. ./scripts/local-lab-run.sh"
