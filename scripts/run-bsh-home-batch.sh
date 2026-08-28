#!/usr/bin/env bash
set -euo pipefail

UX_JOURNEY_AGENT_URL="${UX_JOURNEY_AGENT_URL:-https://uxagent.projects-a.plygrnd.tech}"
BSH_REPEATS="${BSH_REPEATS:-5}"
BSH_DATE="${BSH_DATE:-$(date +%Y-%m-%d)}"
BSH_DRY_RUN="${BSH_DRY_RUN:-0}"
BSH_WAVE_OFFSET="${BSH_WAVE_OFFSET:-0}"
BSH_ONLY_RUN="${BSH_ONLY_RUN:-}"

BASE="$UX_JOURNEY_AGENT_URL"
UX_JOURNEY_AGENT_SECRET="${UX_JOURNEY_AGENT_SECRET:-}"
MAX_POLLS=90
POLL_INTERVAL=5

URL_PLP="https://www.bosch-home.com/de/produktliste/waschen-trocknen/waschmaschinen"
URL_PDP="https://www.bosch-home.com/de/produktliste/waschen-trocknen/waschmaschinen/frontlader-waschmaschinen/WGB244040"

PERSONA_ONLINE_BUYER='{"id":"persona-online-buyer","name":"Online-Käufer Mitte 30","traits":["Pragmatic: 0.80","Tech-savvy: 0.65","Price-conscious: 0.75"],"attentionSpan":"Mittel; vergleicht gern Preise und liest Bewertungen","interests":["Hausgeräte","Online-Shopping","Preisvergleich"],"stressTriggers":["Unklare Preise","Fehlende Lieferinformation","Verwirrende Buttons"],"dimensionOverrides":{"time_pressure":0.5,"exploration":0.6,"detail_orientation":0.6,"trust_skepticism":0.6,"risk_aversion":0.5}}'

PERSONA_CAUTIOUS_BUYER='{"id":"persona-cautious-buyer","name":"Vorsichtiger Käufer Ende 50","traits":["Patient: 0.80","Detail-oriented: 0.85","Brand-loyal: 0.70"],"attentionSpan":"Lang; liest genau, prüft Händleroptionen","interests":["Qualität","Markenvertrauen","Langlebigkeit"],"stressTriggers":["Unklare Kaufwege","Unverständliche Bezeichnungen","Fehlende Verfügbarkeit"],"dimensionOverrides":{"time_pressure":0.2,"exploration":0.7,"detail_orientation":0.85,"trust_skepticism":0.45,"risk_aversion":0.7}}'

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

  if [[ -f "$output_file" ]] && python3 -c "import json,sys; d=json.load(open('$output_file')); sys.exit(0 if d.get('status')=='complete' else 1)" 2>/dev/null; then
    local steps friction
    steps=$(python3 -c "import json; d=json.load(open('$output_file')); r=d.get('result') or {}; print(len(r.get('steps') or []))" 2>/dev/null || echo "?")
    friction=$(python3 -c "import json; d=json.load(open('$output_file')); r=d.get('result') or {}; sc=r.get('scorecard') or {}; print(sc.get('frictionScore','n/a'))" 2>/dev/null || echo "n/a")
    echo "  ↷ $run_type | skipped (already complete) | steps=$steps | friction=$friction"
    RESULTS+=("$run_type | complete | $steps | $friction")
    return 0
  fi

  if [[ "$BSH_DRY_RUN" == "1" ]]; then
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

should_run() {
  [[ -z "$BSH_ONLY_RUN" || "$BSH_ONLY_RUN" == "$1" ]]
}

for wave in $(seq 1 "$BSH_REPEATS"); do
  wave_num=$((wave + BSH_WAVE_OFFSET))
  echo ""
  echo "=== Wave $wave_num / $((BSH_WAVE_OFFSET + BSH_REPEATS)) ==="
  OUTDIR="knowledge/bsh-home-runs/$BSH_DATE/wave-$wave_num"
  mkdir -p "$OUTDIR"

  # A — Erstkontakt PLP: Waschmaschinen-Übersicht explorieren
  if should_run "A-plp-erstkontakt-preise"; then
  PAYLOAD=$(python3 -c "
import json
print(json.dumps({
  'url': '$URL_PLP',
  'max_steps': 15,
  'task': 'Du möchtest eine neue Waschmaschine von Bosch kaufen. Du landest auf der Übersichtsseite aller Bosch Waschmaschinen. Schau dich um, scrolle durch die Produkte. Denke laut auf Deutsch: Was fällt dir als Erstes auf? Wie wirken die Preise auf dich — hoch, niedrig, realistisch? Wie wirken Produkte ohne Preisangabe im Vergleich zu denen mit Preisen? Was vermutest du, kosten die Geräte beim Händler? Kommentiere ehrlich deinen Eindruck.',
  'persona': json.loads('$PERSONA_ONLINE_BUYER')
}, ensure_ascii=False))
")
  run_job "A-plp-erstkontakt-preise" "$PAYLOAD" "$OUTDIR/run-A-plp-erstkontakt-preise.json"
  fi

  # B — Preisvergleich: Wie vergleicht der User Preise?
  if should_run "B-preisvergleich"; then
  PAYLOAD=$(python3 -c "
import json
persona = json.loads('$PERSONA_ONLINE_BUYER')
persona['dos'] = ['Laut denken auf Deutsch','Preise aktiv vergleichen','Ehrlich sagen ob du parallel in einem anderen Tab suchen würdest']
persona['donts'] = ['Preise ignorieren','So tun als wäre alles klar']
print(json.dumps({
  'url': '$URL_PLP',
  'max_steps': 15,
  'task': 'Du willst eine Bosch Waschmaschine kaufen und möchtest den besten Preis finden. Schau dir die Übersichtsseite an. Denke laut auf Deutsch: Wie vergleichst du die Preise? Nutzt du den Händler-Button auf der Seite oder würdest du in einem separaten Tab bei Amazon, Idealo etc. nachschauen? Würdest du den Preisvergleich in der Realität so machen? Beschreibe ehrlich dein Vorgehen.',
  'persona': persona
}, ensure_ascii=False))
")
  run_job "B-preisvergleich" "$PAYLOAD" "$OUTDIR/run-B-preisvergleich.json"
  fi

  # C — Lieferbarkeit: Wie wird Verfügbarkeit wahrgenommen?
  if should_run "C-lieferbarkeit"; then
  PAYLOAD=$(python3 -c "
import json
persona = json.loads('$PERSONA_CAUTIOUS_BUYER')
persona['dos'] = ['Laut denken auf Deutsch','Lieferbarkeitsinformationen aktiv suchen','Ehrlich sagen was du tust wenn etwas nicht verfügbar ist']
persona['donts'] = ['Verfügbarkeitshinweise übersehen','Annehmen dass alles lieferbar ist']
print(json.dumps({
  'url': '$URL_PLP',
  'max_steps': 15,
  'task': 'Du suchst eine neue Bosch Waschmaschine. Schau dir die Übersichtsseite an und achte besonders auf die Lieferbarkeit. Denke laut auf Deutsch: Wie wichtig ist dir die Angabe, ob ein Produkt lieferbar ist? Was tust du, wenn ein Produkt nicht verfügbar ist — suchst du eine Alternative bei Bosch oder gehst du zu Google? Wie wirken Produkte auf dich, die keine Angabe zur Lieferbarkeit haben — denkst du, die sind gar nicht kaufbar? Beschreibe ehrlich.',
  'persona': persona
}, ensure_ascii=False))
")
  run_job "C-lieferbarkeit" "$PAYLOAD" "$OUTDIR/run-C-lieferbarkeit.json"
  fi

  # D — WTB-Button + Händler: Was erwartet der User hinter "Beim Händler kaufen"?
  if should_run "D-wtb-button-haendler"; then
  PAYLOAD=$(python3 -c "
import json
persona = json.loads('$PERSONA_ONLINE_BUYER')
persona['dos'] = ['Laut denken auf Deutsch','Den Button beim Händler kaufen aktiv suchen und kommentieren','Ehrlich sagen was du dahinter erwartest']
persona['donts'] = ['Den Button ignorieren','Nicht sagen ob Online- oder Offline-Händler gemeint ist']
print(json.dumps({
  'url': '$URL_PLP',
  'max_steps': 18,
  'task': 'Du siehst die Bosch Waschmaschinen-Übersicht. Finde den Button \"Beim Händler kaufen\" (oder ähnlich). Denke laut auf Deutsch: Warum würdest du diesen Button klicken oder nicht? Was erwartest du dahinter — einen Online-Händler wie Amazon oder einen lokalen Laden? Ist dir klar, welche Art von Händler gemeint ist (online vs. offline)? Wenn es nicht klar ist — wie müsste es formuliert werden? Klicke den Button und beschreibe, was passiert und wie es auf dich wirkt.',
  'persona': persona
}, ensure_ascii=False))
")
  run_job "D-wtb-button-haendler" "$PAYLOAD" "$OUTDIR/run-D-wtb-button-haendler.json"
  fi

  # E — PDP: Produktdetailseite + Kaufentscheidung
  if should_run "E-pdp-kaufentscheidung"; then
  PAYLOAD=$(python3 -c "
import json
persona = json.loads('$PERSONA_CAUTIOUS_BUYER')
persona['dos'] = ['Laut denken auf Deutsch','Beide Kaufbuttons kommentieren','Ehrlich sagen welchen Weg du bevorzugst']
persona['donts'] = ['Buttons ignorieren','Nicht zwischen Warenkorb und Händler unterscheiden']
print(json.dumps({
  'url': '$URL_PDP',
  'max_steps': 18,
  'task': 'Du bist auf der Detailseite einer Bosch Waschmaschine (WGB244040). Denke laut auf Deutsch: Was gefällt dir an dieser Seite, was weniger? Du siehst zwei Kaufoptionen: \"In den Warenkorb\" und \"Online kaufen beim Händler\". Wie wirken diese beiden Buttons auf dich? Was erwartest du hinter \"Online kaufen beim Händler\"? Welchen Button würdest du bevorzugen und warum? Was tust du, wenn das Produkt nicht schnell lieferbar ist? Beschreibe ehrlich deinen Eindruck und deine Kaufentscheidung.',
  'persona': persona
}, ensure_ascii=False))
")
  run_job "E-pdp-kaufentscheidung" "$PAYLOAD" "$OUTDIR/run-E-pdp-kaufentscheidung.json"
  fi

  # F — Fachhandel-Label: Wie wirkt "Nur im Fachhandel"?
  if should_run "F-fachhandel-label"; then
  PAYLOAD=$(python3 -c "
import json
persona = json.loads('$PERSONA_ONLINE_BUYER')
persona['dos'] = ['Laut denken auf Deutsch','Nach Auszeichnungen und Labels an den Produkten suchen','Ehrlich sagen ob Nur im Fachhandel abschreckend wirkt']
persona['donts'] = ['Labels ignorieren','Nicht kommentieren was du unter Fachhandel verstehst']
print(json.dumps({
  'url': '$URL_PLP',
  'max_steps': 15,
  'task': 'Du schaust dir die Bosch Waschmaschinen-Übersicht an. Achte besonders auf Auszeichnungen oder Labels an den Produkten. Denke laut auf Deutsch: Hast du die Auszeichnung \"Nur im Fach-Handel\" wahrgenommen? Wie wirkt diese Auszeichnung auf dich — ist das für dich relevant oder eher abschreckend? Was verstehst du unter Fach-Handel? Wie müsste es formuliert werden, damit es verständlich ist? Beschreibe ehrlich.',
  'persona': persona
}, ensure_ascii=False))
")
  run_job "F-fachhandel-label" "$PAYLOAD" "$OUTDIR/run-F-fachhandel-label.json"
  fi

done

echo ""
echo "=== SUMMARY ($BSH_DATE, $BSH_REPEATS waves) ==="
printf "%-30s | %-10s | %-6s | %s\n" "RUN TYPE" "STATUS" "STEPS" "FRICTION"
printf "%-30s-+-%-10s-+-%-6s-+-%s\n" "------------------------------" "----------" "------" "--------"
if ((${#RESULTS[@]} > 0)); then
for row in "${RESULTS[@]}"; do
  IFS='|' read -r rt st stp fr <<< "$row"
  printf "%-30s | %-10s | %-6s | %s\n" "$(echo "$rt" | xargs)" "$(echo "$st" | xargs)" "$(echo "$stp" | xargs)" "$(echo "$fr" | xargs)"
done
fi
