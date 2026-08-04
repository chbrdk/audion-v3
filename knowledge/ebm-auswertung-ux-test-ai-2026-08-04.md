# Auswertung UX Test ‚Produktkombinationen & Nachrüsten‘ — AUDION AI

**Unmoderierter Nutzertest (AI-Reproduktion)**  
Mischung aus Leitfaden-Fragen und agentischen Think-Alouds (Persona Lab) zum Bosch eBike Produktkombinationen-Tool.

| | |
|--|--|
| **Methode** | AUDION v3 UX Journey Agent · Persona Alex Lab Ungeduldig |
| **Stichprobe** | 5 AI-Runs (A / B / C / Nav / Purchase) · Desktop Chromium |
| **Datum** | 2026-08-04 |
| **Agent** | `e56be68` · browser-use `0.13.7+audion.1` · path-finding (kein Deep-Link-Cheat) |
| **Staging** | https://audion-v3.projects-a.plygrnd.tech · Agent https://uxagent.projects-a.plygrnd.tech |
| **Projekt** | `proj-bosch-ebike-msd3hwtv` |
| **Leitfaden** | EBM-Testleitfaden Produktkombinationen-Tool v1.3 (Testbirds) |
| **Human-Referenz** | `EBM-Auswertung UX Test 'Produktkombinationen & Nachrüsten'-200726-065814.pdf` (n=17) |
| **Maschinenlesbar** | `knowledge/ebm-produktkombinationen-evaluation-audion-2026-08-04-pathfind.json` |

**Qualitätssicherung:** Soft-Q Evaluate auf Staging war leer → Soft-Scores evidenzbasiert aus Findings/Think-Alouds (analog KI-Auswertung mit menschlicher QS im Human-PDF). Konfidenz explizit pro Frage.

---

## Methodik: Wie wir die Auswertung durchgeführt haben

### SCHRITT 1 — Auswertung der Runs
5 Agent-Runs sortiert nach Leitfaden-Blöcken (Erstkontakt, Aufgabe 1, Aufgabe 2, Auffindbarkeit, Purchase-Framing). Pro Frage: qualitative Tendenz, belegende Think-Aloud-Zitate, Konfidenz-Level.

### SCHRITT 2 — Queranalysen & Hypothesen
Runs als „Karteikarten“ (Finding + Friction + Actions + finalUrl). Queranalyse über Segmente (owner_upgrade vs purchase_intent Framing) und Hypothesen-Validierung H1–H5 mit Ampel wie im Human-PDF.

### SCHRITT 3 — Handlungsempfehlungen
Ableitung aus Schritt 1+2 mit Priorisierung (Quick Win / Mittelfristig). Menschliche Einordnung: AI misst **ehrliche Abbruchmuster**, nicht erzwungenes goalReached.

Zum Schluss: Stärken-Schwächen-Analyse und Learnings (Synthese).

**Dokumente parallel zum Human-Set:**

| Human-PDF-Set | AI-Gegenstück |
|---------------|---------------|
| Auswertung Transkripte | dieses Dokument (F2–F5 + Think-Alouds) |
| Queranalysen / Karteien | § Soft-Q + Segment-Notizen |
| Handlungsempfehlungen | § Handlungsempfehlungen |
| Eval JSON | `…evaluation-audion-2026-08-04-pathfind.json` |

---

## Selbsteinschätzung der „Probanden“ (AI-Persona)

Kein Screener n=17 — stattdessen **eine** Lab-Persona, mehrfach über Aufgaben:

| Merkmal | AI Wave |
|---------|---------|
| Persona | Alex Lab Ungeduldig (`persona-alex-lab-ungeduldig-msdfje0b`) |
| time_pressure | 0.9 (impatient) |
| Verhältnis zu eBikes (Proxy) | Owner / Nachrüst-Framing (Lab B + A) bzw. Purchase-Framing |
| Wissen Technik (Proxy) | Lab „Basics+“ — kennt Teile, bricht bei Unklarheit ab |
| Device | Desktop |
| Runs | A 5 · B 5 · C 10 · Nav 5 · Purchase 9 Steps |

**Grundsätzliche Einordnung der Testergebnisse (AI)**

Das Tool **erreicht** seinen Zweck technisch (Seite lädt, Matrix sichtbar) — die impatient AI-Persona **kommt aber nicht zu einer sicheren Antwort** und bricht ab. Für Auffindbarkeit (Home→Tool) scheitert sie trotz Service-Cue — ehrlich, ohne Deep-Link.

Die drei zentralen Handlungsfelder (wie Human): **Auffindbarkeit verbessern**, **Schrittlogik im Tool kommunizieren**, **Nutzer dort abholen, wo sie suchen**.

Drei-Wege-Strategie bleibt die strategische Antwort: (a) usability-optimiertes Voll-Tool für Nachrüster, (b) produktnaher Kompatibilitätshinweis, (c) explorative Nachrüstseite.

---

## Validierung Hypothesen

**Legende (wie Human-PDF):**  
Hypothesen negativ formuliert — Bestätigung = schlechte UX.  
🟢 geringer Handlungsbedarf · 🟡 Anpassungen empfohlen · 🔴 kritisch / dringend

| ID | Hypothese | Ampel | Status | Kernerkenntnis (AI) |
|----|-----------|-------|--------|---------------------|
| **H1** | Tool wird von der Mehrheit als komplex/überfordernd wahrgenommen | 🟡 | **Teilweise bestätigt** (härter als Human-Experten) | Impatient Persona bricht bei grau/Filter ab — keine pauschale „alle“, aber klare Überforderung in dieser Persona-Bandbreite. |
| **H2** | Nutzer verstehen Matrix-Filter nicht (Ausblend-Warum) | 🟡→🔴 Tendenz | **Bestätigt** (AI härter) | Explizit `filter_cause_unknown` / `disabled_option_unexplained` in B, Purchase, C. |
| **H3** | Tool passt nicht zur natürlichen Journey / kein Next Step / schlecht auffindbar | 🔴 | **Bestätigt** | Nav: bleibt auf `/de/`; Service-Cue gesehen; Tool-URL nicht erreicht; 0 Deep-Link-Cheats. |
| **H4** | Mehrheit braucht eher produktnahe einfache Antwort als volle Matrix | 🟡 | **Teilweise bestätigt** | Ziel = Display-Liste; Matrix liefert keine sichere Antwort → Abbruch. |
| **H5** | Kaufinteressenten vs. Besitzer bewerten Nutzen unterschiedlich | 🟢→🟡 | **Teilweise bestätigt** | Purchase/C explorieren länger (9/10 Steps) als Lab B (5); gleicher Friction 8; kein Sam-Patient. |

**Abgleich Human-PDF vs AI (Kalibrierung):**

| | Human (n=17) | AI Wave 2026-08-04 |
|--|--------------|-------------------|
| H1 | 🟡 teilweise (wissensabhängig) | 🟡 teilweise / AI härter (Abbruch) |
| H2 | 🟡 teilweise | 🟡/🔴 bestätigt (explizite Confusion) |
| H3 | 🔴 bestätigt | 🔴 bestätigt (Nav gemessen) |
| H4 | 🟡 teilweise | 🟡 teilweise |
| H5 | 🟢 bestätigt | 🟡 teilweise (kein Sam) |

---

## Testfragen Details

### Erster Eindruck

#### F2.1 — Zweck der Seite?
**Tendenz (AI):** Run A/B rahmen die Seite als Kompatibilitäts-/Display-Suche („kompatible Displays finden“), nicht als Autokonfigurator-Wortlaut — näher am Kernnutzen als viele Human-Probanden, aber ohne „Konfigurator“-Metapher.

**Zitat (Agent):**  
> „Ich will kompatible Displays finden … Display-Karten grau/disabled … keine sichere Antwort.“

**Konfidenz:** mittel (nur Think-Aloud, kein Screener F2.1-Wortlaut).

#### F2.2 — Was fällt zuerst auf?
**Tendenz (AI):** Ausgrauung/Disabled dominiert — deckungsgleich mit Human.

**Zitat:**  
> „Display-Karten grau/disabled … Filter-Ursache unklar warum … Confusion: disabled_option_unexplained“

**Konfidenz:** hoch.

---

### Aufgabe 1 — Kompatibilität prüfen (Performance Line → Displays)

#### F3.1 — Wie einfach/schwer war die Antwort?
**Tendenz (AI):** Nicht gelöst — Abbruch nach 5 Steps (Lab B) bzw. 9 (Purchase). Human: Mehrheit lösbar aber mühsam. AI impatient: **schwer → Abbruch**.

**Konfidenz:** hoch.

#### F3.2 — Verhalten wie erwartet?
**Tendenz (AI):** Nein — grau ohne Erklärung, keine sichere Liste.

**Zitat (Purchase):**  
> „Performance Line blau ausgewählt; Display-Karten grau/disabled; Tooltip-Voraussetzung für Kiox 300 … keine sichere direkte Display-Liste“

**Konfidenz:** hoch.

#### F3.3 / F3.4 — Displays finden / Ergebnisqualität
**Tendenz (AI):** Keine verifizierte Display-Liste; taskCompleted=false.

**Konfidenz:** hoch.

#### F3.7 / F3.8 / F3.9 — Was hätte geholfen / Next Step?
**Tendenz (AI):** Implizit: Erklärung warum grau + klarer Weg. Nav zusätzlich: natürlicher Einstieg fehlt.

**Konfidenz:** mittel (aus Abbruch, nicht aus expliziter F3.8-Antwort).

---

### Aufgabe 2 — Vierer-Kombination

#### F3.5 — Kombination zusammenstellen?
**Tendenz (AI):** Teilweise — Cargo Line + PowerPack 800 gewählt; Mini Remote ausgegraut; Kiox 400C nicht verifiziert; **unvollständig** (10 Steps).

**Zitat:**  
> „Cargo Line blau … PowerPack 800 blau … Mini Remote ausgegraut; Kiox 400C nicht im aktuellen Ausschnitt verifiziert … vollständige Auswahl nicht verifiziert.“

**Konfidenz:** hoch.

#### F3.6 — Warum ausgegraut?
**Tendenz (AI):** Unklar — `filter_cause_unknown`. Match Human.

**Konfidenz:** sehr hoch.

---

### Auffindbarkeit & Nutzen

#### F4.1 — Nützlichkeit persönlich?
**Tendenz (AI Soft Q1=2):** Für diese Persona wenig nützlich, weil keine sichere Antwort. Human Owner oft 4–5 — AI pessimistischer (impatient).

**Konfidenz:** mittel.

#### F4.2 — Wo auf der Startseite zuerst schauen?
**Tendenz (AI Nav):** Service-Cue wahrgenommen, aber **kein** erfolgreicher Pfad zum Tool; finalUrl `/de/`.

**Zitat:**  
> „Startseite geladen … service als möglicher Einstieg … Weg zum Ziel zählt …“ (bleibt auf Home)

**Konfidenz:** hoch — stärkster AI-Befund zu H3/Q4.

#### F4.4 / F4.5 — Produktnahe Info / Nachrüstseite
**Tendenz (AI):** H4 partial — Matrix blockiert sichere Kurzantwort → produktnaher Hinweis würde helfen (ableitend).

**Konfidenz:** mittel.

---

### Abschluss

#### F5.1 — Freund erklären / lohnt es sich?
**Tendenz (AI):** Würde eher abraten / „nur mit Erklärung der Filter“ — analog Human-Einsteiger-Zitat „eher verwirrt“. Soft Q7=5 (Schulnote).

**Konfidenz:** mittel.

---

## Abschlussumfrage (Soft-Q) — AI vs Human-Signale

| Frage | Skala | AI Soft | Human-Signal (n=17) | Lesart |
|-------|-------|---------|---------------------|--------|
| Q1 Nützlichkeit | 1–5 | **2** | 76% ≥4; Owner ~4,1 | AI zu pessimistisch vs Owner; Match Einsteiger-Band |
| Q2 Bedienbarkeit | 1–5 | **2** | Experten besser als Einsteiger | Match Reibung |
| Q3 Filterlogik | 1–5 | **2** | oft „verstanden nach Ausprobieren“ | AI härter (Abbruch vor Verständnis) |
| Q4 Auffindbarkeit | 1–5 | **2** | **Ø 2,6** (schlechtester Wert) | **Starker Match** |
| Q5 Produktnah vs Tool | Choice | produktseite_vermutet | ~50/50 segmentspezifisch | Richtung H4 |
| Q6 Wiedernutzung | 1–5 | **2** | Owner ~3,9 | pessimistisch |
| Q7 Gesamteindruck | 1–6 Note | **5** | polarisiert | eher mangelhaft |

**Queranalyse (AI-limitiert):** Eine Persona → keine Experten-Ø 4,5 vs Einsteiger 2,5. Stattdessen: **Purchase/C explorieren länger** bei gleicher Friction — schwaches H5-Signal.

---

## Handlungsempfehlungen

### Quick Wins
1. **Erklären warum ausgegraut** (Tooltip/Inline) — deckungsgleich Human H2/F3.6.  
2. **Schrittfolge visualisieren** (1→2→3) — Human F3.7.  
3. **Nav: Einstieg nicht nur „Service & Beratung“** — Human+AI H3/Q4/F4.2.

### Mittelfristig
4. **Drei-Wege-Strategie** (Voll-Tool / produktnah / Nachrüst-Inspiration) — Human H4/H5.  
5. **Next Step nach Prüfung** (Kauf/Händler klarer, ohne Bruch) — Human F3.8/F3.9.  
6. **AI-Retest:** Sam patient + Nav-Landing ohne Cheat als Gate.

### AI-spezifisch
7. Soft-Q Evaluate (L6b) wieder befüllen — derzeit evidenz-Fallback.  
8. Scorecard-Kategorien exportieren (in dieser Wave leer).

---

## Job-IDs & Artefakte

| Run | jobId | Steps | Friction | Valid | Completed |
|-----|-------|-------|----------|-------|-----------|
| A Erstkontakt | `092614ec-9520-4857-ba65-35b7cd0ffd5a` | 5 | 8 | ja | nein |
| B Aufgabe 1 | `cc5e1e8b-e20f-42b8-bd5a-09901d9ea5d2` | 5 | 8 | ja | nein |
| C Aufgabe 2 | `01778940-fcc5-4a0e-bf58-9cbdd3b00d77` | 10 | 8 | ja | nein |
| Nav H3 | `a1bbd0f8-0c8c-456d-9ae1-91e3888ef760` | 5 | 8 | ja | nein |
| Purchase | `eaad5c42-a4d1-474c-a5a1-30cbaf442d98` | 9 | 8 | ja | nein |

Deeplink-Cheats: **0/5**. Infra-Blocker (CloudFront): **0**.

---

## Synthese: Stärken, Grenzen und Ausblick

### Was gut funktioniert hat
- **Ehrliches Path-finding:** keine Deep-URL-Shortcuts; Nav misst echte Auffindbarkeit (Human-H3-Lücke der 07-30-Wave geschlossen).  
- **In-Tool-Reibung:** grau/Filter — starker Match zu Human F2.2/F3.6/H2.  
- **ValidEvidence 5/5** ohne 403 (besser als AI-Baseline 07-30).  
- **Schema-Parität** zur Human-Auswertung (Hypothesen, F-Fragen, Soft-Q, Empfehlungen).

### Grenzen
- **n=1 Persona**, keine 17er-Stichprobe / keine Screener-Verteilung.  
- **Keine Video-Feininterpretation** jenseits Agent-Steps (analog Human-PDF-Grenze „nur Transkript“).  
- **Completion 0%** — misst Abbruch gut, unterschätzt lösbare Fälle (Human Mehrheit schafft Aufgabe 1).  
- Soft-Q nicht aus Wave-Evaluate, sondern abgeleitet.

### Ausblick
Nav-Landing fixen → Sam-Kontrast → Soft-Q live → erneut gegen dieses Dokument und das Human-PDF ampeln.
