# UX Test Flow — 10 gängige Szenarien (Bausteinkatalog)

**Status:** Draft (Produkt-Orientierung, noch keine UI-Implementierung)  
**Zweck:** Absolute Standard-Szenarien, bewusst **unterschiedlich** in Triggern, Aktionen, Meldungen und Verzweigungen — als gemeinsame Sprache für Wizard *oder* Board.  
**Nicht Ziel:** Konkrete Kundenstudien nachbauen (Produktkombinationen / Händlersuche nur als *Beispiele* für Varianz).

**Verwandt:** `specs/domain/ux-lab-archetypes.md`

---

## Klartext

Statt hundert spezieller Screens reichen wenige **Knotentypen**. Ein Board (React Flow o.ä.) kann dieselben Knoten wiederverwenden — der Vorteil, den du meintest. Die 10 Szenarien unten prüfen, ob diese Knoten wirklich reichen.

---

## Gemeinsames Vokabular (wenige Bausteine)

| Typ | Rolle | Beispiele |
|-----|--------|-----------|
| **Start** | Einstieg | URL, Gerät, Persona |
| **Prompt** | Ansage / Frage an den „Nutzer“ (Agent oder Mensch) | „Schau dir die Seite an“, „Wie fühlst du dich?“ |
| **Beobachten** | Zeitfenster ohne feste Pflichtaktion | 30–60 s Orientieren |
| **Aktion** | Konkretes Tun | PLZ eingeben, Filter öffnen, CTA klicken |
| **Gate** | Wenn/Dann | Frustration hoch, Consent verweigert, Ziel-URL erreicht |
| **Meldung** | System-/Protokollhinweis (nicht UI-Produkt) | „Abbruch wegen hoher Frustration — bitte begründen“ |
| **Erfolg** | Abschluss positiv | Ziel erreicht + Kurzfazit |
| **Abbruch** | Abschluss negativ/ehrlich | Mit Pflicht-Erklärung |
| **Messung** | Soft-Frage / Skala | SEQ 1–7, Soft-Q-Core |

Kanten nur: `dann` · `wenn` · `sonst` · (optional) `parallel`.

Alles unten ist mit **diesen** Typen beschreibbar — kein Szenario braucht einen Sonder-Screen-Typ.

---

## Die 10 Szenarien

### 1. Erstkontakt / Gefühlsgate (adaptiv)

**Alltag:** „Schau dir Seite X an → sag wie du dich fühlst → bei zu viel Frustration abbrechen, sonst Aufgabe.“

| Schritt | Baustein |
|---------|----------|
| Start URL | Start |
| „Schau dich 1 Minute um, noch nichts Wichtiges klicken“ | Prompt + Beobachten |
| „Wie fühlst du dich? (klar / unsicher / frustriert)“ | Prompt + Messung |
| Gate: Frustration hoch? | Gate |
| Ja → „Brich ab und erkläre warum“ | Meldung + Abbruch |
| Nein → „Finde jetzt …“ | Aktion → Erfolg/Abbruch |

**Andere Trigger:** Gefühl, Zeitbudget.  
**Archetyp:** `first_impression` → conditional `task_goal`.

---

### 2. Auffindbarkeit ohne Spoiler

**Alltag:** Von Home/Hub zur Zielseite, ohne Deeplink und ohne Label-Spoiler.

| Schritt | Baustein |
|---------|----------|
| Start = Home | Start |
| „Finde den Weg zu [Zielbeschreibung], nicht die direkte URL tippen“ | Prompt |
| Navigieren | Aktion |
| Gate: Ziel-URL/Titel match? | Gate |
| Ja → Erfolg; Nein → ehrlicher Abbruch + was gefehlt hat | Erfolg / Abbruch |
| Optional Soft: „Wie leicht war das Auffinden?“ | Messung |

**Trigger:** URL/Titel-Erfolg, Deeplink-Cheat = Fail.  
**Archetyp:** `findability`.

---

### 3. Consent / externes-Gate (vor dem eigentlichen Tool)

**Alltag:** Händlersuche-ähnlich — Karte/Tool erst nach Bestätigung externer Inhalte.

| Schritt | Baustein |
|---------|----------|
| Start Tool-URL | Start |
| Beobachten: blanko/gesperrt? | Beobachten |
| Gate: Consent-Dialog sichtbar? | Gate |
| Prompt: „Was hält dich ab / was bräuchtest du zum Bestätigen?“ | Prompt |
| Aktion: bestätigen *oder* ablehnen *oder* zu Google abwandern | Aktion |
| Wenn abgelehnt → Abbruch-Zweig mit Begründung | Abbruch |
| Wenn bestätigt → weiter Suche | Aktion → … |

**Trigger:** Dialog sichtbar, Klick auf Bestätigen/Ablehnen, Navigation weg.  
**Archetyp:** `recovery` / `comprehension` vor `task_goal`.

---

### 4. Konkrete Aufgabe im Tool (Goal)

**Alltag:** „Finde passende Displays / Händler in meiner Nähe / Preis.“

| Schritt | Baustein |
|---------|----------|
| Start Tool | Start |
| Ziel in Klartext (kein Klick-Skript) | Prompt |
| Arbeiten im UI | Aktion |
| Gate: Zieltext/Liste/URL-Beweis? | Gate |
| Messung Schwere | Messung |
| Erfolg oder ehrlicher Abbruch | Erfolg / Abbruch |

**Trigger:** `goalReached`, Finding enthält Antwort.  
**Archetyp:** `task_goal`.

---

### 5. Verstehen von Logik (Filter / Disabled / Warum grau)

**Alltag:** Nicht „Aufgabe schaffen“, sondern „kann erklären warum ausgegraut“.

| Schritt | Baustein |
|---------|----------|
| Start | Start |
| „Wähle X; wenn etwas grau ist: erkläre warum — oder sag, dass unklar“ | Prompt |
| Interaktion | Aktion |
| Gate: Erklärung genannt *oder* Confusion explizit? | Gate |
| Beides zählt als valides Evidence (auch „ich versteh’s nicht“) | Erfolg (Verständnis) / Abbruch (Aufgabe), Messung |

**Trigger:** Perception-Cues, Keyword Confusion, korrekte Erklärung.  
**Archetyp:** `comprehension`.

---

### 6. Fehler & wieder finden (Recovery)

**Alltag:** Falsch geklickt / falscher Filter → zurück / Hilfe / Reset.

| Schritt | Baustein |
|---------|----------|
| Start + kurze Fehl-Aktion (oder „bringe dich absichtlich vom Weg“) | Prompt + Aktion |
| „Finde zurück zur sinnvollen Ansicht“ | Prompt |
| Gate: wieder auf sinnvoller Oberfläche? | Gate |
| Messung: „Wie sicher war der Rückweg?“ | Messung |

**Trigger:** URL zurück, Hilfe geöffnet, Reset.  
**Archetyp:** `recovery`.

---

### 7. Zwei Tempi / zwei Personas (Segment-Kontrast)

**Alltag:** Gleiche Aufgabe, ungeduldig vs. geduldig (oder Kauf vs. Besitz).

| Schritt | Baustein |
|---------|----------|
| Parallel: Run A Persona impatient, Run B patient | Start ×2 (`parallel`) |
| Identische Aufgabe | Prompt + Aktion |
| Vergleich: Steps, Abbruch, Soft-Scores | Messung (aggregiert) |
| Gate optional: „weichen sie stark ab?“ → Hinweis in Auswertung | Gate (Auswertung, nicht Agent) |

**Trigger:** Persona-Policy / time_pressure.  
**Archetyp:** `segment_contrast`.

---

### 8. Nach der Aufgabe: Next Step

**Alltag:** Prüfung fertig (oder Abbruch) → was jetzt? Händler, Kauf, Support.

| Schritt | Baustein |
|---------|----------|
| Kurze Vor-Aufgabe oder „nimm an, du hast geprüft“ | Prompt |
| „Was wäre dein nächster Schritt — und bietet die Seite das?“ | Prompt |
| Beobachten CTAs | Beobachten + Aktion optional |
| Gate: Next Step genannt + CTA gesehen/gefehlt | Gate |
| Messung Likelihood | Messung |

**Trigger:** Genannte Absicht, CTA-Klick oder „fehlt“.  
**Archetyp:** `outcome_next_step`.

---

### 9. Mehrstufiger End-to-End (Mini-Journey)

**Alltag:** Orientieren → Aufgabe 1 → Aufgabe 2 → Abschlussfrage.

| Schritt | Baustein |
|---------|----------|
| Start | Start |
| Block A Erstkontakt | Prompt + Beobachten |
| Gate: überfordert? → früher Soft-Exit möglich | Gate |
| Block B Aufgabe | Aktion |
| Block C Vertiefung | Aktion |
| Gesamtmessung + Fazit | Messung + Erfolg/Abbruch |

**Trigger:** Ketten-Gates zwischen Blöcken.  
**Archetyp:** `end_to_end`.

---

### 10. Moderiert-light / Leitfaden ohne Agent-Zwang

**Alltag:** Interview-Struktur speichern (Händlersuche-Stil): Beobachtungsfenster + Moderationsfragen als **Meldungen**, Ausführung Mensch oder später Agent.

| Schritt | Baustein |
|---------|----------|
| Start + Szenario-Text | Start + Prompt |
| Timer „5 Min frei explorieren“ | Beobachten |
| Moderator-Karten: „Nachfragen zu PLZ / Karte / Filter“ | Meldung (Checkliste) |
| Optionale Agent-Aktionen dazwischen | Aktion |
| Abschluss: hilfreich? was fehlte? | Prompt + Messung |
| Kein hartes goalReached nötig | Erfolg = Protokoll vollständig |

**Trigger:** Zeit, Moderator markiert „Thema erledigt“, optional Agent-Events.  
**Archetyp:** gemischt; Modus = `moderated_outline` (Produkt-Flag, kein neuer Lab-Typ zwingend).

---

## Abdeckungsmatrix (Varianz-Check)

| # | Gefühl | Consent | Navigation | Aufgabe | Verstehen | Recovery | Parallel | Next Step | Kette | Moderiert |
|---|--------|---------|------------|---------|-----------|----------|----------|-----------|-------|-----------|
| 1 | ● | | | ◐ | | | | | | |
| 2 | | | ● | | | | | | | |
| 3 | ◐ | ● | | ◐ | ◐ | | | | | |
| 4 | | | | ● | | | | | | |
| 5 | | | | ◐ | ● | | | | | |
| 6 | | | ◐ | | | ● | | | | |
| 7 | | | | ● | | | ● | | | |
| 8 | | | | | | | | ● | | |
| 9 | ◐ | | | ● | | | | ◐ | ● | |
| 10 | | ◐ | ◐ | ◐ | ◐ | | | ◐ | ◐ | ● |

● = Kern · ◐ = vorkommend

→ Mit **10 Szenarien** und **~8 Knotentypen** ist die Varianz abgedeckt, die Produktkombinationen *und* Händlersuche *und* adaptive Abbrüche brauchen — ohne zig Spezial-UIs.

---

## Implikation für Board vs. Wizard

- **Board-Vorteil:** dieselben Knoten-Komponenten (Start, Prompt, Gate, …) für alle 10 — wenig UI-Vielfalt, viel Kombinationsmacht.  
- **Pflicht:** Gates und Kanten strikt typisieren (`wenn Frustration`, `wenn URL match`, …), sonst entsteht Chaos.  
- **MVP ohne Canvas:** dieselben 10 als Vorlagen in einer Blockliste; Canvas rendert später denselben Graphen.

---

## Nächster Spec-Schritt (wenn gewünscht)

1. Formale `FlowNode` / `FlowEdge` Contracts (IDs der Gate-Bedingungen).  
2. Mapping Agent-Capabilities ↔ Gate-Typen (was heute schon Perception/try-then-quit kann).  
3. 2–3 Vorlagen als JSON-Fixtures (Szenario 1, 2, 3) zum Durchspielen im Kopf/UI-Mock.
