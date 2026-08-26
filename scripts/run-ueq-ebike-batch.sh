#!/usr/bin/env bash
set -euo pipefail

UX_JOURNEY_AGENT_URL="${UX_JOURNEY_AGENT_URL:-https://uxagent.projects-a.plygrnd.tech}"
UEQ_REPEATS="${UEQ_REPEATS:-3}"
UEQ_DATE="${UEQ_DATE:-$(date +%Y-%m-%d)}"
UEQ_DRY_RUN="${UEQ_DRY_RUN:-0}"
UEQ_WAVE_OFFSET="${UEQ_WAVE_OFFSET:-0}"
UEQ_ONLY_RUN="${UEQ_ONLY_RUN:-}"
UEQ_MAX_STEPS="${UEQ_MAX_STEPS:-20}"
UEQ_MAX_STEPS_UC3="${UEQ_MAX_STEPS_UC3:-18}"
UEQ_FORCE_RERUN="${UEQ_FORCE_RERUN:-0}"

BASE="$UX_JOURNEY_AGENT_URL"
UX_JOURNEY_AGENT_SECRET="${UX_JOURNEY_AGENT_SECRET:-}"
MAX_POLLS="${UEQ_MAX_POLLS:-180}"
POLL_INTERVAL=5

URL_HOME="https://www.bosch-ebike.com/de/"

PERSONA_EBIKER='{"id":"persona-ebiker-bosch","name":"Bosch eBike Fahrer","traits":["Owner: 0.95","Satisfied: 0.85","Tech-curious: 0.75"],"attentionSpan":"Mittel; sucht konkrete Infos zu Apps, Komponenten, Service","interests":["Flow App","Nachrüstung","Wartung","Marke"],"stressTriggers":["Unklare App-Nutzung","Versteckte Service-Infos","Überladene Seiten"],"dimensionOverrides":{"time_pressure":0.35,"exploration":0.65,"detail_orientation":0.7,"trust_skepticism":0.4,"risk_aversion":0.45}}'

PERSONA_INTERESSENT='{"id":"persona-ebike-interessent","name":"eBike Interessent","traits":["Consideration: 0.90","Comparison-shopper: 0.80","Uncertain: 0.55"],"attentionSpan":"Mittel; vergleicht Typen und Marken","interests":["eBike Typen","Alltagseinsatz","Technik-Vergleich","Markenwerte"],"stressTriggers":["Unklare Produktlinien","Fehlende Differenzierung","Marketing ohne Substanz"],"dimensionOverrides":{"time_pressure":0.45,"exploration":0.75,"detail_orientation":0.65,"trust_skepticism":0.6,"risk_aversion":0.55}}'

UEQ_SUFFIX=' Am Ende bewerte die Webseite spontan nach UEQ+ (1=linker Begriff, 7=rechter Begriff; Wichtigkeit 1=völlig unwichtig, 7=sehr wichtig). Nenne für jede Dimension alle 4 Gegensatzpaare als Zahl plus Wichtigkeit: Effizienz (langsam/schnell, ineffizient/effizient, unpragmatisch/pragmatisch, überladen/aufgeräumt), Durchschaubarkeit (unverständlich/verständlich, schwer-leicht zu lernen, kompliziert/einfach, verwirrend/übersichtlich), Stimulation (uninteressant/interessant, langweilig/spannend, minderwertig/wertvoll, einschläfernd/aktivierend), Intuitive Bedienung (mühevoll/mühelos, unlogisch/logisch, nicht einleuchtend/einleuchtend, nicht schlüssig/schlüssig), Inhaltsqualität (veraltet/aktuell, uninteressant/interessant, schlecht/gut aufbereitet, unverständlich/verständlich), Nützlichkeit (nutzlos/nützlich, nicht hilfreich/hilfreich, nicht vorteilhaft/vorteilhaft, nicht lohnend/lohnend). PFLICHT: UEQ+ nie auslassen — auch bei blockierter Navigation die sichtbaren Inhalte zusammenfassen und dann alle 24 Werte nennen. Optional: kurzes Freitext-Feedback.'

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

  if [[ -f "$output_file" ]] && [[ "$UEQ_FORCE_RERUN" != "1" ]] && python3 -c "import json,sys; d=json.load(open('$output_file')); sys.exit(0 if d.get('status')=='complete' else 1)" 2>/dev/null; then
    local steps friction
    steps=$(python3 -c "import json; d=json.load(open('$output_file')); r=d.get('result') or {}; print(len(r.get('steps') or []))" 2>/dev/null || echo "?")
    friction=$(python3 -c "import json; d=json.load(open('$output_file')); r=d.get('result') or {}; sc=r.get('scorecard') or {}; print(sc.get('frictionScore','n/a'))" 2>/dev/null || echo "n/a")
    echo "  ↷ $run_type | skipped (already complete) | steps=$steps | friction=$friction"
    RESULTS+=("$run_type | complete | $steps | $friction")
    return 0
  fi

  if [[ "$UEQ_DRY_RUN" == "1" ]]; then
    echo "[DRY_RUN] $run_type → $output_file"
    echo "$payload" | python3 -m json.tool
    RESULTS+=("$run_type | DRY_RUN | - | -")
    return 0
  fi

  if [[ -z "$UX_JOURNEY_AGENT_SECRET" ]]; then
    echo "FATAL: UX_JOURNEY_AGENT_SECRET is required for live runs" >&2
    exit 1
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

should_run() {
  # Empty → all. Supports exact id or comma-separated prefixes (e.g. C,D,E,F).
  if [[ -z "$UEQ_ONLY_RUN" ]]; then
    return 0
  fi
  local id="$1"
  local part
  local IFS=','
  # shellcheck disable=SC2086
  for part in $UEQ_ONLY_RUN; do
    part="${part#"${part%%[![:space:]]*}"}"
    part="${part%"${part##*[![:space:]]}"}"
    [[ -z "$part" ]] && continue
    if [[ "$id" == "$part" || "$id" == "$part"-* || "$id" == "$part"* ]]; then
      return 0
    fi
  done
  return 1
}

build_payload() {
  local persona_json="$1"
  local max_steps="$2"
  local task="$3"
  local start_url="${4:-$URL_HOME}"
  python3 -c "
import json
persona = json.loads('''$persona_json''')
persona['dos'] = ['Laut denken auf Deutsch', 'Navigation und Inhalte ehrlich kommentieren', 'UEQ+ Bewertung am Ende vollständig mit Zahlen nennen', 'Bei Navigationsproblemen sichtbare Inhalte nutzen und trotzdem UEQ+ abgeben']
persona['donts'] = ['Screenshots hochladen (nicht möglich)', 'UEQ+ Bewertung auslassen', 'Endlos ohne Abschluss weiterklicken']
print(json.dumps({
  'url': '$start_url',
  'max_steps': $max_steps,
  'task': '''$task''' + '''$UEQ_SUFFIX''',
  'persona': persona
}, ensure_ascii=False))
"
}

for wave in $(seq 1 "$UEQ_REPEATS"); do
  wave_num=$((wave + UEQ_WAVE_OFFSET))
  echo ""
  echo "=== Wave $wave_num / $((UEQ_WAVE_OFFSET + UEQ_REPEATS)) ==="
  OUTDIR="knowledge/ueq-ebike-runs/$UEQ_DATE/wave-$wave_num"
  mkdir -p "$OUTDIR"

  if should_run "A-UC1-ebiker-fahrerlebnis"; then
  TASK='Use Case 1 (eBiker): Du besitzt ein eBike mit Bosch Komponenten. Informiere dich über neue Komponenten, Apps und besonders die Flow App (Vorteile, Nutzung). Starte auf der Startseite, öffne den Bereich „Erweitere dein Erlebnis“ / Flow App („Mehr erfahren“). Denke laut auf Deutsch. Ziel: konkrete Flow-App-Vorteile verstehen. Wenn Klicks scheitern: beschreibe sichtbare Flow-Inhalte auf der Startseite, fasse den Use Case ab, dann UEQ+.'
  PAYLOAD=$(build_payload "$PERSONA_EBIKER" "$UEQ_MAX_STEPS" "$TASK")
  run_job "A-UC1-ebiker-fahrerlebnis" "$PAYLOAD" "$OUTDIR/run-A-UC1-ebiker-fahrerlebnis.json"
  fi

  if should_run "B-UC1-interessent-orientierung"; then
  TASK='Use Case 1 (Interessent): Du überlegst ein eBike zu kaufen. Informiere dich über eBike-Typen (eCity, eMTB, eTrekking) und Nutzungssituationen (Alltag, Sport, Freizeit, Transport). Öffne mindestens einen Typ-Teaser. Denke laut auf Deutsch: Vorteile, Alltagseinsatz, Entscheidungsnähe. Dann UEQ+.'
  PAYLOAD=$(build_payload "$PERSONA_INTERESSENT" "$UEQ_MAX_STEPS" "$TASK")
  run_job "B-UC1-interessent-orientierung" "$PAYLOAD" "$OUTDIR/run-B-UC1-interessent-orientierung.json"
  fi

  if should_run "C-UC2-ebiker-service"; then
  TASK='Use Case 2 (eBiker): Suche Service-Angebote: Wartung, Ersatzteile, Hilfe, Pflege, Zubehör. Öffne „Service & Beratung“ in der Navigation (oder Service-Bereich). Denke laut auf Deutsch: Was findest du, was fehlt, wie vertrauenswürdig? Bei Navigationsproblemen: sichtbare Service-Hinweise auf Startseite/Footer nutzen, Use Case abschließen, dann UEQ+.'
  PAYLOAD=$(build_payload "$PERSONA_EBIKER" "$UEQ_MAX_STEPS" "$TASK")
  run_job "C-UC2-ebiker-service" "$PAYLOAD" "$OUTDIR/run-C-UC2-ebiker-service.json"
  fi

  if should_run "D-UC2-interessent-technik"; then
  TASK='Use Case 2 (Interessent): Vergleiche Bosch eBike Systems mit anderen Marken. Informiere dich über Display, Akku, DriveUnit, Technologien. Öffne den System-/Produktbereich. Denke laut auf Deutsch: Mehrwert klar? Was überzeugt/fehlt? Dann UEQ+.'
  PAYLOAD=$(build_payload "$PERSONA_INTERESSENT" "$UEQ_MAX_STEPS" "$TASK")
  run_job "D-UC2-interessent-technik" "$PAYLOAD" "$OUTDIR/run-D-UC2-interessent-technik.json"
  fi

  if should_run "E-UC3-ebiker-ueber-uns"; then
  TASK='Use Case 3 (eBiker): Erfahre mehr über die Marke. Öffne „Über uns“ in der Navigation. Suche Infos zu Unternehmen, Geschichte, Sicherheit, Nachhaltigkeit, Qualität. Denke laut auf Deutsch: Glaubwürdigkeit, Relevanz. Wenn Link blockiert: nutze sichtbare Marken-/Qualitätsinhalte auf der Startseite, schließe ab, dann UEQ+.'
  PAYLOAD=$(build_payload "$PERSONA_EBIKER" "$UEQ_MAX_STEPS_UC3" "$TASK")
  run_job "E-UC3-ebiker-ueber-uns" "$PAYLOAD" "$OUTDIR/run-E-UC3-ebiker-ueber-uns.json"
  fi

  if should_run "F-UC3-interessent-ueber-uns"; then
  TASK='Use Case 3 (Interessent): Bosch als Kaufoption — verstehe wofür Bosch eBike Systems steht. Öffne „Über uns“: Werte, Innovation, Sicherheit, Nachhaltigkeit. Denke laut auf Deutsch: Steigt Vertrauen? Was fehlt? Bei Navigationsproblemen: Startseiten-Inhalte zu Qualität/Sicherheit nutzen, abschließen, dann UEQ+.'
  PAYLOAD=$(build_payload "$PERSONA_INTERESSENT" "$UEQ_MAX_STEPS_UC3" "$TASK")
  run_job "F-UC3-interessent-ueber-uns" "$PAYLOAD" "$OUTDIR/run-F-UC3-interessent-ueber-uns.json"
  fi

done

echo ""
echo "=== SUMMARY ($UEQ_DATE, $UEQ_REPEATS waves) ==="
printf "%-35s | %-10s | %-6s | %s\n" "RUN TYPE" "STATUS" "STEPS" "FRICTION"
printf "%-35s-+-%-10s-+-%-6s-+-%s\n" "-----------------------------------" "----------" "------" "--------"
if ((${#RESULTS[@]} > 0)); then
for row in "${RESULTS[@]}"; do
  IFS='|' read -r rt st stp fr <<< "$row"
  printf "%-35s | %-10s | %-6s | %s\n" "$(echo "$rt" | xargs)" "$(echo "$st" | xargs)" "$(echo "$stp" | xargs)" "$(echo "$fr" | xargs)"
done
fi
