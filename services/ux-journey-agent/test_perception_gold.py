"""P3 human-gold perception overlap tests."""

from __future__ import annotations

from perception_gold import load_human_gold, score_run_against_gold


def test_load_gold_fixture():
    gold = load_human_gold()
    assert gold["id"] == "perception-human-gold-b"
    assert "grau" in gold["humanSalience"]


def test_overlap_closer_when_noticed_matches():
    steps = [
        {
            "step": 1,
            "perception": {
                "noticed": [
                    {"what": "Displays grau nach Performance Line", "relevance": "high"},
                    {"what": "Filter unklar warum", "relevance": "high"},
                ],
                "stance": "abandon",
            },
        }
    ]
    result = score_run_against_gold(steps)
    assert result["overlap"]["score"] >= 0.5
    assert result["closer"] is True


def test_overlap_misses_when_unrelated():
    steps = [
        {
            "step": 1,
            "perception": {
                "noticed": [{"what": "Cookie Banner akzeptieren", "relevance": "low"}],
                "stance": "proceed",
            },
        }
    ]
    result = score_run_against_gold(steps)
    assert result["overlap"]["score"] < 0.5
    assert result["closer"] is False
