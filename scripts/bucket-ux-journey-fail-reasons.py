#!/usr/bin/env python3
"""Bucket UX Journey run JSON files by fail reason (goal_ok / nav_hover / …).

@see knowledge/ux-agent-luna-vision-2026-08-20.md
"""
from __future__ import annotations

import argparse
import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

NAV_HOVER_RE = re.compile(
    r"mega[\s-]?menu|hover|untermen[uü]|submenu|nicht\s+klick|"
    r"klick(?:e|en)?\s+(?:nicht|fails|scheitert)|nav(?:igation)?\s+(?:öffnet\s+nicht|blockiert)|"
    r"men[uü]\s+(?:öffnet|geht)\s+nicht|dropdown\s+(?:geht|öffnet)\s+nicht",
    re.I,
)
CLICK_BLOCKED_RE = re.compile(
    r"not\s+interactable|click\s+fail|element\s+(?:not\s+)?(?:found|visible)|"
    r"klick\s+scheitert|konnte\s+nicht\s+klicken|pointer-events|"
    r"click\s+blocked|klick\s+blockiert|nav_hub:err",
    re.I,
)
EMPTY_ACTIONS_RE = re.compile(
    r"empty\s+actions?|model_output.?None|consecutive\s+failures?|keine\s+Aktion",
    re.I,
)
MAX_STEPS_RE = re.compile(r"max[_\s-]?steps|step\s+limit|step\s+budget", re.I)
# Soft goal: left home onto task surface but landed on marketing CTA.
SOFT_CTA_RE = re.compile(
    r"newsletter|anmeldung|subscription|[?&]utm_|utm_campaign|utm_medium|utm_source|"
    r"cta-|signup|sign-up|registr|login|werbung|promo|subscribe",
    re.I,
)


def _walk_text(obj, budget: int = 80_000) -> str:
    parts: list[str] = []
    size = 0

    def add(s: str) -> None:
        nonlocal size
        if size >= budget:
            return
        parts.append(s)
        size += len(s)

    def walk(x) -> None:
        if size >= budget:
            return
        if isinstance(x, dict):
            for k, v in x.items():
                if k in (
                    "screenshot",
                    "screenshots",
                    "video",
                    "image",
                    "b64",
                    "base64",
                    "taskDescription",
                    "task",
                ):
                    continue
                walk(v)
        elif isinstance(x, list):
            for i in x[:200]:
                walk(i)
        elif isinstance(x, str):
            add(x[:4000])
        elif isinstance(x, (int, float, bool)) or x is None:
            pass
        else:
            add(str(x)[:500])

    walk(obj)
    return "\n".join(parts)


def _final_url(data: dict) -> str:
    r = data.get("result") if isinstance(data.get("result"), dict) else data
    if not isinstance(r, dict):
        return ""
    for key in ("finalUrl", "final_url"):
        if r.get(key):
            return str(r[key])
    gs = data.get("gateSignals") if isinstance(data.get("gateSignals"), dict) else {}
    if isinstance(r.get("gateSignals"), dict):
        gs = {**gs, **r["gateSignals"]}
    return str(gs.get("finalUrl") or "")


def _task_text(data: dict) -> str:
    r = data.get("result") if isinstance(data.get("result"), dict) else {}
    if isinstance(r, dict):
        t = str(r.get("taskDescription") or r.get("task") or "")
        if t:
            return t
    return str(data.get("task") or "")


def _is_home_url(url: str) -> bool:
    u = (url or "").strip().lower().rstrip("/")
    if not u:
        return True
    # e.g. https://www.bosch-ebike.com/de or .../de/
    return bool(re.search(r"https?://[^/]+(?:/(?:de|en|fr|it|es))?$", u))


# Task → path fragments that count as goal surface (site-agnostic-ish for Bosch eBike batches).
_TASK_URL_HINTS: list[tuple[re.Pattern[str], tuple[str, ...]]] = [
    (re.compile(r"service|beratung|help\s*center|wartungs?|ersatzteil", re.I), ("service", "beratung", "help", "support", "faq")),
    (re.compile(r"über\s*uns|ueber\s*uns|unternehmen|marke|nachhaltig", re.I), ("ueber-uns", "über-uns", "unternehmen", "about", "company")),
    (re.compile(r"flow\s*app|fahrerlebnis|erweitere\s+dein", re.I), ("flow", "app", "erlebnis", "experience")),
    (re.compile(r"technik|drive\s*unit|display|akku|komponent|system", re.I), ("system", "technik", "komponent", "antrieb", "akku", "display", "produkte")),
    (re.compile(r"eCity|eMTB|eTrekking|orientierung|typen", re.I), ("ecity", "emtb", "etrekking", "typ", "modelle", "raeder", "räder")),
]


def _url_matches_task(url: str, task: str) -> bool:
    u = (url or "").lower()
    if _is_home_url(u):
        return False
    for task_re, frags in _TASK_URL_HINTS:
        if task_re.search(task or ""):
            if any(f in u for f in frags):
                return True
    # generic: any deeper path beyond locale
    path = re.sub(r"^https?://[^/]+", "", u)
    parts = [p for p in path.split("/") if p and p not in {"de", "en", "fr", "it", "es"}]
    return len(parts) >= 1


def _goal_reached(data: dict) -> bool:
    """URL-grounded goal — ignore run.success and premature gateSignals.goalReached."""
    url = _final_url(data)
    task = _task_text(data)
    if _url_matches_task(url, task):
        return True
    # Explicit coverage only when URL also left home
    r = data.get("result") if isinstance(data.get("result"), dict) else {}
    if isinstance(r, dict) and not _is_home_url(url):
        cov = r.get("coverage")
        if isinstance(cov, dict) and cov.get("goalReached") is True:
            return True
    return False


def _url_progress(data: dict, task: str) -> bool:
    return _url_matches_task(_final_url(data), task)


def _is_soft_goal_url(url: str) -> bool:
    return bool(SOFT_CTA_RE.search(url or ""))


def bucket_run(path: Path) -> str:
    data = json.loads(path.read_text())
    if _goal_reached(data):
        if _is_soft_goal_url(_final_url(data)):
            return "goal_soft"
        return "goal_ok"
    text = _walk_text(data)
    task = _task_text(data)
    r = data.get("result") if isinstance(data.get("result"), dict) else {}

    if EMPTY_ACTIONS_RE.search(text):
        return "empty_actions"
    if NAV_HOVER_RE.search(text):
        return "nav_hover"
    if CLICK_BLOCKED_RE.search(text):
        return "click_blocked"
    step_budget = None
    if isinstance(r, dict):
        sb = r.get("stepBudget")
        if isinstance(sb, dict):
            step_budget = sb
        n_steps = len(r.get("steps") or []) if isinstance(r.get("steps"), list) else 0
        max_steps = int((step_budget or {}).get("max") or r.get("maxSteps") or 0)
        if max_steps and n_steps >= max_steps and not _url_progress(data, task):
            return "max_steps"
    if MAX_STEPS_RE.search(text) and not _url_progress(data, task):
        return "max_steps"
    if not _url_progress(data, task):
        return "click_no_nav"
    return "other"


def _rel(path: Path) -> str:
    try:
        return str(path.resolve().relative_to(ROOT.resolve()))
    except ValueError:
        return str(path)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument(
        "paths",
        nargs="*",
        type=Path,
        default=[ROOT / "knowledge/ueq-ebike-runs/2026-08-19"],
        help="Run JSON files or directories (default: UEQ eBike baseline)",
    )
    ap.add_argument(
        "--out",
        type=Path,
        default=ROOT / "knowledge/ux-journey-fail-buckets-latest.json",
        help="Write summary JSON",
    )
    args = ap.parse_args()

    files: list[Path] = []
    for p in args.paths:
        p = p if p.is_absolute() else (Path.cwd() / p)
        if p.is_dir():
            files.extend(sorted(p.rglob("run-*.json")))
        elif p.is_file() and p.name.startswith("run-") and p.suffix == ".json":
            files.append(p)
    seen: set[Path] = set()
    uniq: list[Path] = []
    for f in files:
        f = f.resolve()
        if f in seen or not f.name.startswith("run-") or f.suffix != ".json":
            continue
        seen.add(f)
        uniq.append(f)

    counts: Counter[str] = Counter()
    rows: list[dict] = []
    for f in uniq:
        try:
            b = bucket_run(f)
            err = None
        except Exception as exc:
            b = "other"
            err = str(exc)
        counts[b] += 1
        row = {"file": _rel(f), "bucket": b}
        if err:
            row["error"] = err
        rows.append(row)

    total = sum(counts.values()) or 1
    summary = {
        "total": sum(counts.values()),
        "counts": dict(counts),
        "rates": {k: round(100.0 * v / total, 1) for k, v in sorted(counts.items())},
        "baseline_note": "UEQ eBike 2026-08-19 URL-grounded goal_ok ≈ 8.3%",
        "rows": rows,
    }
    out = args.out if args.out.is_absolute() else Path.cwd() / args.out
    out.write_text(json.dumps(summary, ensure_ascii=False, indent=2))
    print(json.dumps({"total": summary["total"], "counts": summary["counts"], "rates": summary["rates"]}, indent=2))
    print(f"Wrote {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
