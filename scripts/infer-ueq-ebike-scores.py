#!/usr/bin/env python3
"""Infer UEQ+ proxy scores from UX Journey Agent think-aloud text (no raw UEQ numerics in runs)."""
from __future__ import annotations

import json
import os
import re
import sys
import urllib.request
from collections import defaultdict
from datetime import date
from pathlib import Path
from statistics import mean

ROOT = Path(__file__).resolve().parents[1]
RUNS_DIR = ROOT / "knowledge/ueq-ebike-runs/2026-08-19"
OUT_JSON = ROOT / "knowledge/ueq-ebike-benchmark-2026-08-19.json"
OUT_HTML = ROOT / "knowledge/ueq-ebike-benchmark-2026-08-19.html"

DIMENSIONS = [
    "effizienz",
    "durchschaubarkeit",
    "stimulation",
    "intuitive_bedienung",
    "inhaltsqualitaet",
    "nuetzlichkeit",
]

RUN_META = {
    "A-UC1-ebiker-fahrerlebnis": ("UC1", "eBiker", "Fahrerlebnis / Flow App"),
    "B-UC1-interessent-orientierung": ("UC1", "Interessent", "Orientierung"),
    "C-UC2-ebiker-service": ("UC2", "eBiker", "Service"),
    "D-UC2-interessent-technik": ("UC2", "Interessent", "Technik"),
    "E-UC3-ebiker-ueber-uns": ("UC3", "eBiker", "Über uns"),
    "F-UC3-interessent-ueber-uns": ("UC3", "Interessent", "Über uns"),
}


def load_dotenv(path: Path) -> dict[str, str]:
    env: dict[str, str] = {}
    if not path.is_file():
        return env
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip()
    return env


def journey_text(path: Path) -> str:
    data = json.loads(path.read_text())
    parts: list[str] = []
    result = data.get("result") or {}
    for step in result.get("steps") or []:
        meta = step.get("reasoningMeta") or {}
        for key in ("memory", "next_goal", "evaluation_previous_goal"):
            val = meta.get(key)
            if val and len(val.strip()) > 30:
                parts.append(val.strip())
        res = (step.get("result") or "").strip()
        if len(res) > 30:
            parts.append(res)
    return "\n\n".join(parts)[:12000]


def openai_infer(api_key: str, model: str, run_id: str, use_case: str, segment: str, text: str) -> dict:
    prompt = f"""Du bist UEQ+-Auswerter. Bewerte die folgende Think-Aloud-Journey auf der Bosch eBike Website.
Use Case: {use_case} ({segment}) — Run {run_id}

Antworte NUR mit JSON (kein Markdown):
{{
  "pairs": {{
    "effizienz": {{"scores": [int,int,int,int], "importance": int}},
    "durchschaubarkeit": {{"scores": [int,int,int,int], "importance": int}},
    "stimulation": {{"scores": [int,int,int,int], "importance": int}},
    "intuitive_bedienung": {{"scores": [int,int,int,int], "importance": int}},
    "inhaltsqualitaet": {{"scores": [int,int,int,int], "importance": int}},
    "nuetzlichkeit": {{"scores": [int,int,int,int], "importance": int}}
  }},
  "rationale": "kurz auf Deutsch",
  "goal_reached": true/false
}}

Skala je Score: 1=linker Pol negativ, 7=rechter Pol positiv. Wichtigkeit 1-7.
Leite Werte aus dem Journey-Text ab.

Journey-Text:
{text}
"""
    body = {
        "model": model,
        "messages": [
            {"role": "system", "content": "Antworte nur mit validem JSON."},
            {"role": "user", "content": prompt},
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.2,
    }
    req = urllib.request.Request(
        "https://api.openai.com/v1/chat/completions",
        data=json.dumps(body).encode(),
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        payload = json.loads(resp.read())
    content = payload["choices"][0]["message"]["content"]
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        m = re.search(r"\{.*\}", content, re.S)
        if not m:
            raise
        return json.loads(m.group(0))


def dim_mean(pairs: dict) -> float:
    scores = pairs.get("scores") or []
    return round(mean(scores), 2) if scores else 0.0


def weighted_overall(pairs_by_dim: dict) -> float:
    total_w = 0.0
    total = 0.0
    for dim in DIMENSIONS:
        block = pairs_by_dim.get(dim) or {}
        m = dim_mean(block)
        w = block.get("importance") or 1
        total += m * w
        total_w += w
    return round(total / total_w, 2) if total_w else 0.0


def render_html(report: dict) -> str:
    rows_overall = ""
    for dim in DIMENSIONS:
        v = report["aggregates"]["overall"].get(dim, 0)
        rows_overall += f"<tr><td>{dim.replace('_', ' ').title()}</td><td>{v}</td></tr>"

    uc_rows = ""
    for uc, vals in sorted(report["aggregates"]["by_use_case"].items()):
        uc_rows += f"<tr><td>{uc}</td><td>{vals['overall']}</td>"
        for dim in DIMENSIONS:
            uc_rows += f"<td>{vals.get(dim, '—')}</td>"
        uc_rows += "</tr>"

    seg_rows = ""
    for seg, vals in sorted(report["aggregates"]["by_segment"].items()):
        seg_rows += f"<tr><td>{seg}</td><td>{vals['overall']}</td>"
        for dim in DIMENSIONS:
            seg_rows += f"<td>{vals.get(dim, '—')}</td>"
        seg_rows += "</tr>"

    dim_headers = "".join(f"<th>{d.replace('_', ' ').title()}</th>" for d in DIMENSIONS)

    return f"""<!doctype html><html lang="de"><head><meta charset="utf-8"/>
<title>UEQ+ eBike AI Benchmark</title>
<style>
body{{font-family:-apple-system,sans-serif;max-width:980px;margin:0 auto;padding:32px;line-height:1.45;color:#16181d}}
h1{{font-size:24px}} h2{{font-size:17px;margin-top:28px;border-bottom:1px solid #ddd;padding-bottom:6px}}
.muted{{color:#5c6470;font-size:13px}}
.box{{background:#fff8e6;border:1px solid #e8dfc0;padding:14px;border-radius:8px;margin:16px 0}}
table{{border-collapse:collapse;width:100%;font-size:13px;margin:12px 0}}
th,td{{border:1px solid #ddd;padding:8px;text-align:left}}
th{{background:#f5f7fa}}
.bar{{display:inline-block;height:10px;background:#2d6cdf;border-radius:2px}}
</style></head><body>
<h1>Bosch eBike UEQ+ — AI Benchmark (Proxy)</h1>
<p class="muted">Quelle: {report['meta']['runs_dir']} · {report['meta']['run_count']} Runs · {report['meta']['date']}</p>
<div class="box"><strong>Hinweis:</strong> Keine numerischen UEQ-Werte in Agent-Rohdaten. Scores sind <em>AI-inferiert</em> aus Think-Aloud-Text (OpenAI {report['meta']['model']}). Skala 1–7 pro Dimension (Mittel der 4 Gegensatzpaare). Human-Baseline (n=50) noch nicht eingespielt.</div>

<h2>Gesamt-Benchmark</h2>
<p><strong>Overall UEQ+ Proxy:</strong> {report['aggregates']['overall']['weighted_mean']} / 7</p>
<table><thead><tr><th>Dimension</th><th>Mittel (1–7)</th></tr></thead><tbody>{rows_overall}</tbody></table>

<h2>Nach Use Case</h2>
<table><thead><tr><th>Use Case</th><th>Overall</th>{dim_headers}</tr></thead><tbody>{uc_rows}</tbody></table>

<h2>Nach Segment</h2>
<table><thead><tr><th>Segment</th><th>Overall</th>{dim_headers}</tr></thead><tbody>{seg_rows}</tbody></table>

<h2>Stärken / Schwächen (aggregiert)</h2>
<ul>
<li><strong>Stärkste Dimension:</strong> {report['insights']['strongest_dim']} ({report['insights']['strongest_val']})</li>
<li><strong>Schwächste Dimension:</strong> {report['insights']['weakest_dim']} ({report['insights']['weakest_val']})</li>
<li><strong>Goal reached rate:</strong> {report['insights']['goal_reached_rate']}%</li>
</ul>
</body></html>"""


def main() -> int:
    env = {**load_dotenv(ROOT / "services/ux-journey-agent/.env.local"), **os.environ}
    api_key = env.get("OPENAI_API_KEY", "").strip()
    # Prefer UEQ_INFER_MODEL → UX_JOURNEY_OPENAI_MODEL → gpt-5.6-luna (never gpt-4o*).
    model = (
        env.get("UEQ_INFER_MODEL")
        or env.get("UX_JOURNEY_OPENAI_MODEL")
        or "gpt-5.6-luna"
    ).strip()
    if model.startswith("gpt-4o") and "tts" not in model:
        print(f"WARN: refusing chat model {model!r}; using gpt-5.6-luna", file=sys.stderr)
        model = "gpt-5.6-luna"
    if not api_key:
        print("FATAL: OPENAI_API_KEY missing", file=sys.stderr)
        return 1

    run_files = sorted(RUNS_DIR.glob("wave-*/run-*.json"))
    if not run_files:
        print(f"FATAL: no runs in {RUNS_DIR}", file=sys.stderr)
        return 1

    scored: list[dict] = []
    for path in run_files:
        wave = re.search(r"wave-(\d+)", str(path)).group(1)
        run_id = path.stem.replace("run-", "")
        uc, segment, label = RUN_META.get(run_id, ("?", "?", run_id))
        text = journey_text(path)
        if len(text) < 200:
            print(f"skip {path.name}: text too short")
            continue
        print(f"scoring {path.name} …")
        inferred = openai_infer(api_key, model, run_id, label, segment, text)
        raw = json.loads(path.read_text())
        sc = (raw.get("result") or {}).get("scorecard") or {}
        entry = {
            "wave": int(wave),
            "run_id": run_id,
            "use_case": uc,
            "segment": segment,
            "label": label,
            "friction_score": sc.get("frictionScore"),
            "goal_reached_agent": inferred.get("goal_reached"),
            "rationale": inferred.get("rationale", ""),
            "pairs": inferred.get("pairs", {}),
            "dimension_means": {d: dim_mean(inferred.get("pairs", {}).get(d, {})) for d in DIMENSIONS},
            "overall": weighted_overall(inferred.get("pairs", {})),
        }
        scored.append(entry)

    by_dim: dict[str, list[float]] = defaultdict(list)
    by_uc: dict[str, list[dict]] = defaultdict(list)
    by_seg: dict[str, list[dict]] = defaultdict(list)
    goals = 0
    for e in scored:
        by_uc[e["use_case"]].append(e)
        by_seg[e["segment"]].append(e)
        if e["goal_reached_agent"]:
            goals += 1
        for d in DIMENSIONS:
            by_dim[d].append(e["dimension_means"][d])

    def agg_entries(entries: list[dict]) -> dict:
        out = {"overall": round(mean([x["overall"] for x in entries]), 2) if entries else 0}
        for d in DIMENSIONS:
            vals = [x["dimension_means"][d] for x in entries]
            out[d] = round(mean(vals), 2) if vals else 0
        return out

    overall_dims = {d: round(mean(v), 2) for d, v in by_dim.items()}
    overall_weighted = round(mean([e["overall"] for e in scored]), 2) if scored else 0
    strongest = max(overall_dims.items(), key=lambda x: x[1])
    weakest = min(overall_dims.items(), key=lambda x: x[1])

    report = {
        "meta": {
            "date": str(date.today()),
            "runs_dir": str(RUNS_DIR.relative_to(ROOT)),
            "run_count": len(scored),
            "model": model,
            "method": "AI-inferred UEQ+ proxy from think-aloud text",
        },
        "runs": scored,
        "aggregates": {
            "overall": {**overall_dims, "weighted_mean": overall_weighted},
            "by_use_case": {uc: agg_entries(es) for uc, es in sorted(by_uc.items())},
            "by_segment": {seg: agg_entries(es) for seg, es in sorted(by_seg.items())},
        },
        "insights": {
            "strongest_dim": strongest[0],
            "strongest_val": strongest[1],
            "weakest_dim": weakest[0],
            "weakest_val": weakest[1],
            "goal_reached_rate": round(100 * goals / len(scored), 1) if scored else 0,
        },
    }

    OUT_JSON.write_text(json.dumps(report, ensure_ascii=False, indent=2))
    OUT_HTML.write_text(render_html(report))
    print(f"Wrote {OUT_JSON}")
    print(f"Wrote {OUT_HTML}")
    print(f"Overall UEQ+ proxy: {overall_weighted}/7")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
