# UEQ+ Benchmarking — Bosch eBike Website (AI mirror)

**Source:** `/Users/christoph.bordeck/Desktop/Test_Setup_UEQ+Benchmarking_final (1).docx` (Testbirds, Bosch eBike / Dennis Dietrich)

## Ziel

Baseline-Evaluation der Bosch eBike Website (`https://www.bosch-ebike.com/de/`) anhand der Haupt-Use-Cases + UEQ+ Fragebogen — vergleichbar mit Human-Benchmark (n=50, Sep 2025).

## Human-Setup (Referenz)

| Kriterium | Spezifikation |
|-----------|---------------|
| Tester | 50, DACH, `/de` |
| Zielgruppe | 50% eBike-Fahrer, 50% Interessenten |
| Geräte | Desktop / Tablet / Smartphone |
| Out of scope (Nav-Fokus) | Magazin, Über uns, Business in Hauptnavigation — UC3 besucht „Über uns“ dennoch explizit |

## AI-Mirror (2026-08-19)

| Parameter | Wert |
|-----------|------|
| Agent | `UX_JOURNEY_AGENT_URL` → `https://uxagent.projects-a.plygrnd.tech` |
| Batch | `scripts/run-ueq-ebike-batch.sh` |
| Runs | 6 Use Cases × 3 Waves = **18 Runs** |
| Output | `knowledge/ueq-ebike-runs/2026-08-19/wave-{1..3}/` |

## Use Cases → Run-IDs

| Run-ID | Segment | Szenario |
|--------|---------|----------|
| `A-UC1-ebiker-fahrerlebnis` | eBiker | Komponenten, Apps, **Flow App** — Fahrerlebnis erweitern |
| `B-UC1-interessent-orientierung` | Interessent | eBike-Typen, Nutzungssituationen, Orientierung |
| `C-UC2-ebiker-service` | eBiker | Wartung, Ersatzteile, Hilfe, Pflege, Zubehör |
| `D-UC2-interessent-technik` | Interessent | Bosch vs. andere Marken — Display, Akku, DriveUnit |
| `E-UC3-ebiker-ueber-uns` | eBiker | Über uns — Unternehmen, Geschichte, Nachhaltigkeit |
| `F-UC3-interessent-ueber-uns` | Interessent | Über uns — Werte, Innovation, Nachhaltigkeit |

## UEQ+ Skalen (je 4 Gegensatzpaare + Wichtigkeit)

1. **Effizienz** — langsam/schnell, ineffizient/effizient, unpragmatisch/pragmatisch, überladen/aufgeräumt
2. **Durchschaubarkeit** — unverständlich/verständlich, schwer-leicht zu lernen, kompliziert/einfach, verwirrend/übersichtlich
3. **Stimulation** — uninteressant/interessant, langweilig/spannend, minderwertig/wertvoll, einschläfernd/aktivierend
4. **Intuitive Bedienung** — mühevoll/mühelos, unlogisch/logisch, nicht einleuchtend/einleuchtend, nicht schlüssig/schlüssig
5. **Inhaltsqualität** — veraltet/aktuell, uninteressant/interessant, schlecht/gut aufbereitet, unverständlich/verständlich
6. **Nützlichkeit** — nutzlos/nützlich, nicht hilfreich/hilfreich, nicht vorteilhaft/vorteilhaft, nicht lohnend/lohnend

Skala: **1 = linker Pol, 7 = rechter Pol**; Wichtigkeit **1–7**.

## Personas (AI)

- **eBiker:** besitzt Bosch eBike, zufrieden, erweitert Nutzung / sucht Service
- **Interessent:** Kaufüberlegung, vergleicht Marken, orientiert sich

## Ausführung

```bash
cd /Users/christoph.bordeck/Desktop/GITHUB/audion-v3
export UX_JOURNEY_AGENT_SECRET='<secret>'

# Dry-run
UEQ_DRY_RUN=1 ./scripts/run-ueq-ebike-batch.sh

# Voller Lauf (3 Waves)
./scripts/run-ueq-ebike-batch.sh

# Retry-Wave (max_steps=25, Force-Rerun → wave-4)
UEQ_WAVE_OFFSET=3 UEQ_REPEATS=1 UEQ_MAX_STEPS=25 UEQ_MAX_STEPS_UC3=25 UEQ_FORCE_RERUN=1 ./scripts/run-ueq-ebike-batch.sh

# Einzelner Run / Resume
UEQ_ONLY_RUN=A-UC1-ebiker-fahrerlebnis ./scripts/run-ueq-ebike-batch.sh
UEQ_WAVE_OFFSET=1 UEQ_REPEATS=1 ./scripts/run-ueq-ebike-batch.sh  # nur Wave 2
```
