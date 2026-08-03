"""P3 — offline overlap scorer vs human salience gold for Lab B."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from perception import perception_noticed_overlap

_GOLD_PATH = (
    Path(__file__).resolve().parents[2]
    / "knowledge"
    / "fixtures"
    / "perception-human-gold-b.json"
)


def load_human_gold(path: Path | None = None) -> dict[str, Any]:
    p = path or _GOLD_PATH
    return json.loads(p.read_text(encoding="utf-8"))


def score_run_against_gold(
    steps: list[dict[str, Any]],
    gold: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Aggregate noticed across steps and score vs humanSalience labels."""
    g = gold or load_human_gold()
    labels = list(g.get("humanSalience") or [])
    noticed: list[dict[str, Any]] = []
    for step in steps:
        perc = step.get("perception") if isinstance(step, dict) else None
        if not isinstance(perc, dict):
            continue
        for n in perc.get("noticed") or []:
            if isinstance(n, dict):
                noticed.append(n)
    overlap = perception_noticed_overlap(noticed, labels)
    abandon = any(
        isinstance(s.get("perception"), dict)
        and s["perception"].get("stance") == "abandon"
        for s in steps
        if isinstance(s, dict)
    )
    return {
        "goldId": g.get("id"),
        "overlap": overlap,
        "agentAbandon": abandon,
        "humanAbandonReason": g.get("humanAbandonReason"),
        "closer": bool(overlap.get("closer")) and (abandon or overlap["score"] >= 0.65),
    }
