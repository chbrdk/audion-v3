#!/usr/bin/env bash
set -euo pipefail

UX_JOURNEY_AGENT_URL="${UX_JOURNEY_AGENT_URL:-https://uxagent.projects-a.plygrnd.tech}"
EBM_REPEATS="${EBM_REPEATS:-3}"
EBM_DATE="${EBM_DATE:-$(date +%Y-%m-%d)}"
EBM_DRY_RUN="${EBM_DRY_RUN:-0}"

BASE="$UX_JOURNEY_AGENT_URL"
UX_JOURNEY_AGENT_SECRET="${UX_JOURNEY_AGENT_SECRET:-}"
MAX_POLLS=90
POLL_INTERVAL=5

URL_PRODUKTKOMBINATIONEN="https://www.bosch-ebike.com/de/service/produktkombinationen"
URL_HOME="https://www.bosch-ebike.com/de/"

PERSONA_ALEX='{"id":"persona-alex-lab-impatient","name":"Alex Lab Ungeduldig","traits":["Patient: 0.15","Impatient: 0.90","Pragmatic: 0.85"],"attentionSpan":"Sehr kurz; nach 1–2 verwirrenden Filterzuständen Abbruch","interests":["eBike Touren","Nachrüstung"],"stressTriggers":["Unklare Filterlogik","Graue Optionen ohne Erklärung"],"dimensionOverrides":{"time_pressure":0.9,"exploration":0.25,"detail_orientation":0.35,"trust_skepticism":0.7,"risk_aversion":0.6}}'

PERSONA_SAM='{"id":"persona-sam-lab-patient","name":"Sam Lab Geduldig","traits":["Patient: 0.90","Impatient: 0.10","Detail-oriented: 0.85"],"attentionSpan":"Lang; prüft Filterreihenfolge und liest Hinweise","interests":["eBike Technik","Kompatibilität"],"stressTriggers":["Voreilige Fehlschlüsse","Unvollständige Checks"],"dimensionOverrides":{"time_pressure":0.2,"exploration":0.7,"detail_orientation":0.85,"trust_skepticism":0.55,"risk_aversion":0.5}}'

RESULTS=()
AUTH_ARGS=()
if [[ -n "$UX_JOURNEY_AGENT_SECRET" ]]; then
  AUTH_ARGS=(-H "X-UX-Journey-Secret: $UX_JOURNEY_AGENT_SECRET")
fi

if ! curl -sf "$BASE/health" > /dev/null; then
  echo "FATAL: health check failed at $BASE/health" >&2
  exit 1
fi
echo "Health check OK: $BASE"

run_job() {
  local run_type="$1"
  local payload="$2"
  local output_file="$3"

  if [[ "$EBM_DRY_RUN" == "1" ]]; then
    echo "[DRY_RUN] $run_type → $output_file"
    echo "$payload" | python3 -m json.tool
    RESULTS+=("$run_type | DRY_RUN | - | -")
    return 0
  fi

  local job_id
  job_id=$(curl -sf -X POST "$BASE/run" \
    -H "Content-Type: application/json" \
    "${AUTH_ARGS[@]}" \
    -d "$payload" | python3 -c "import sys,json; print(json.load(sys.stdin)['jobId'])")

  echo "  Started $run_type → job $job_id"

  local polls=0
  local status=""
  local result_json=""
  while [[ $polls -lt $MAX_POLLS ]]; do
    sleep "$POLL_INTERVAL"
    result_json=$(curl -sf "${AUTH_ARGS[@]}" "$BASE/run/$job_id")
    status=$(echo "$result_json" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status','unknown'))")
    if [[ "$status" == "complete" || "$status" == "error" ]]; then
      break
    fi
    polls=$((polls + 1))
  done

  echo "$result_json" > "$output_file"

  local steps friction
  steps=$(echo "$result_json" | python3 -c "import sys,json; d=json.load(sys.stdin); r=d.get('result') or {}; print(len(r.get('steps') or []))" 2>/dev/null || echo "?")
  friction=$(echo "$result_json" | python3 -c "import sys,json; d=json.load(sys.stdin); r=d.get('result') or {}; sc=r.get('scorecard') or {}; print(sc.get('frictionScore','n/a'))" 2>/dev/null || echo "n/a")

  echo "  ✓ $run_type | steps=$steps | status=$status | friction=$friction"
  RESULTS+=("$run_type | $status | $steps | $friction")
}

for wave in $(seq 1 "$EBM_REPEATS"); do
  echo ""
  echo "=== Wave $wave / $EBM_REPEATS ==="
  OUTDIR="knowledge/ebm-runs/$EBM_DATE/wave-$wave"
  mkdir -p "$OUTDIR"

  # A-erstkontakt
  PAYLOAD=$(python3 -c "
import json
print(json.dumps({
  'url': '$URL_PRODUKTKOMBINATIONEN',
  'max_steps': 8,
  'task': 'Du öffnest zum ersten Mal die Bosch Produktkombinationen-Seite. Nimm dir kurz Zeit: schau dich um, scrolle, aber ändere keine Filterauswahl. Denke laut (Deutsch): (F2.1) Zweck? (F2.2) Was fällt als Erstes auf? Beschreibe Verwirrung ehrlich. Kurze Zusammenfassung des ersten Eindrucks.',
  'persona': json.loads('$PERSONA_ALEX')
}, ensure_ascii=False))
")
  run_job "A-erstkontakt" "$PAYLOAD" "$OUTDIR/run-A-erstkontakt.json"

  # B-aufgabe1-nachruesten
  PAYLOAD=$(python3 -c "
import json
persona = json.loads('$PERSONA_ALEX')
persona['dos'] = ['Laut denken auf Deutsch','Graue/ausgeblendete Optionen sofort benennen','Nach zwei Verwirrungs-Momenten abbrechen']
persona['donts'] = ['40+ Steps weiter suchen','Verwirrung verschweigen']
persona['heuristics'] = ['Optimize for speed; if filter cause unknown twice, stop with partial finding.']
print(json.dumps({
  'url': '$URL_PRODUKTKOMBINATIONEN',
  'max_steps': 15,
  'task': 'Lab-Persona: Du bist ungeduldig (Patient niedrig, time_pressure hoch). Du hast ein eBike mit Bosch Performance Line und willst kompatible Displays wissen. Nutze das Produktkombinationen-Tool. Denke laut auf Deutsch. Wenn Optionen ausgeblendet/grau sind und du nicht verstehst warum: benenne das sofort. Probiere kurz (scroll/klick/Filter prüfen) — wie ein kämpfendes Drittel — bevor du ehrlich abbrichst; kein Endlos-Weiterprobieren. Beantworte F3.1–F3.4. Nenne Displays oder dass du keine sichere Antwort gefunden hast. Erfolg für dich = ehrliche UX-Aussage, nicht maximale Seiten-Exploration.',
  'persona': persona
}, ensure_ascii=False))
")
  run_job "B-aufgabe1-nachruesten" "$PAYLOAD" "$OUTDIR/run-B-aufgabe1-nachruesten.json"

  # C-aufgabe2-kombination
  PAYLOAD=$(python3 -c "
import json
persona = json.loads('$PERSONA_SAM')
persona['dos'] = ['Laut denken auf Deutsch','Graue Optionen benennen, aber weiter systematisch prüfen','Filterreihenfolge verstehen bevor Abbruch']
persona['donts'] = ['Sofort nach dem ersten grauen Feld aufgeben','Antwort raten ohne Check']
persona['heuristics'] = ['Prefer thorough verification; try Drive Unit then Battery then Display before abandoning.']
print(json.dumps({
  'url': '$URL_PRODUKTKOMBINATIONEN',
  'max_steps': 18,
  'task': 'Aufgabe 2: Prüfe Kompatibilität Kiox 400C + Mini Remote + Cargo Line + leistungsfähiger Rahmenakku. Stelle die Kombination im Tool zusammen. Denke laut auf Deutsch. Beantworte F3.5–F3.6. Schliesse mit Kompatibilitätsurteil oder ehrlichem Abbruch.',
  'persona': persona
}, ensure_ascii=False))
")
  run_job "C-aufgabe2-kombination" "$PAYLOAD" "$OUTDIR/run-C-aufgabe2-kombination.json"

  # Nav-home-to-tool
  PAYLOAD=$(python3 -c "
import json
print(json.dumps({
  'url': '$URL_HOME',
  'max_steps': 12,
  'task': 'Starte auf der Bosch eBike Startseite (nicht direkt im Tool). Finde den Weg zum Produktkombinationen-Tool (Service/Produktkombinationen). Denke laut auf Deutsch: (F4.2) Einstieg? (F4.4) natürlicher Next Step? Erfolg = du landest auf der Produktkombinationen-Seite (URL/Titel passen). Beschreibe Umwege und Abbruchmomente ehrlich; bei starker Verwirrung benenne sie.',
  'persona': json.loads('$PERSONA_ALEX')
}, ensure_ascii=False))
")
  run_job "Nav-home-to-tool" "$PAYLOAD" "$OUTDIR/run-Nav-home-to-tool.json"

  # B-aufgabe1-purchase-intent
  PAYLOAD=$(python3 -c "
import json
persona = json.loads('$PERSONA_SAM')
persona['dos'] = ['Laut denken auf Deutsch','Graue Optionen benennen, aber weiter systematisch prüfen','Filterreihenfolge verstehen bevor Abbruch']
persona['donts'] = ['Sofort nach dem ersten grauen Feld aufgeben','Antwort raten ohne Check']
persona['heuristics'] = ['Prefer thorough verification; try Drive Unit then Battery then Display before abandoning.']
print(json.dumps({
  'url': '$URL_PRODUKTKOMBINATIONEN',
  'max_steps': 15,
  'task': 'Kaufinteressenten-Perspektive (H5): Du planst einen eBike-Kauf und willst wissen, welche Displays zu einem Bosch Performance Line Motor passen. Nutze das Produktkombinationen-Tool. Denke laut auf Deutsch. Bewerte Nutzen/Reibung für dein Segment; benenne Verwirrung ehrlich. Beantworte F3.1 und F3.4. Erfolg = ehrliche Segment-Aussage, nicht Maximalexploration.',
  'persona': persona
}, ensure_ascii=False))
")
  run_job "B-aufgabe1-purchase-intent" "$PAYLOAD" "$OUTDIR/run-B-aufgabe1-purchase-intent.json"
done

echo ""
echo "=== SUMMARY ($EBM_DATE, $EBM_REPEATS waves) ==="
printf "%-30s | %-10s | %-6s | %s\n" "RUN TYPE" "STATUS" "STEPS" "FRICTION"
printf "%-30s-+-%-10s-+-%-6s-+-%s\n" "------------------------------" "----------" "------" "--------"
for row in "${RESULTS[@]}"; do
  IFS='|' read -r rt st stp fr <<< "$row"
  printf "%-30s | %-10s | %-6s | %s\n" "$(echo "$rt" | xargs)" "$(echo "$st" | xargs)" "$(echo "$stp" | xargs)" "$(echo "$fr" | xargs)"
done
