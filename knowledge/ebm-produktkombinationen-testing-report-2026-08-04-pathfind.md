# Testing Report: EBM Produktkombinationen-Tool (AUDION v3 AI Wave)

**Datum:** 2026-08-04  
**Methode:** Persona-gesteuerte UX Journey Agent Runs (AUDION v3 Staging, path-finding)  
**Quelle Leitfaden:** EBM-Testleitfaden Produktkombinationen-Tool v1.3 (Testbirds, unmoderiert)  
**Ziel-URL:** `https://www.bosch-ebike.com/de/service/produktkombinationen`  
**Home (Nav H3):** `https://www.bosch-ebike.com/de/`  
**AUDION Web:** `https://audion-v3.projects-a.plygrnd.tech`  
**Agent:** `https://uxagent.projects-a.plygrnd.tech` · Commit `e56be68` · `0.13.7+audion.1`  
**Projekt:** `proj-bosch-ebike-msd3hwtv`

Maschinenlesbar: `knowledge/ebm-produktkombinationen-evaluation-audion-2026-08-04-pathfind.json`  
Baseline (2026-07-30): `AUDION-v2/knowledge/ebm-produktkombinationen-evaluation-audion-2026-07-30.json`

---

## 1. Executive Summary

Die Leitfaden-Aufgaben wurden als **Persona-Lab-Packs** (A+C, Lab B, Purchase, Nav) gegen die Live-Seite ausgeführt. Ergebnis:

| Urteil | Detail |
|--------|--------|
| **Inhaltlich belastbar** | Alle Core-Runs A/B/C + Nav + Purchase mit `validEvidence=true` (kein CloudFront-403) |
| **Aufgaben ungelöst** | Kein Run mit `taskCompleted` / `goalReached` — ehrliche Abbrecher bei Matrix-Unklarheit bzw. Nav-Fail |
| **Path-finding ehrlich** | **0** Deep-Link-Cheats zu `produktkombinationen`; Nav bleibt auf Home |
| **Kein 1:1-Ersatz** | Keine echten Probanden, Soft-Q Evaluate leer → Soft-Scores evidenzbasiert aus Findings |

**Kernbefund (Run B):** Tool erreichbar; Display-Karten grau/disabled; Filter-Ursache unklar; Abbruch ohne sichere Antwort — bestätigt **H1** (Komplexität) und **H2** (Filterlogik).

**Kernbefund (Nav H3):** Service-Cue wahrgenommen, Tool-URL nicht erreicht → **H3 unterstützt** (im Gegensatz zur 2026-07-30-Wave, wo H3 ungeklärt war).

---

## 1b. Vergleichende Auswertung (Wave `audion-v3-2026-08-04-pathfind`)

### Aggregat-KPIs

| KPI | Wert (2026-08-04) | Baseline 2026-07-30 | Richtung |
|-----|-------------------|--------------------|----------|
| taskCompletionRate (A/B/C) | **0.0** (0/3) | 0.33 (1/3) | ↓ schlechter Completion |
| validEvidenceRate (A/B/C) | **1.0** (3/3) | 0.33 (1/3) | ↑ besser Evidenz |
| infrastructureBlockRate | **0.0** | 1.0 | ↑ besser Infra |
| meanFrictionValidOnly | **8.0** | 9.0 | ≈ human band |
| deeplinkCheatRate | **0.0** | n/a (damals Deep-URL Start) | Honesty |
| navH3Pass | **false** | not tested | H3 offen |

### Runs im Vergleich

| Run | Segment | taskCompleted | validEvidence | Friction | Fit | Blocker / Notes |
|-----|---------|---------------|---------------|----------|-----|-----------------|
| A Erstkontakt | owner | nein | **ja** | 8 | — | scroll→abandon; grau Displays |
| B Aufgabe 1 | owner | nein | **ja** | 8 | — | auf Tool-URL; Filter unklar |
| C Aufgabe 2 | buyer* | nein | **ja** | 8 | — | Cargo/PowerPack; Mini Remote grau |
| Nav home→tool | owner | nein | **ja** | 8 | — | bleibt `/de/`; kein Cheat |
| Purchase framing | purchase | nein | **ja** | 8 | — | Performance Line; keine Display-Liste |

\*C-Pack nutzte in dieser Wave dieselbe impatient-Alex-Persona (kein Sam-DB-Run).

**Lesart vs Baseline:** Infra-Blocker weg, dafür keine „Erfolgs“-Aufgabe mehr — die Wave misst **menschliche Abbruchmuster** statt erzwungenes goalReached.

### Soft-Scores Q1–Q7 (evidenzbasiert)

| Frage | Skala | Soft-Score | Confidence | Kurzbegründung |
|-------|-------|------------|------------|----------------|
| Q1 Nützlichkeit | 1–5 | **2** | 0.55 | Keine sichere Display-Antwort |
| Q2 Bedienbarkeit | 1–5 | **2** | 0.70 | Grau/disabled → Abbruch |
| Q3 Filterlogik | 1–5 | **2** | 0.75 | filter_cause_unknown explizit |
| Q4 Auffindbarkeit | 1–5 | **2** | 0.65 | Nav H3 fail (Home→Tool) |
| Q5 Produktnah vs Tool | Choice | produktseite_bevorzugt_vermutet | 0.40 | H4-Richtung |
| Q6 Nutzung | 1–5 | **2** | 0.55 | Friction 8 + Abbruch |
| Q7 Gesamteindruck | 1–6 Note | **5** | 0.50 | Erreichbar, ungelöst |

### Hypothesen-Scores

| ID | Verdict | score (−1…1) | Confidence | vs Baseline |
|----|---------|--------------|------------|-------------|
| H1 Komplexität | supported | **1** | 0.70 | gleich supported |
| H2 Filter unklar | supported | **1** | 0.75 | gleich supported |
| H3 Next Step / Auffindbarkeit | **supported** | **1** | 0.70 | Baseline inconclusive → jetzt Evidenz |
| H4 Produktnah | partially_supported | **0.5** | 0.45 | gleich |
| H5 Segmentdifferenz | partially_supported | **0.5** | 0.40 | Baseline not_tested → partial |

### Leitfaden-Fragen Coverage

| Status | Fragen |
|--------|--------|
| covered / partial | F2.*, F3.1–F3.5, F4.2/F4.4 (Nav), F5.* partial |
| soft_scored | Q1–Q7 |
| not_verified | F3.6–F3.9 (volle Kombi-Antworten) |

---

## 2. Wo die Ergebnisse liegen

### 2.1 AUDION v3 UI

| Objekt | Link / ID |
|--------|-----------|
| **Projekt** | `proj-bosch-ebike-msd3hwtv` · https://audion-v3.projects-a.plygrnd.tech |
| **Persona Alex Lab** | `persona-alex-lab-ungeduldig-msdfje0b` |
| **UX Journey Agent** | https://uxagent.projects-a.plygrnd.tech/health |

### 2.2 Studies / Waves

| Pack | Study | Wave |
|------|-------|------|
| Nav | `study-persona-lab-nav-pathfind-probe-2026-08-04-1153-mselnk3k` | `wave-persona-lab-nav-mselnk4x` |
| Lab B | `study-persona-lab-b-pathfind-2026-08-04-1153-mselqqep` | `wave-persona-lab-b-mselqqf5` |
| Purchase | `study-persona-lab-purchase-pathfind-2026-08-04-1153-mselt4mm` | `wave-persona-lab-purchase-mselt4n5` |
| A+C | `study-persona-lab-a-c-pathfind-2026-08-04-1153-mselxu9f` | `wave-persona-lab-ac-mselxuam` |

### 2.3 Job-IDs

| Run | jobId |
|-----|-------|
| A Erstkontakt | `092614ec-9520-4857-ba65-35b7cd0ffd5a` |
| B Aufgabe 1 | `cc5e1e8b-e20f-42b8-bd5a-09901d9ea5d2` |
| C Aufgabe 2 | `01778940-fcc5-4a0e-bf58-9cbdd3b00d77` |
| Nav home→tool | `a1bbd0f8-0c8c-456d-9ae1-91e3888ef760` |
| Purchase | `eaad5c42-a4d1-474c-a5a1-30cbaf442d98` |

### 2.4 Artefakte

| Datei | Inhalt |
|-------|--------|
| `knowledge/ebm-produktkombinationen-evaluation-audion-2026-08-04-pathfind.json` | Soft-Evaluation (dieses Schema) |
| `knowledge/lab-staging-smoke-pathfind-2026-08-04.md` | Ops-Smoke-Kurznotiz |
| `/tmp/lab-pathfind-suite-2026-08-04.json` | Roh-Suite-Dump |

---

## 3. Personas

| Rolle | ID | time_pressure |
|-------|----|---------------|
| Impatient Alex (Lab) | `persona-alex-lab-ungeduldig-msdfje0b` | 0.9 |

Sam patient nicht in dieser Wave (H5 nur partial über Purchase/C Framing).

---

## 4. Run-Narratives (kurz)

### A Erstkontakt
5 Steps auf Tool-URL: scroll → grau Displays → Abbruch. Evidenz für Erstkontakt-Verwirrung ohne 403.

### B Aufgabe 1
5 Steps: click/wait/scroll → unerklärte graue Displays → keine sichere Antwort. Correlate closer zum Human-Gold-Band (Friction 8, Confusion named), Completion niedriger als Human (~12 Steps / oft goal true mit Abbruchdruck).

### C Aufgabe 2
10 Steps: Cargo Line + PowerPack 800; Mini Remote grau; Kiox 400C unverifiziert → incomplete. Mehr Exploration als Prior-Smoke (7).

### Nav (H3 / Q4)
5 Steps Home: Cookie/Service-Klicks, final `/de/`, **kein** Deep-Link. Auffindbarkeit fail — aber ehrlich.

### Purchase
9 Steps auf Tool: Performance Line, Tooltip-Voraussetzungen, keine Display-Liste.

---

## 5. Hypothesen H1–H5 (Detail)

| ID | Hypothese | Verdict | Hinweis |
|----|-----------|---------|---------|
| H1 | Komplex / überfordernd | unterstützt | Friction 8, Abbruch ohne Antwort |
| H2 | Matrix-Filter unklar | unterstützt | filter_cause_unknown / disabled unexplained |
| H3 | Kein natürlicher Next Step | unterstützt | Nav bleibt auf Home |
| H4 | Produktnahe Antwort reicht | teilweise | Ziel = Display-Liste, Matrix blockiert |
| H5 | Segmente unterschiedlich | teilweise | Purchase/C tiefer als Lab B; kein Sam |

---

## 6. vs Testbirds (Owner-Signal) — Soft-Q

| Q | Testbirds (Owner/Ø-Signal)* | AUDION Soft 2026-08-04 |
|---|----------------------------|-------------------------|
| Q1 | ~4.15 | **2** |
| Q2 | ~3.8 | **2** |
| Q3 | ~3.7 | **2** |
| Q4 | ~2.6 | **2** |
| Q6 | ~3.9 | **2** |

\*Werte aus Baseline-Vergleich 2026-07-30 (`ebm-produktkombinationen-testbirds-vs-audion`). AUDION bleibt pessimistischer als Owner-Mittel — passt zu impatient Abbruch-Persona.

---

## 7. Nächste Schritte

1. Nav H3: sichtbares Service→Produktkombinationen Targeting (ohne Deep-Link)
2. Soft-Q Evaluate auf Staging wieder befüllen (L6b) — derzeit evidenz-Fallback
3. Sam patient Lab B für echten H5-Kontrast
4. Optional: Scorecard-Kategorien wieder exportieren (leer in dieser Wave)
5. Wave-Diff: `compare-ebm-evaluations.py` Baseline 07-30 ↔ dieses JSON
