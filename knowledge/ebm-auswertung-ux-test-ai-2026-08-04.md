# Auswertung UX Test ‚Produktkombinationen & Nachrüsten‘ — AUDION AI

**Unmoderierter Nutzertest (AI-Reproduktion)**  
Mischung aus Leitfaden-Fragen und agentischen Think-Alouds (Persona Lab) zum Bosch eBike Produktkombinationen-Tool.

| | |
|--|--|
| **Methode** | AUDION v3 UX Journey Agent · Personas Alex Lab Ungeduldig + Sam Lab Geduldig |
| **Stichprobe** | Morgen-Suite 5 Runs (A/B/C/Nav/Purchase) **+ Abend-Repeats** Nav n=3 · Lab B n=3×2 Personas |
| **Datum** | 2026-08-04 (aktualisiert Abend) |
| **Agent / Web** | Path-finding ohne Deep-Link-Cheat · Soft-Q Evaluate live (`28a743e`+) |
| **Staging** | https://audion-v3.projects-a.plygrnd.tech |
| **Projekt** | `proj-bosch-ebike-msd3hwtv` |
| **Leitfaden** | EBM-Testleitfaden Produktkombinationen-Tool v1.3 (Testbirds) |
| **Human-Referenz** | `EBM-Auswertung UX Test 'Produktkombinationen & Nachrüsten'-200726-065814.pdf` (n=17) |
| **Maschinenlesbar (Morgen)** | `knowledge/ebm-produktkombinationen-evaluation-audion-2026-08-04-pathfind.json` |
| **Repeats-Doku** | `lab-staging-smoke-softq-core-nav-repeats-2026-08-04.md` · `lab-staging-smoke-lab-b-repeats-2026-08-04.md` |

---

## Klartext für Stakeholder (Abend-Stand)

**Was funktioniert besser als am Morgen gedacht**  
Von der Startseite zum Produktkombinationen-Tool findet der Agent den Weg **zuverlässig** (3 von 3 Versuchen, ohne Abkürzung). Die Aussage „kein natürlicher Einstieg“ gilt für dieses Setup **nicht mehr**.

**Was weiterhin kritisch ist**  
In der Filter-Matrix („welche Displays passen zu Performance Line?“) kommen **weder** ungeduldige **noch** geduldige Personas zu einer sicheren Antwort — **6 von 6** Abbrüchen, immer dieselben Gründe: graue Optionen, Filter-Ursache unklar. Soft-Q Bedienung/Filterlogik durchgängig **2**.

**Was ihr daraus machen solltet (Top 3)**  
1. **Erklären, warum etwas grau ist** (direkt an der Option) — größter Hebel.  
2. **Einfache Kurzantwort** („passt / passt nicht / diese Displays“) neben oder statt der vollen Matrix.  
3. **Nach der Prüfung klarer nächster Schritt** (Händler / Kauf / Support) — noch wenig AI-belegt, aber Human-kritisch; Lab existiert.

Auffindbarkeit weiter schleifen nur, wenn echte Nutzer auf der Live-Site schlechter abschneiden als der Agent — die AI-Nav-Lücke ist geschlossen.

---

## Methodik

### Morgen
5 Agent-Runs (A / B / C / Nav / Purchase), Soft-Q teils evidenz-Fallback.

### Abend (Update)
- **Nav Findability** 3× wiederholt → Reproduzierbarkeit.  
- **Filter-Matrix Lab B** 3× mit Alex + Sam → Reproduzierbarkeit + Tempo-Kontrast.  
- Soft-Q Evaluate befüllt live (Bosch Q1–Q7 bzw. Core-Keys bei Template).

AI misst **ehrliche Abbruchmuster** und ehrliche Navigation (kein Deep-Link-Cheat), nicht erzwungenes Zielerreichen.

| Human-PDF-Set | AI-Gegenstück |
|---------------|---------------|
| Auswertung Transkripte | dieses Dokument |
| Queranalysen | § Soft-Q + Repeats |
| Handlungsempfehlungen | § Handlungsempfehlungen (geschärft) |

---

## Selbsteinschätzung der „Probanden“

| Merkmal | AI |
|---------|-----|
| Personas | Alex Ungeduldig (`…ungeduldig…`) · Sam Geduldig (`…geduldig…`) |
| Framing | Owner/Nachrüsten (Lab B) · Purchase · Nav von Home |
| Device | Desktop Chromium |
| Morgen-Steps | A 5 · B 5 · C 10 · Nav 5 · Purchase 9 |
| Abend Nav | 8 / 6 / 5 Steps — **alle Tool erreicht** |
| Abend Lab B | Alex 6/6/6 · Sam 7/8/7 — **alle Abbruch**, Friction 8 |

**Einordnung:** Tool lädt und Matrix ist sichtbar. **In-Tool-Aufgabe scheitert reproduzierbar.** **Auffindbarkeit Home→Tool gelingt reproduzierbar** (Abend).

---

## Validierung Hypothesen (aktualisiert)

Hypothesen negativ formuliert — Bestätigung = schlechte UX.  
🟢 geringer Handlungsbedarf · 🟡 Anpassungen empfohlen · 🔴 kritisch

| ID | Hypothese | Ampel | Status | Kernerkenntnis |
|----|-----------|-------|--------|----------------|
| **H1** | Tool komplex/überfordernd | 🟡→🔴 | **Bestätigt** (Persona-Band) | Lab B Abend: 6/6 Abbruch bei Matrix — auch Sam geduldig. |
| **H2** | Matrix-Filter / Ausblend-Warum unklar | 🔴 | **Bestätigt** | Durchgängig grau + „Filter-Ursache unklar“ in Findings; Soft Q3=**2**. |
| **H3** | Schlechte Auffindbarkeit / Journey / Next Step | 🟡 **aufgesplittet** | **Auffindbarkeit: widerlegt (AI)** · Next Step: offen | Nav Abend **3/3** Tool-URL, `deeplinkCheat=false`, Q4=**4**, H3-Auto **refuted**. Next-Step-Lab noch ohne n≥3. |
| **H4** | Produktnahe Kurzantwort statt Matrix | 🟡 | **Teilweise bestätigt** | Matrix liefert keine sichere Display-Liste → Abbruch; Produktnah-Lab existiert, wenig live. |
| **H5** | Kaufinteressent vs Owner unterschiedlich | 🟡 | **Teilweise** | Sam etwas mehr Steps als Alex; Purchase morgen länger — kein starker Nutzen-Split. |

**Abgleich Human vs AI:**

| | Human (n=17) | AI Morgen | AI Abend (+ Repeats) |
|--|--------------|-----------|----------------------|
| H1 | 🟡 teilweise | 🟡 | 🟡/🔴 stabil bestätigt |
| H2 | 🟡 teilweise | 🟡/🔴 | 🔴 reproduzierbar |
| H3 Auffindbarkeit | 🔴 schlecht (Ø Q4 2,6) | 🔴 Nav fail | 🟢/🟡 AI **findet** Tool (Q4=4) — Human-Gap bleibt relevant für Live-Nutzer |
| H3 Next Step | 🔴 | wenig belegt | weiterhin offen |
| H4 | 🟡 | 🟡 | 🟡 unverändert |
| H5 | 🟢 | 🟡 | 🟡 (Sam vorhanden, schwaches Signal) |

---

## Testfragen (Kern + Abend-Update)

### Erster Eindruck (F2)
Graue/disabled Displays dominieren den ersten Eindruck — Match Human. Konfidenz hoch.

### Aufgabe 1 — Performance Line → Displays (F3.1–F3.4)
**Morgen:** Abbruch nach ~5 Steps.  
**Abend Lab B n=3:** Alex und Sam **jedes Mal** ohne sichere Antwort; Soft Q1/Q2/Q3 = **2**.  
Konfidenz: **sehr hoch** (reproduzierbar).

### Aufgabe 2 — Vierer-Kombination (F3.5–F3.6)
Unvollständig; Ausgrauung ohne klare Erklärung — unverändert aus Morgen-Suite.

### Auffindbarkeit (F4.2 / Soft Q4)
**Morgen Nav:** blieb auf `/de/` — H3 bestätigt.  
**Abend Nav n=3:** finalUrl = Produktkombinationen, Q4=**4**, H3-Auffindbarkeit **widerlegt** für diesen Agenten-Pfad.  
Konfidenz Auffindbarkeit AI: **hoch**.  
Hinweis: Human Ø 2,6 — echte Nutzer können weiterhin scheitern; AI zeigt nur, dass ein UI-Pfad *machbar* ist.

### Abschluss (F5)
Bei Matrix-Scheitern eher Abraten / „nur mit Filtererklärung“ — Soft Q7 tendenziell mangelhaft.

---

## Soft-Q Überblick

| Frage | Morgen (abgeleitet) | Abend Lab B (Evaluate) | Abend Nav | Human-Signal |
|-------|---------------------|-------------------------|-----------|--------------|
| Q1 Nützlichkeit | 2 | **2** | — | Owner oft höher |
| Q2 Bedienbarkeit | 2 | **2** | — | Reibung Match |
| Q3 Filterlogik | 2 | **2** | — | AI härter |
| Q4 Auffindbarkeit | 2 (Nav fail) | — | **4** (3/3) | Human Ø 2,6 |
| Q6 / Q7 | 2 / 5 | eher schlecht | — | polarisiert |

---

## Handlungsempfehlungen (geschärft)

### Sofort (höchster Nutzen)
1. **Warum ausgegraut erklären** — Tooltip/Inline an disabled Optionen. Beleg: H2 + Lab B 6/6.  
2. **Kurzantwort neben der Matrix** — kompatible Displays als Liste/Chip, ohne Filterkampf. Beleg: H4 + Abbruch trotz Versuch.  

### Als Nächstes
3. **Klarer Next Step** nach Prüfung (Händler, Kauf, Support). Human F3.8/F3.9; AI-Lab vorhanden, Repeats optional.  
4. **Live-Auffindbarkeit spotten** (echte Nutzer / Analytics) — AI findet den Weg; Human-Q4 war schlecht. Nicht blind „Nav kaputt“ aus Morgen-AI übernehmen.

### Nicht priorisieren
- Weitere Filter-Matrix-Varianten derselben Aufgabe.  
- Noch mehr AI-Nav-Repeats (3/3 reicht für AI-Gate).

### AI-/Mess-Nachzug (intern)
- Soft-Q Evaluate läuft wieder (L6b).  
- H1/H2 Auto-Verdict analog Nav/H3 optional.  
- Produktnah- + Next-Step-Lab live, wenn Stakeholder H4/F3.8 vertiefen wollen.

---

## Job-IDs & Artefakte

### Morgen-Suite (pathfind)

| Run | jobId | Steps | Friction | Valid | Ziel |
|-----|-------|-------|----------|-------|------|
| A | `092614ec-…` | 5 | 8 | ja | nein |
| B | `cc5e1e8b-…` | 5 | 8 | ja | nein |
| C | `01778940-…` | 10 | 8 | ja | nein |
| Nav | `a1bbd0f8-…` | 5 | 8 | ja | **nein** (Home) |
| Purchase | `eaad5c42-…` | 9 | 8 | ja | nein |

### Abend Nav repeats (alle Tool erreicht, kein Cheat)

| # | jobId | Steps | Q4 | H3 |
|---|-------|-------|----|----|
| 1 | `62a4a1ed-eab4-4072-83fd-1533911899a2` | 8 | 4 | refuted |
| 2 | `b383e849-a9d4-4de4-abb3-f2ae6dc35098` | 6 | 4 | refuted |
| 3 | `85ecea63-d558-4853-927c-732caec093c2` | 5 | 4 | refuted |

### Abend Lab B repeats (Alex + Sam, alle Abbruch)

| # | Alex job | Sam job | Alex/Sam Steps | Q2/Q3 |
|---|----------|---------|----------------|-------|
| 1 | `7e9ac5d8-…` | `6946b98f-…` | 6 / 7 | 2 / 2 |
| 2 | `5ed102d8-…` | `c5ee47cc-…` | 6 / 8 | 2 / 2 |
| 3 | `6a229395-…` | `5267e532-…` | 6 / 7 | 2 / 2 |

Deeplink-Cheats Abend: **0**. Infra 403: **0**.

---

## Synthese

### Was gut läuft
- Ehrliches Path-finding; Nav-Abend misst **erfolgreiche** Auffindbarkeit.  
- Matrix-Reibung **stabil** und persona-übergreifend (Alex + Sam).  
- Soft-Q wieder aus Evaluate; Schema nahe am Human-Bericht.

### Grenzen
- Keine n=17 / keine Screener-Verteilung.  
- AI Completion niedriger als Human bei Aufgabe 1 (misst Abbruch gut, unterschätzt lösbare Fälle).  
- H3 enthält noch „Next Step“ — nicht durch Nav-Landing erledigt.

### Ausblick
Produktseitig: **Grau erklären + Kurzantwort** zuerst. Messseitig: optional Next-Step/Produktnah-Repeats; PDF dieser Auswertung bei Bedarf neu erzeugen (Markdown ist SoT).
