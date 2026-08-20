#!/usr/bin/env python3
"""Build Human vs AI UEQ+ comparison for Bosch eBike website."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AI_JSON = ROOT / "knowledge/ueq-ebike-benchmark-2026-08-19.json"
OUT_JSON = ROOT / "knowledge/ueq-ebike-human-vs-ai-2026-08-19.json"
OUT_HTML = ROOT / "knowledge/ueq-ebike-human-vs-ai-2026-08-19.html"

HUMAN_PDF = "/Users/christoph.bordeck/Desktop/Abschlussbericht_UEQ+_eBike_2025 (1).pdf"

DIMENSIONS = [
    ("effizienz", "Effizienz"),
    ("durchschaubarkeit", "Durchschaubarkeit"),
    ("stimulation", "Stimulation"),
    ("inhaltsqualitaet", "Inhaltsqualität"),
    ("nuetzlichkeit", "Nützlichkeit"),
]

HUMAN = {
    "meta": {
        "source": HUMAN_PDF,
        "label": "Testbirds UEQ+ Abschlussbericht Aug/Sep 2025",
        "n": 50,
        "scale": "UEQ -3..+3 (converted from 1-7)",
        "overall_weighted": 1.54,
        "device": "Smartphone (24 iOS, 26 Android)",
    },
    "dimensions": {
        "effizienz": {
            "mean": 1.02,
            "importance": 1.74,
            "items": [1.50, 1.28, 0.96, 0.34],
            "item_labels": ["langsam→schnell", "ineffizient→effizient", "unpragmatisch→pragmatisch", "überladen→aufgeräumt"],
        },
        "durchschaubarkeit": {
            "mean": 1.19,
            "importance": 1.92,
            "items": [1.42, 1.56, 1.12, 0.66],
            "item_labels": ["unverständlich→verständlich", "schwer→leicht zu lernen", "kompliziert→einfach", "verwirrend→übersichtlich"],
        },
        "stimulation": {
            "mean": 1.52,
            "importance": 1.30,
            "items": [1.74, 1.30, 1.80, 1.22],
            "item_labels": ["uninteressant→interessant", "langweilig→spannend", "minderwertig→wertvoll", "einschläfernd→aktivierend"],
        },
        "inhaltsqualitaet": {
            "mean": 2.08,
            "importance": 2.22,
            "items": [2.44, 2.00, 1.94, 1.94],
            "item_labels": ["veraltet→aktuell", "uninteressant→interessant", "schlecht→gut aufbereitet", "unverständlich→verständlich"],
        },
        "nuetzlichkeit": {
            "mean": 1.84,
            "importance": 1.88,
            "items": [2.08, 1.98, 1.72, 1.56],
            "item_labels": ["nutzlos→nützlich", "nicht hilfreich→hilfreich", "nicht vorteilhaft→vorteilhaft", "nicht lohnend→lohnend"],
        },
    },
    "qualitative": [
        "Menü gut strukturiert — Startseite sollte Ziele schneller führen; sonst verliert man Interessenten schon auf Seite 1.",
        "Ansprechend und professionell; eBike-Beratung hilfreich — aber teils überladen durch viele Unterpunkte.",
        "Komponenten-Vergleich auf Handy schwer (nur scrollen); Differenzierung zu anderen Marken fehlt; Texte wirken wie Werbesprüche.",
        "Schwer zurechtzufinden; verständliche Unterschiede anstrengend zu finden.",
        "Navigation verwinkelt und aufwendig — für ältere Nutzer und kleine Screens problematisch.",
    ],
    "recommendations": [
        "Verbesserungsbedarf bei Effizienz (aufgeräumt) und Durchschaubarkeit (übersichtlich).",
        "Inhaltsqualität, Durchschaubarkeit, Nützlichkeit = höchste Wichtigkeit.",
        "Grundsätzlich gute Bewertung (Gesamteindruck 1,54).",
    ],
}


def to_ueq(score_1_7: float) -> float:
    """Convert 1–7 mean to UEQ -3..+3 (standard: score - 4)."""
    return round(score_1_7 - 4, 2)


def render_html(report: dict) -> str:
    import html as html_mod

    ai_model = (
        report.get("meta", {}).get("ai_model")
        or report.get("ai_meta", {}).get("model")
        or "gpt-5.6-luna"
    )
    ai_model_esc = html_mod.escape(str(ai_model))
    rows = ""
    for key, label in DIMENSIONS:
        h = report["comparison"]["dimensions"][key]["human_ueq"]
        a = report["comparison"]["dimensions"][key]["ai_ueq"]
        d = report["comparison"]["dimensions"][key]["delta"]
        cls = "good" if abs(d) <= 0.4 else ("warn" if d > -0.8 else "bad")
        rows += f'<tr class="{cls}"><td>{label}</td><td>{h:+.2f}</td><td>{a:+.2f}</td><td>{d:+.2f}</td></tr>'

    qual = "".join(f"<li>{q}</li>" for q in HUMAN["qualitative"])
    ai_findings = "".join(f"<li>{q}</li>" for q in report["ai_cross_cutting"])

    return f"""<!doctype html><html lang="de"><head><meta charset="utf-8"/>
<title>UEQ+ eBike Human vs AI</title>
<style>
body{{font-family:-apple-system,sans-serif;max-width:920px;margin:0 auto;padding:32px;line-height:1.5;color:#16181d}}
h1{{font-size:24px}} h2{{font-size:17px;margin-top:28px;border-bottom:1px solid #ddd;padding-bottom:6px}}
.muted{{color:#5c6470;font-size:13px}}
.box{{background:#fff8e6;border:1px solid #e8dfc0;padding:14px;border-radius:8px;margin:16px 0}}
table{{border-collapse:collapse;width:100%;font-size:13px;margin:12px 0}}
th,td{{border:1px solid #ddd;padding:8px;text-align:left}}
th{{background:#f5f7fa}}
.good td:last-child{{color:#2d6a4f}} .warn td:last-child{{color:#b07d00}} .bad td:last-child{{color:#b42318}}
.cols{{display:grid;grid-template-columns:1fr 1fr;gap:16px}}
@media(max-width:700px){{.cols{{grid-template-columns:1fr}}}}
</style></head><body>
<h1>Bosch eBike UEQ+ — Human vs AI</h1>
<p class="muted">Human: Testbirds Abschlussbericht Aug/Sep 2025 (n=50, Smartphone) · AI: 24 Runs + inferiert ({ai_model_esc}) · {report['meta']['date']}</p>
<div class="box"><strong>Skala:</strong> UEQ-Standard <strong>−3 … +3</strong> (positiv = gut). AI-Werte aus 1–7-Mitteln konvertiert (score − 4). Human ohne „Intuitive Bedienung“ (5 Dimensionen).</div>

<h2>Gesamteindruck</h2>
<table><thead><tr><th>Quelle</th><th>Overall (gewichtet)</th><th>Runs / n</th></tr></thead>
<tbody>
<tr><td>Human (Testbirds)</td><td><strong>{report['comparison']['overall']['human_ueq']:+.2f}</strong></td><td>n=50</td></tr>
<tr><td>AI (Proxy)</td><td><strong>{report['comparison']['overall']['ai_ueq']:+.2f}</strong></td><td>{report['meta']['ai_run_count']} Runs</td></tr>
<tr><td>Delta (AI − Human)</td><td><strong>{report['comparison']['overall']['delta']:+.2f}</strong></td><td>AI deutlich kritischer</td></tr>
</tbody></table>

<h2>Dimensionen (−3 … +3)</h2>
<table><thead><tr><th>Dimension</th><th>Human</th><th>AI</th><th>Δ AI−Human</th></tr></thead><tbody>{rows}</tbody></table>

<h2>Interpretation</h2>
<ul>
<li><strong>Übereinstimmung:</strong> Effizienz nahe beieinander — beide sehen Struktur/Übersichtlichkeit als Schwachpunkt (Human: „überladen“, „wenig übersichtlich“).</li>
<li><strong>Größte Lücke:</strong> {report['insights']['largest_gap_dim']} (Δ {report['insights']['largest_gap_delta']:+.2f}) — AI bewertet Think-Aloud-Journeys kritischer als Human-Umfrage.</li>
<li><strong>Human-Stärke:</strong> Inhaltsqualität (+2,08) — AI nur +0,83; Humans loben Professionalität und Beratung stärker.</li>
<li><strong>Methodik:</strong> Human = post-task UEQ+ auf Smartphone nach Use Cases; AI = Desktop-Agent, oft unvollständige Navigation, inferierte Scores.</li>
</ul>

<div class="cols">
<div><h2>Human — qualitative Stimmen</h2><ul>{qual}</ul></div>
<div><h2>AI — wiederkehrende Befunde</h2><ul>{ai_findings}</ul></div>
</div>

<h2>Empfehlungen (Human, bestätigt durch AI)</h2>
<ul>
<li>Startseite als Schnellzugriff zu Zielen (nicht nur Menü) — beide Quellen.</li>
<li>Visuelle Hierarchie / weniger Überladung — Human explizit, AI Navigations-Frustration.</li>
<li>Bessere Differenzierung vs. andere Marken — Human qualitativ; AI UC2 Technik-Vergleich.</li>
<li>Mobile Komponenten-Vergleich — Human; AI-Tests überwiegend Desktop-Agent.</li>
</ul>
</body></html>"""


def main() -> None:
    ai = json.loads(AI_JSON.read_text())
    ai_dims = ai["aggregates"]["overall"]

    comparison_dims = {}
    for key, label in DIMENSIONS:
        h = HUMAN["dimensions"][key]["mean"]
        a_raw = ai_dims[key]
        a = to_ueq(a_raw)
        comparison_dims[key] = {
            "label": label,
            "human_ueq": h,
            "ai_ueq": a,
            "ai_raw_1_7": a_raw,
            "delta": round(a - h, 2),
            "human_importance": HUMAN["dimensions"][key]["importance"],
        }

    ai_ueq_vals = [comparison_dims[k]["ai_ueq"] for k, _ in DIMENSIONS]
    ai_overall = round(sum(ai_ueq_vals) / len(ai_ueq_vals), 2)
    human_overall = HUMAN["meta"]["overall_weighted"]

    largest = min(comparison_dims.items(), key=lambda x: x[1]["delta"])

    report = {
        "meta": {
            "date": "2026-08-19",
            "human_source": HUMAN_PDF,
            "ai_source": str(AI_JSON.relative_to(ROOT)),
            "ai_run_count": ai["meta"]["run_count"],
            "ai_model": ai["meta"].get("model") or "gpt-5.6-luna",
            "scale": "UEQ -3..+3",
        },
        "human": HUMAN,
        "ai": {
            "overall_raw_1_7": ai_dims["weighted_mean"],
            "dimensions_raw_1_7": {k: ai_dims[k] for k, _ in DIMENSIONS},
            "method": ai["meta"]["method"],
            "meta": {"model": ai["meta"].get("model") or "gpt-5.6-luna"},
        },
        "comparison": {
            "overall": {
                "human_ueq": human_overall,
                "ai_ueq": ai_overall,
                "delta": round(ai_overall - human_overall, 2),
            },
            "dimensions": comparison_dims,
        },
        "insights": {
            "largest_gap_dim": largest[1]["label"],
            "largest_gap_delta": largest[1]["delta"],
            "closest_dim": min(comparison_dims.items(), key=lambda x: abs(x[1]["delta"]))[1]["label"],
        },
        "ai_cross_cutting": [
            "Flow App / Erweiterung auf Startseite sichtbar — Detail-Navigation oft blockiert.",
            "Service & Beratung in Nav vorhanden — Öffnen scheitert wiederholt (Help Center teils erreicht).",
            "Über uns (Wave 4): starke Markeninhalte wenn Seite geladen — sonst Nav-Frustration.",
            "UC2 Technik: System-Narrativ überzeugend; direkter Wettbewerbsvergleich fehlt (wie Human).",
            "Goal-reached Rate AI nur ~17% — erklärt niedrigere AI-Scores vs. Human post-task Bewertung.",
        ],
    }

    OUT_JSON.write_text(json.dumps(report, ensure_ascii=False, indent=2))
    OUT_HTML.write_text(render_html(report))
    print(f"Wrote {OUT_JSON}")
    print(f"Wrote {OUT_HTML}")
    print(f"Human overall: {human_overall:+.2f} | AI overall: {ai_overall:+.2f} | Delta: {report['comparison']['overall']['delta']:+.2f}")


if __name__ == "__main__":
    main()
