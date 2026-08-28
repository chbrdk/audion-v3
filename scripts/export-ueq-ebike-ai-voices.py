#!/usr/bin/env python3
"""Export AI think-aloud voices in Testbirds human-report style."""
from __future__ import annotations

import html
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT_JSON = ROOT / "knowledge/ueq-ebike-ai-voices-2026-08-19.json"
OUT_HTML = ROOT / "knowledge/ueq-ebike-ai-voices-2026-08-19.html"

VOICES = [
    {
        "id": "AI-UC1-EBIKER-W4",
        "use_case": "Use Case 1 — eBike Fahrer:in",
        "title": "Erweiterung des Fahrerlebnisses / Flow App",
        "source_run": "wave-4 / A-UC1-ebiker-fahrerlebnis",
        "goal_reached": False,
        "quote": (
            "Als eBike-Fahrer:in sehe ich auf der Startseite den Bereich „Erweitere dein Erlebnis“ "
            "mit der Flow App — Personalisierung, komoot, Strava, Apple Health sowie Navigation mit "
            "Abbiegehinweisen, Fahrdetails und Sprachausgabe. Das klingt vielversprechend für mein "
            "Fahrerlebnis. Allerdings komme ich auf die Detailseite über „Mehr erfahren“ nicht "
            "zuverlässig. Ich bleibe auf der Startseite hängen und verstehe am Ende nicht "
            "vollständig, wie ich die App Schritt für Schritt einrichte und nutze."
        ),
        "gap": "Flow-App-Detailseite in mehreren Runs nicht erreichbar (Browser-Navigation).",
    },
    {
        "id": "AI-UC1-INTERESSENT-W3",
        "use_case": "Use Case 1 — eBike Interessent:in",
        "title": "Erste Orientierung",
        "source_run": "wave-3 / B-UC1-interessent-orientierung",
        "goal_reached": False,
        "quote": (
            "Ich spiele mit dem Gedanken, mir ein eBike zuzulegen. Die Startseite zeigt mir "
            "Nutzungssituationen — Alltag, Sport, Freizeit, Transport — sowie Typen wie eCity, "
            "eMTB und eTrekking. Für City-eBikes lese ich: entspanntes Fahren im Stadtverkehr. "
            "Das hilft beim Sortieren, aber welcher Typ wirklich zu mir passt, bleibt unklar. "
            "Die Seite wirkt technisch und visuell stark; näher an einer Kaufentscheidung bin ich "
            "nach dem Besuch noch nicht."
        ),
        "gap": "Typ-Teaser (z. B. eCity) in mehreren Runs nicht zuverlässig geöffnet.",
    },
    {
        "id": "AI-UC2-EBIKER-W3",
        "use_case": "Use Case 2 — eBike Fahrer:in",
        "title": "Beratung & Serviceangebote",
        "source_run": "wave-3 / C-UC2-ebiker-service",
        "goal_reached": True,
        "quote": (
            "Als eBike-Nutzer:in bin ich positiv überrascht, wie viel Bosch im Help Center bietet: "
            "Wartungsintervalle mit Erstinspektion und Erinnerung am Display, Händler-Diagnose mit "
            "DiagnosticTool und Servicebericht, digitale Servicehistorie in der Flow App, "
            "Reparatur/Ersatzteile mit mindestens sechs Jahren Verfügbarkeit sowie Pflege- und "
            "Akkuhinweise. Vertrauenswürdig wirkt der Weg über den Fachhändler bei technischen "
            "Defekten. Was mir fehlt: konkrete Zubehör-Empfehlungen — und ein klarer "
            "Service-Einstieg schon auf der Startseite. Ich musste erst über „Service & Beratung“ "
            "in die Tiefe navigieren."
        ),
        "gap": "Zubehör-Empfehlungen nicht gefunden; Startseite bewirbt Service kaum.",
    },
    {
        "id": "AI-UC2-INTERESSENT-W1W2",
        "use_case": "Use Case 2 — eBike Interessent:in",
        "title": "Technische Vorteile verstehen",
        "source_run": "wave-1+2 / D-UC2-interessent-technik",
        "goal_reached": True,
        "quote": (
            "Ich habe Bosch im Vergleich zu anderen Marken angesehen. Überzeugend finde ich das "
            "vernetzte System — Motor, Display, Akku, ABS, Flow App, Integration mit komoot und "
            "Strava. Produktnamen wie Performance Line CX, Kiox 300 oder PowerTube 800 sind "
            "nachvollziehbar. Aber: Ein direkter Vergleich „Was macht Bosch besser als andere "
            "Systeme?“ fehlt mir. Die Texte beschreiben Features und Komponenten, nicht den "
            "spürbaren Unterschied im Alltag — genau das würde mir bei der Kaufentscheidung helfen."
        ),
        "gap": "Kein Wettbewerbsvergleich auf der Seite (Human-Befund deckungsgleich).",
    },
    {
        "id": "AI-UC3-EBIKER-W4",
        "use_case": "Use Case 3 — eBike Fahrer:in",
        "title": "Hintergrundwissen / Über uns",
        "source_run": "wave-4 / E-UC3-ebiker-ueber-uns",
        "goal_reached": True,
        "quote": (
            "Ich wollte wissen, wer hinter meinem Bosch eBike steckt. Über „Über uns“ finde ich eine "
            "glaubwürdige Geschichte: 2009 als Start-up in der Bosch-Gruppe, Entwicklung zum "
            "Marktführer, weltweit erste serienreife eBike-ABS, über 100 Fahrradmarken im Portfolio. "
            "Das stärkt mein Vertrauen in die Marke. Konkrete Nachhaltigkeitskennzahlen oder "
            "Recycling-Zahlen hätte ich mir auf der Seite noch gewünscht — dazu steht eher "
            "allgemein „emissionsärmere Mobilität“."
        ),
        "gap": "Nachhaltigkeit ohne harte Kennzahlen.",
    },
    {
        "id": "AI-UC3-INTERESSENT-W4",
        "use_case": "Use Case 3 — eBike Interessent:in",
        "title": "Hintergrundwissen / Über uns",
        "source_run": "wave-4 / F-UC3-interessent-ueber-uns",
        "goal_reached": False,
        "quote": (
            "Bevor ich mich für Bosch entscheide, will ich verstehen, wofür die Marke steht. "
            "Auf der Startseite lese ich viel über vernetzte Systeme, Qualität, Zuverlässigkeit "
            "und umfassende Sicherheitstests — das wirkt professionell und seriös. Den Bereich "
            "„Über uns“ konnte ich in meiner Session jedoch nicht zuverlässig öffnen. Deshalb "
            "fehlen mir Unternehmenswerte, Innovationsgeschichte und Nachhaltigkeit im Detail — "
            "genau die Infos, die ich für eine Kaufentscheidung bräuchte."
        ),
        "gap": "Navigation zu „Über uns“ in diesem Run blockiert.",
    },
]

HUMAN_PARALLELS = [
    ("Startseite führt nicht schnell genug zum Ziel", "UC1 Interessent + Human Report 1608644"),
    ("Website teils überladen, viele Unterpunkte", "UC1 + Human Report 1608801"),
    ("Kein Vergleich zu anderen Marken / Alltagsnutzen unklar", "UC2 Interessent + Human Report 1608893"),
    ("Schwer zurechtzufinden, anstrengend", "UC1/2 + Human Report 1608833"),
    ("Navigation verwinkelt, mobil/schlecht für ältere Nutzer", "Querschnitt + Human Report 1609263"),
]


def render_html(data: dict) -> str:
    cards = ""
    for v in data["voices"]:
        status = "Ziel erreicht" if v["goal_reached"] else "Ziel nicht vollständig erreicht"
        cls = "good" if v["goal_reached"] else "partial"
        cards += f"""
<div class="card {cls}">
  <p class="meta"><strong>{html.escape(v['id'])}</strong> · {html.escape(v['source_run'])} · {status}</p>
  <h3>{html.escape(v['use_case'])}</h3>
  <p class="subtitle">{html.escape(v['title'])}</p>
  <p class="quote">{html.escape(v['quote'])}</p>
  <p class="gap"><strong>Lücke / Einschränkung:</strong> {html.escape(v['gap'])}</p>
</div>"""

    parallels = "".join(
        f"<li><strong>{html.escape(a)}</strong> — {html.escape(b)}</li>" for a, b in data["human_parallels"]
    )

    return f"""<!doctype html><html lang="de"><head><meta charset="utf-8"/>
<title>UEQ+ eBike — AI Stimmen (Human-Format)</title>
<style>
body{{font-family:-apple-system,sans-serif;max-width:880px;margin:0 auto;padding:32px;line-height:1.55;color:#16181d}}
h1{{font-size:24px;margin-bottom:8px}} h2{{font-size:17px;margin-top:32px;border-bottom:1px solid #ddd;padding-bottom:6px}}
.muted{{color:#5c6470;font-size:13px}}
.box{{background:#fff8e6;border:1px solid #e8dfc0;padding:14px;border-radius:8px;margin:16px 0}}
.card{{border:1px solid #ddd;border-radius:10px;padding:16px 18px;margin:18px 0;background:#fafbfc}}
.card.good{{border-left:4px solid #2d6a4f}} .card.partial{{border-left:4px solid #b07d00}}
.meta{{font-size:12px;color:#5c6470;margin:0 0 8px}}
.subtitle{{font-size:13px;color:#5c6470;margin:0 0 10px}}
.quote{{font-size:14px;margin:0 0 10px}}
.gap{{font-size:12px;color:#5c6470;margin:0}}
</style></head><body>
<h1>Optionales qualitatives Feedback — AI Think-Aloud</h1>
<p class="muted">Bosch eBike UEQ+ · bosch-ebike.com/de · Format angelehnt an Testbirds Abschlussbericht Sep 2025 · {data['meta']['date']}</p>
<div class="box"><strong>Methodik:</strong> Sechs Ich-Aussagen aus den besten Agent-Runs (Think-Aloud), redaktionell in Human-Sprech überführt — inhaltlich an Step-Texte gebunden, keine erfundenen Produktdetails. Run-ID = AI-Session-Referenz.</div>

<h2>Stimmen je Use Case</h2>
{cards}

<h2>Parallelen zum Human-Bericht</h2>
<ul>{parallels}</ul>

<h2>Abgrenzung Human vs. AI-Stimmen</h2>
<ul>
<li><strong>Human:</strong> 50 Smartphone-Tester, post-task UEQ+ und freie Texte mit Report-ID.</li>
<li><strong>AI:</strong> Desktop UX-Journey-Agent, oft unvollständige Navigation; Stimmen aus den erfolgreichsten Runs (C-W3, D-W1/2, E-W4).</li>
<li><strong>Gemeinsam kritisch:</strong> Startseiten-Führung, Überladung, fehlender Markenvergleich, Navigation.</li>
</ul>
</body></html>"""


def main() -> None:
    data = {
        "meta": {
            "date": "2026-08-19",
            "format": "Testbirds-style qualitative feedback",
            "human_reference": "/Users/christoph.bordeck/Desktop/Abschlussbericht_UEQ+_eBike_2025 (1).pdf",
            "voice_count": len(VOICES),
        },
        "voices": VOICES,
        "human_parallels": [{"theme": a, "reference": b} for a, b in HUMAN_PARALLELS],
    }
    OUT_JSON.write_text(json.dumps(data, ensure_ascii=False, indent=2))
    OUT_HTML.write_text(render_html(data))
    print(f"Wrote {OUT_JSON}")
    print(f"Wrote {OUT_HTML}")


if __name__ == "__main__":
    main()
