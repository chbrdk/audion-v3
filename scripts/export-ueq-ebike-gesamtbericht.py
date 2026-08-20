#!/usr/bin/env python3
"""Consolidated UEQ+ eBike report — Human + AI in one document."""
from __future__ import annotations

import html
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HUMAN_AI = ROOT / "knowledge/ueq-ebike-human-vs-ai-2026-08-19.json"
BENCHMARK = ROOT / "knowledge/ueq-ebike-benchmark-2026-08-19.json"
VOICES = ROOT / "knowledge/ueq-ebike-ai-voices-2026-08-19.json"
OUT_HTML = ROOT / "knowledge/ueq-ebike-gesamtbericht-2026-08-19.html"
OUT_JSON = ROOT / "knowledge/ueq-ebike-gesamtbericht-2026-08-19.json"

DIM_LABELS = [
    ("effizienz", "Effizienz"),
    ("durchschaubarkeit", "Durchschaubarkeit"),
    ("stimulation", "Stimulation"),
    ("inhaltsqualitaet", "Inhaltsqualität"),
    ("nuetzlichkeit", "Nützlichkeit"),
]


def esc(s: str) -> str:
    return html.escape(str(s))


def dim_table(comparison: dict) -> str:
    rows = ""
    for key, label in DIM_LABELS:
        d = comparison["dimensions"][key]
        rows += (
            f"<tr><td>{esc(label)}</td>"
            f"<td>{d['human_ueq']:+.2f}</td>"
            f"<td>{d['ai_ueq']:+.2f}</td>"
            f"<td>{d['delta']:+.2f}</td></tr>"
        )
    return rows


def uc_table(by_uc: dict) -> str:
    rows = ""
    for uc in sorted(by_uc):
        v = by_uc[uc]
        rows += f"<tr><td>{esc(uc)}</td><td>{v['overall']:+.2f}</td>"
        for key, _ in DIM_LABELS:
            rows += f"<td>{v[key]:+.2f}</td>"
        rows += "</tr>"
    return rows


def seg_table(by_seg: dict) -> str:
    rows = ""
    for seg in sorted(by_seg):
        v = by_seg[seg]
        rows += f"<tr><td>{esc(seg)}</td><td>{v['overall']:+.2f}</td>"
        for key, _ in DIM_LABELS:
            rows += f"<td>{v[key]:+.2f}</td>"
        rows += "</tr>"
    return rows


def voice_cards(voices: list) -> str:
    out = ""
    for v in voices:
        status = "✓ Ziel erreicht" if v["goal_reached"] else "○ Ziel nicht vollständig"
        cls = "ok" if v["goal_reached"] else "partial"
        out += f"""
<div class="voice {cls}">
  <p class="vmeta"><strong>{esc(v['id'])}</strong> · {esc(v['source_run'])} · {status}</p>
  <h4>{esc(v['use_case'])} — {esc(v['title'])}</h4>
  <p class="vquote">{esc(v['quote'])}</p>
  <p class="vgap"><em>Lücke:</em> {esc(v['gap'])}</p>
</div>"""
    return out


def human_quotes(quotes: list) -> str:
    return "".join(f'<blockquote>{esc(q)}</blockquote>' for q in quotes)


def main() -> None:
    ha = json.loads(HUMAN_AI.read_text())
    bench = json.loads(BENCHMARK.read_text())
    voices = json.loads(VOICES.read_text())

    OUT_HTML.write_text(build_html_fixed(ha, bench, voices))

    manifest = {
        "title": "UEQ+ eBike Gesamtbericht",
        "date": "2026-08-19",
        "sources": [str(HUMAN_AI.name), str(BENCHMARK.name), str(VOICES.name)],
        "output_html": str(OUT_HTML.name),
        "overall": ha["comparison"]["overall"],
    }
    OUT_JSON.write_text(json.dumps(manifest, ensure_ascii=False, indent=2))
    print(f"Wrote {OUT_HTML}")
    print(f"Wrote {OUT_JSON}")


def build_html_fixed(ha: dict, bench: dict, voices: dict) -> str:
    # Reuse build_html but fix uc/seg tables - rewrite build_html cleanly
    cmp_ = ha["comparison"]
    human = ha["human"]
    ha_insights = ha["insights"]
    bench_insights = bench["insights"]
    dim_label = dict(DIM_LABELS)
    strongest = dim_label.get(bench_insights.get("strongest_dim", ""), bench_insights.get("strongest_dim", "—"))
    weakest = dim_label.get(bench_insights.get("weakest_dim", ""), bench_insights.get("weakest_dim", "—"))
    agg_uc = {k: {kk: round(vv - 4, 2) for kk, vv in v.items()} for k, v in bench["aggregates"]["by_use_case"].items()}
    agg_seg = {k: {kk: round(vv - 4, 2) for kk, vv in v.items()} for k, v in bench["aggregates"]["by_segment"].items()}

    dim_hdr = "".join(f"<th>{esc(l)}</th>" for _, l in DIM_LABELS)
    parallels = "".join(
        f"<li><strong>{esc(p['theme'])}</strong> — {esc(p['reference'])}</li>"
        for p in voices["human_parallels"]
    )
    ai_proxy_model = esc(
        bench.get("meta", {}).get("model")
        or ha.get("meta", {}).get("ai_model")
        or "gpt-5.6-luna"
    )

    return f"""<!doctype html><html lang="de"><head><meta charset="utf-8"/>
<title>UEQ+ eBike — Gesamtbericht Human + AI</title>
<style>
@page{{margin:18mm}}
body{{font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:920px;margin:0 auto;padding:36px 32px;line-height:1.5;color:#16181d;font-size:13px}}
h1{{font-size:26px;margin:0 0 6px;font-weight:700}}
h2{{font-size:17px;margin:36px 0 10px;padding-bottom:6px;border-bottom:2px solid #16181d;page-break-after:avoid}}
h3{{font-size:14px;margin:20px 0 8px;page-break-after:avoid}}
h4{{font-size:13px;margin:0 0 6px}}
.muted{{color:#5c6470;font-size:12px}}
.box{{background:#f8f9fb;border:1px solid #dde1e8;border-radius:8px;padding:14px 16px;margin:14px 0}}
.box-warn{{background:#fff8e6;border-color:#e8dfc0}}
.box-good{{background:#eef8ee;border-color:#b8dfc4}}
.cols2{{display:grid;grid-template-columns:1fr 1fr;gap:14px}}
table{{border-collapse:collapse;width:100%;margin:10px 0 16px;font-size:12px}}
th,td{{border:1px solid #ccd0d8;padding:7px 9px;text-align:left}}
th{{background:#eef1f6;font-weight:600}}
blockquote{{border-left:3px solid #889;margin:10px 0;padding:8px 14px;background:#f5f7fa;font-style:italic;color:#333}}
.voice{{border:1px solid #dde1e8;border-radius:8px;padding:14px;margin:12px 0;page-break-inside:avoid}}
.voice.ok{{border-left:4px solid #2d6a4f}} .voice.partial{{border-left:4px solid #c47f00}}
.vmeta,.vgap{{font-size:11px;color:#5c6470;margin:0 0 6px}}
.vquote{{margin:0 0 8px}}
ul,ol{{margin:8px 0;padding-left:20px}}
li{{margin:4px 0}}
.toc a{{color:#2d6cdf;text-decoration:none}}
@media print{{body{{padding:0;max-width:none}} h2{{margin-top:24px}}}}
</style></head><body>

<h1>UEQ+ Evaluation — Bosch eBike Website</h1>
<p class="muted">Gesamtbericht Human (Testbirds Sep 2025) + AI Mirror (Aug 2026) · bosch-ebike.com/de · 2026-08-19</p>

<div class="box box-good">
<strong>Management Summary.</strong> Human-Tester (n=50, Smartphone) bewerten die Seite grundsätzlich positiv (Gesamteindruck <strong>+1,54</strong> auf Skala −3…+3). Größter Verbesserungsbedarf: <strong>Effizienz</strong> (aufgeräumt) und <strong>Durchschaubarkeit</strong> (übersichtlich). AI-Runs (24 Sessions) bestätigen Navigations- und Strukturprobleme, sind in den Scores aber kritischer (+0,73). Qualitativ stimmen Human und AI bei fehlendem Markenvergleich, Startseiten-Führung und Überladung überein.
</div>

<h2>Inhaltsverzeichnis</h2>
<ol class="toc">
<li><a href="#setup">Test Setup</a></li>
<li><a href="#ueq">UEQ+ Benchmark Human vs AI</a></li>
<li><a href="#human-voices">Human — qualitative Stimmen</a></li>
<li><a href="#ai-voices">AI — qualitative Stimmen</a></li>
<li><a href="#vergleich">Auswertung &amp; Parallelen</a></li>
<li><a href="#empfehlungen">Empfehlungen</a></li>
<li><a href="#methodik">Methodik &amp; Artefakte</a></li>
</ol>

<h2 id="setup">1. Test Setup</h2>
<div class="cols2">
<div class="box"><h3>Human (Testbirds)</h3><ul>
<li><strong>n=50</strong> · Smartphone (24 iOS, 26 Android)</li>
<li>50% Fahrer:in / 50% Interessent:in · Alter 25–75</li>
<li>3 Use Cases · 5 UEQ+ Skalen</li>
<li>Abschlussbericht Aug/Sep 2025</li></ul></div>
<div class="box"><h3>AI Mirror</h3><ul>
<li><strong>24 Runs</strong> (18 + 6 Retry Wave 4, max_steps=25)</li>
<li>6 Use Cases · 2 Personas · Think-Aloud DE</li>
<li>UX Journey Agent · UEQ+ Proxy ({ai_proxy_model})</li>
<li>2026-08-19</li></ul></div>
</div>

<h3>Use Cases</h3>
<table><thead><tr><th>UC</th><th>Fahrer:in</th><th>Interessent:in</th></tr></thead><tbody>
<tr><td>UC1</td><td>Flow App / Fahrerlebnis erweitern</td><td>Erste Orientierung (Typen)</td></tr>
<tr><td>UC2</td><td>Service &amp; Beratung</td><td>Technische Vorteile</td></tr>
<tr><td>UC3</td><td>Über uns / Marke</td><td>Über uns / Vertrauen</td></tr>
</tbody></table>

<h2 id="ueq">2. UEQ+ Benchmark (−3 … +3)</h2>

<h3>2.1 Gesamteindruck</h3>
<table><thead><tr><th>Quelle</th><th>Overall</th></tr></thead><tbody>
<tr><td>Human (Testbirds, gewichtet)</td><td><strong>{cmp_['overall']['human_ueq']:+.2f}</strong></td></tr>
<tr><td>AI (Proxy, 5 Dimensionen)</td><td><strong>{cmp_['overall']['ai_ueq']:+.2f}</strong></td></tr>
<tr><td>Delta (AI − Human)</td><td><strong>{cmp_['overall']['delta']:+.2f}</strong></td></tr>
</tbody></table>

<h3>2.2 Dimensionen — Human vs AI</h3>
<table><thead><tr><th>Dimension</th><th>Human</th><th>AI</th><th>Δ</th></tr></thead>
<tbody>{dim_table(cmp_)}</tbody></table>

<h3>2.3 Human — Item-Detail (Auswahl)</h3>
<table><thead><tr><th>Dimension</th><th>Schwächstes Item</th><th>Stärkstes Item</th><th>Wichtigkeit</th></tr></thead><tbody>
<tr><td>Effizienz</td><td>überladen→aufgeräumt (+0,34)</td><td>langsam→schnell (+1,50)</td><td>+1,74</td></tr>
<tr><td>Durchschaubarkeit</td><td>verwirrend→übersichtlich (+0,66)</td><td>schwer→leicht (+1,56)</td><td>+1,92</td></tr>
<tr><td>Stimulation</td><td>einschläfernd→aktivierend (+1,22)</td><td>minderwertig→wertvoll (+1,80)</td><td>+1,30</td></tr>
<tr><td>Inhaltsqualität</td><td>schlecht→gut (+1,94)</td><td>veraltet→aktuell (+2,44)</td><td>+2,22</td></tr>
<tr><td>Nützlichkeit</td><td>nicht lohnend→lohnend (+1,56)</td><td>nutzlos→nützlich (+2,08)</td><td>+1,88</td></tr>
</tbody></table>

<h3>2.4 AI nach Use Case (Proxy)</h3>
<table><thead><tr><th>UC</th><th>Overall</th>{dim_hdr}</tr></thead>
<tbody>{uc_table(agg_uc)}</tbody></table>

<h3>2.5 AI nach Segment (Proxy)</h3>
<table><thead><tr><th>Segment</th><th>Overall</th>{dim_hdr}</tr></thead>
<tbody>{seg_table(agg_seg)}</tbody></table>

<div class="box box-warn">AI goal-reached Rate: <strong>{bench_insights['goal_reached_rate']}%</strong> · Stärkste AI-Dimension: {esc(strongest)} · Schwächste: {esc(weakest)}</div>

<h2 id="human-voices">3. Human — qualitative Stimmen</h2>
{human_quotes(human['qualitative'])}

<h2 id="ai-voices">4. AI — qualitative Stimmen</h2>
{voice_cards(voices['voices'])}

<h2 id="vergleich">5. Auswertung &amp; Parallelen</h2>
<div class="cols2">
<div><h3>Übereinstimmungen</h3><ul>
<li>Effizienz &amp; Durchschaubarkeit: Struktur/Übersicht kritisch</li>
<li>Fehlender Marken-/Alltagsvergleich (UC2)</li>
<li>Startseite führt nicht schnell genug zum Ziel</li>
<li>Professionell, aber teils überladen</li></ul></div>
<div><h3>Unterschiede</h3><ul>
<li>Human +1,54 vs AI +0,73 (AI kritischer)</li>
<li>Größte Lücke: {esc(ha_insights['largest_gap_dim'])} (Δ {ha_insights['largest_gap_delta']:+.2f})</li>
<li>Human Smartphone · AI Desktop-Agent</li>
<li>Human 5 Skalen · AI + Intuitive Bedienung</li></ul></div>
</div>
<ul>{parallels}</ul>

<h2 id="empfehlungen">6. Empfehlungen</h2>
<ol>
<li><strong>Startseite als Schnellzugriff</strong> — Ziele direkt führen (Human 1608644, AI UC1).</li>
<li><strong>Visuelle Hierarchie / Entrümpelung</strong> — klarere Struktur (Human Management Summary).</li>
<li><strong>Markenvergleich &amp; Alltagsnutzen</strong> — konkret beantworten (Human 1608893, AI UC2).</li>
<li><strong>Mobile Komponenten-Vergleich</strong> — Human: Side-by-side auf Handy schwer.</li>
<li><strong>Service sichtbarer</strong> — AI: Help Center stark, Startseite schwach.</li>
<li><strong>Navigation Flow App / Über uns</strong> — AI: Detail-Links blockiert.</li>
</ol>

<h2 id="methodik">7. Methodik &amp; Quellen</h2>
<table><thead><tr><th>Quelle</th><th>Pfad</th></tr></thead><tbody>
<tr><td>Test-Setup docx</td><td>Desktop/Test_Setup_UEQ+Benchmarking_final (1).docx</td></tr>
<tr><td>Human Abschlussbericht</td><td>Desktop/Abschlussbericht_UEQ+_eBike_2025 (1).pdf</td></tr>
<tr><td>AI Raw Runs</td><td>knowledge/ueq-ebike-runs/2026-08-19/</td></tr>
<tr><td>Scripts</td><td>run-ueq-ebike-batch.sh · infer · build-compare · export-voices · export-gesamtbericht</td></tr>
</tbody></table>
<p class="muted" style="margin-top:28px">AUDION v3 · UEQ+ eBike Gesamtbericht · AI-Scores = Proxy aus Think-Aloud</p>
</body></html>"""


if __name__ == "__main__":
    main()
