#!/usr/bin/env bash
# Fire one Persona-Lab B run against local agent and print correlate-friendly JSON.
#
# Usage:
#   ./scripts/local-lab-run.sh                 # impatient Alex (default)
#   LAB_PERSONA=patient ./scripts/local-lab-run.sh
#   LAB_PERSONA=impatient ./scripts/local-lab-run.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
AGENT_DIR="$ROOT/services/ux-journey-agent"
BASE="${UX_JOURNEY_AGENT_URL:-http://127.0.0.1:8320}"
LAB_PERSONA="${LAB_PERSONA:-impatient}"

# shellcheck disable=SC1091
[[ -f "$AGENT_DIR/.env.local" ]] && set -a && source "$AGENT_DIR/.env.local" && set +a

curl -sf "$BASE/health" >/dev/null || {
  echo "Agent not reachable at $BASE — start ./scripts/local-lab-agent-serve.sh first" >&2
  exit 1
}

export LAB_PERSONA
PAYLOAD="$(python3 - <<'PY'
import json
import os

mode = (os.environ.get("LAB_PERSONA") or "impatient").strip().lower()
if mode not in ("impatient", "patient"):
    raise SystemExit(f"LAB_PERSONA must be impatient|patient, got {mode!r}")

url = "https://www.bosch-ebike.com/de/service/produktkombinationen"

if mode == "patient":
    task = (
        "Lab-Persona: Du bist geduldig und detailorientiert (Patient hoch, time_pressure niedrig). "
        "Du hast ein eBike mit Bosch Performance Line und willst kompatible Displays wissen. "
        "Nutze das Produktkombinationen-Tool. Denke laut auf Deutsch. "
        "Wenn Optionen ausgeblendet/grau sind: benenne das, aber versuche systematisch "
        "die Filterreihenfolge zu verstehen (Drive Unit → Akku → Display) bevor du abbrichst. "
        "Beantworte F3.1–F3.4 so vollständig wie möglich. "
        "Erfolg für dich = belastbare Antwort oder klar dokumentierte Blockade nach gründlicher Prüfung."
    )
    persona = {
        "id": "persona-sam-lab-patient",
        "name": "Sam Lab Geduldig",
        "profile": {
            "traits": ["Patient: 0.90", "Impatient: 0.10", "Detail-oriented: 0.85"],
            "attentionSpan": "Lang; prüft Filterreihenfolge und liest Hinweise",
            "interests": ["eBike Technik", "Kompatibilität"],
            "stressTriggers": ["Voreilige Fehlschlüsse", "Unvollständige Checks"],
        },
        "dimensionOverrides": {
            "time_pressure": 0.2,
            "exploration": 0.7,
            "detail_orientation": 0.85,
            "trust_skepticism": 0.55,
            "risk_aversion": 0.5,
        },
        "dos": [
            "Laut denken auf Deutsch",
            "Graue Optionen benennen, aber weiter systematisch prüfen",
            "Filterreihenfolge verstehen bevor Abbruch",
        ],
        "donts": ["Sofort nach dem ersten grauen Feld aufgeben", "Antwort raten ohne Check"],
        "heuristics": [
            "Prefer thorough verification; try Drive Unit then Battery then Display before abandoning.",
        ],
    }
else:
    task = (
        "Lab-Persona: Du bist ungeduldig (Patient niedrig, time_pressure hoch). "
        "Du hast ein eBike mit Bosch Performance Line und willst kompatible Displays wissen. "
        "Nutze das Produktkombinationen-Tool. Denke laut auf Deutsch. "
        "Wenn Optionen ausgeblendet/grau sind und du nicht verstehst warum: benenne das sofort "
        "und brich nach höchstens zwei solchen Momenten ab — kein langes Weiterprobieren. "
        "Beantworte F3.1–F3.4. Nenne Displays oder dass du keine sichere Antwort gefunden hast. "
        "Erfolg für dich = ehrliche UX-Aussage, nicht maximale Seiten-Exploration."
    )
    persona = {
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
    }

print(json.dumps({
    "url": url,
    "task": task,
    "max_steps": 40,
    "persona": persona,
}))
PY
)"

echo "POST $BASE/run (LAB_PERSONA=$LAB_PERSONA) ..."
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
job = json.load(open("$OUT"))
res = job.get("result") or {}
steps = res.get("steps") or []
pp = (res.get("personaPolicy") or {}).get("dimensions") or {}
print("--- RESULT ---")
print("labPersona:", "$LAB_PERSONA")
print("persona:", (res.get("persona") or {}))
print("success:", res.get("success"))
print("error:", res.get("error"))
print("summary:", (res.get("summary") or "")[:400])
print("steps:", len(steps))
print("actions:", [s.get("action") for s in steps[:16]])
print("time_pressure:", pp.get("time_pressure"))
print("heuristics:", (res.get("personaPolicy") or {}).get("heuristics"))
print("stepBudget:", res.get("stepBudget"))
print("confusionAbandon:", res.get("confusionAbandon"))
sc = res.get("scorecard") or {}
print("friction:", sc.get("frictionScore"), "fit:", sc.get("personaFitScore"), "goal:", (sc.get("coverage") or {}).get("goalReached"))
conf = sc.get("confusion") or {}
if conf:
    print("confusionTags:", conf.get("tagCount"), "floorApplied:", conf.get("applied"), "floor:", conf.get("floor"))
for s in steps:
    blob = " ".join(
        str(x)
        for x in (
            s.get("reasoning"),
            (s.get("thinkAloud") or {}).get("think") if isinstance(s.get("thinkAloud"), dict) else None,
            s.get("result"),
        )
        if x
    )
    if any(k in blob.lower() for k in ("grau", "unklar", "verwirr", "disabled", "ausgeblend")):
        print("CONFUSION_STEP", s.get("step"), blob[:180])
for s in steps:
    if s.get("action") == "error" or s.get("error"):
        print("STEP_ERROR", s.get("step"), (s.get("result") or s.get("error") or "")[:200])
print("wrote", "$OUT")
PY
