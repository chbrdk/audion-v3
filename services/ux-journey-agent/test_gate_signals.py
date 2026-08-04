"""Unit tests for Live-Gate signal computation on job status."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

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
    assert signals["consentAccepted"] is False
    assert signals["goalReached"] is False
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
    assert out["gateSignals"]["consentAccepted"] is False
    assert out["gateSignals"]["consentRejected"] is False
    assert out["gateSignals"]["goalReached"] is False
    assert out["gateSignals"]["finalUrl"] == "https://example.org/"
    assert out["flowCursor"]["gateEvaluations"] is None


def test_gate_signals_consent_accept_and_reject():
    accept = agent_main._compute_gate_signals(
        {
            "steps": [
                {
                    "action": "click",
                    "target": "Externen Inhalt bestätigen",
                    "result": "Dialog akzeptiert",
                }
            ]
        }
    )
    assert accept["gateSignals"]["consentAccepted"] is True
    assert accept["gateSignals"]["consentRejected"] is False
    reject = agent_main._compute_gate_signals(
        {
            "steps": [
                {
                    "action": "click",
                    "target": "Ablehnen",
                    "result": "Wandere zu Google ab",
                }
            ]
        }
    )
    assert reject["gateSignals"]["consentRejected"] is True


def test_gate_signals_goal_from_success_and_scorecard():
    from_success = agent_main._compute_gate_signals({"success": True, "steps": []})
    assert from_success["gateSignals"]["goalReached"] is True
    from_sc = agent_main._compute_gate_signals(
        {
            "steps": [],
            "scorecard": {"coverage": {"goalReached": True}},
        }
    )
    assert from_sc["gateSignals"]["goalReached"] is True


def test_gate_signals_elapsed_seconds():
    t0 = datetime(2026, 8, 4, 12, 0, 0, tzinfo=timezone.utc)
    t1 = t0 + timedelta(seconds=47)
    out = agent_main._compute_gate_signals(
        {
            "steps": [
                {"step": 1, "timestamp": t0.isoformat()},
                {"step": 2, "timestamp": t1.isoformat()},
            ]
        }
    )
    assert out["gateSignals"]["elapsedSeconds"] == 47.0
