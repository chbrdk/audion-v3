#!/usr/bin/env bash
# Fire one Persona-Lab B run against local agent and print correlate-friendly JSON.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
AGENT_DIR="$ROOT/services/ux-journey-agent"
BASE="${UX_JOURNEY_AGENT_URL:-http://127.0.0.1:8320}"

# shellcheck disable=SC1091
[[ -f "$AGENT_DIR/.env.local" ]] && set -a && source "$AGENT_DIR/.env.local" && set +a

curl -sf "$BASE/health" >/dev/null || {
  echo "Agent not reachable at $BASE — start ./scripts/local-lab-agent-serve.sh first" >&2
  exit 1
}

PAYLOAD="$(python3 - <<'PY'
import json
from pathlib import Path
# Prefer package fixture task text if importable; else inline.
task = (
  "Lab-Persona: Du bist ungeduldig (Patient niedrig, time_pressure hoch). "
  "Du hast ein eBike mit Bosch Performance Line und willst kompatible Displays wissen. "
  "Nutze das Produktkombinationen-Tool. Denke laut auf Deutsch. "
  "Wenn Optionen ausgeblendet/grau sind und du nicht verstehst warum: benenne das sofort "
  "und brich nach höchstens zwei solchen Momenten ab — kein langes Weiterprobieren. "
  "Beantworte F3.1–F3.4. Nenne Displays oder dass du keine sichere Antwort gefunden hast. "
  "Erfolg für dich = ehrliche UX-Aussage, nicht maximale Seiten-Exploration."
)
print(json.dumps({
  "url": "https://www.bosch-ebike.com/de/service/produktkombinationen",
  "task": task,
  "max_steps": 15,
  "persona": {
    "id": "persona-alex-lab-impatient",
    "name": "Alex Lab Ungeduldig",
    "profile": {
      "traits": ["Patient: 0.15", "Impatient: 0.90", "Pragmatic: 0.85"],
      "attentionSpan": "Sehr kurz; nach 1–2 verwirrenden Filterzuständen Abbruch",
      "interests": ["eBike Touren", "Nachrüstung"],
      "stressTriggers": ["Unklare Filterlogik", "Graue Optionen ohne Erklärung"],
    },
    "dimensionOverrides": {
      "time_pressure": 0.9,
      "exploration": 0.25,
      "detail_orientation": 0.35,
      "trust_skepticism": 0.7,
      "risk_aversion": 0.6,
    },
    "dos": [
      "Laut denken auf Deutsch",
      "Graue/ausgeblendete Optionen sofort benennen",
      "Nach zwei Verwirrungs-Momenten abbrechen",
    ],
    "donts": ["40+ Steps weiter suchen", "Verwirrung verschweigen"],
    "heuristics": [
      "Optimize for speed; if filter cause unknown twice, stop with partial finding.",
    ],
  },
}))
PY
)"

echo "POST $BASE/run ..."
JOB_JSON="$(curl -sf -X POST "$BASE/run" -H 'Content-Type: application/json' -d "$PAYLOAD")"
JOB_ID="$(python3 -c "import json,sys; print(json.load(sys.stdin)['jobId'])" <<<"$JOB_JSON")"
echo "jobId=$JOB_ID"

OUT="/tmp/local-lab-run-$JOB_ID.json"
for i in $(seq 1 90); do
  curl -sf "$BASE/run/$JOB_ID" -o "$OUT"
  STATUS="$(python3 -c "import json; print(json.load(open('$OUT')).get('status'))")"
  echo "$(date +%H:%M:%S) status=$STATUS"
  if [[ "$STATUS" == "complete" || "$STATUS" == "error" ]]; then
    break
  fi
  sleep 5
done

python3 - <<PY
import json
from pathlib import Path
job = json.load(open("$OUT"))
res = job.get("result") or {}
steps = res.get("steps") or []
pp = (res.get("personaPolicy") or {}).get("dimensions") or {}
print("--- RESULT ---")
print("success:", res.get("success"))
print("error:", res.get("error"))
print("summary:", (res.get("summary") or "")[:400])
print("steps:", len(steps))
print("actions:", [s.get("action") for s in steps[:12]])
print("time_pressure:", pp.get("time_pressure"))
print("heuristics:", (res.get("personaPolicy") or {}).get("heuristics"))
sc = res.get("scorecard") or {}
print("friction:", sc.get("frictionScore"), "fit:", sc.get("personaFitScore"), "goal:", (sc.get("coverage") or {}).get("goalReached"))
for s in steps:
    if s.get("action") == "error" or s.get("error"):
        print("STEP_ERROR", s.get("step"), (s.get("result") or s.get("error") or "")[:200])
print("wrote", "$OUT")
PY
