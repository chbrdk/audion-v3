"""Unit tests for Live-Gate signal computation on job status."""
from __future__ import annotations

from datetime import datetime, timezone

import main as agent_main


def test_gate_signals_url_and_frustration_from_perception():
    result = {
        "steps": [
            {
                "step": 1,
                "action": "navigate",
                "target": "https://example.org/",
                "perception": {"clarity": 2, "stance": "proceed"},
            },
            {
                "step": 2,
                "action": "click",
                "target": "button",
                "perception": {
                    "clarity": 0,
                    "stance": "abandon",
                    "confusion": "filter_cause_unknown",
                },
            },
        ],
        "finalUrl": "https://example.com/done",
        "finalTitle": "Done",
    }
    out = agent_main._compute_gate_signals(result)
    signals = out["gateSignals"]
    assert signals["finalUrl"] == "https://example.com/done"
    assert signals["finalTitle"] == "Done"
    assert signals["frustrationHigh"] is True
    assert signals["confusionNamed"] is True
    assert signals["evaluatedAt"]
    cursor = out["flowCursor"]
    assert cursor["activeEdgeKind"] == "when"
    conds = {e["condition"] for e in (cursor["gateEvaluations"] or [])}
    assert "frustration_high" in conds
    assert "confusion_named" in conds
    assert "url_match" not in conds  # canvas applies pattern


def test_gate_signals_calm_run():
    result = {
        "steps": [
            {
                "step": 1,
                "target": "https://example.org/",
                "perception": {"clarity": 3, "stance": "proceed"},
            }
        ]
    }
    out = agent_main._compute_gate_signals(result)
    assert out["gateSignals"]["frustrationHigh"] is False
    assert out["gateSignals"]["confusionNamed"] is False
    assert out["gateSignals"]["finalUrl"] == "https://example.org/"
    assert out["flowCursor"]["gateEvaluations"] is None
