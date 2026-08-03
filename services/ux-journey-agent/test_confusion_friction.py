"""Lab L3: confusion observation tags → friction floor."""

from __future__ import annotations

import main as ux_main


def test_infer_disabled_grey():
    assert (
        ux_main._infer_confusion_tag("Displays bleiben grau ohne Erklärung.")
        == "disabled_option_unexplained"
    )


def test_infer_filter_cause():
    assert (
        ux_main._infer_confusion_tag("Filterlogik unklar — ich weiß nicht warum.")
        == "filter_cause_unknown"
    )


def test_infer_selection_order():
    assert (
        ux_main._infer_confusion_tag(
            "Unerwartete Reihenfolge: erst Akku wählen bevor Displays aktiv werden."
        )
        == "selection_order_surprise"
    )


def test_infer_none_on_clean():
    assert ux_main._infer_confusion_tag("Ich klicke auf Service und finde die Seite.") is None


def test_coerce_keeps_explicit_tag():
    obs = ux_main._coerce_observation_entry(
        {
            "category": "affordance",
            "polarity": -2,
            "severity": "high",
            "tag": "disabled_option_unexplained",
            "note": "Optionen grau.",
        }
    )
    assert obs is not None
    assert obs["tag"] == "disabled_option_unexplained"


def test_coerce_infers_tag_from_note():
    obs = ux_main._coerce_observation_entry(
        {
            "category": "navigation",
            "polarity": -1,
            "severity": "medium",
            "note": "Matrix-Filter ohne Erklärung — unklar.",
        }
    )
    assert obs is not None
    assert obs["tag"] == "filter_cause_unknown"


def test_collect_tags_from_narration(monkeypatch):
    monkeypatch.delenv("UX_JOURNEY_CONFUSION_FRICTION_FLOOR_1", raising=False)
    steps = [
        {"step": 1, "reasoning": "Cookie wegklicken."},
        {
            "step": 2,
            "reasoning": "Akkus und Displays sind grau ausgegraut ohne Erklärung.",
            "thinkAloud": {"think": "Warum sind die grau?"},
        },
        {
            "step": 3,
            "observations": [
                {
                    "category": "affordance",
                    "polarity": -2,
                    "severity": "high",
                    "tag": "filter_cause_unknown",
                    "note": "Filterursache unbekannt.",
                }
            ],
            "reasoning": "Immer noch unklar.",
        },
    ]
    tags = ux_main._collect_confusion_tags(steps)
    assert len(tags) >= 2
    tag_names = {t["tag"] for t in tags}
    assert "disabled_option_unexplained" in tag_names or "filter_cause_unknown" in tag_names


def test_friction_floor_raises_optimistic_score(monkeypatch):
    monkeypatch.setenv("UX_JOURNEY_CONFUSION_FRICTION_FLOOR_1", "6")
    monkeypatch.setenv("UX_JOURNEY_CONFUSION_FRICTION_FLOOR_2", "8")
    scorecard = {"frictionScore": 3, "coverage": {"goalReached": True}}
    tags = [
        {"step": 2, "tag": "disabled_option_unexplained", "source": "narration"},
        {"step": 3, "tag": "filter_cause_unknown", "source": "observation"},
    ]
    out = ux_main._apply_confusion_friction(scorecard, tags)
    assert out["frictionScore"] == 8
    assert out["confusion"]["applied"] is True
    assert out["confusion"]["raisedFrom"] == 3
    assert out["confusion"]["tagCount"] == 2


def test_friction_floor_noop_when_already_high(monkeypatch):
    monkeypatch.setenv("UX_JOURNEY_CONFUSION_FRICTION_FLOOR_2", "8")
    scorecard = {"frictionScore": 9}
    tags = [
        {"step": 1, "tag": "disabled_option_unexplained", "source": "narration"},
        {"step": 2, "tag": "filter_cause_unknown", "source": "narration"},
    ]
    out = ux_main._apply_confusion_friction(scorecard, tags)
    assert out["frictionScore"] == 9
    assert out["confusion"]["applied"] is False


def test_single_tag_uses_floor_1(monkeypatch):
    monkeypatch.setenv("UX_JOURNEY_CONFUSION_FRICTION_FLOOR_1", "6")
    monkeypatch.setenv("UX_JOURNEY_CONFUSION_FRICTION_FLOOR_2", "8")
    scorecard = {"frictionScore": 2}
    out = ux_main._apply_confusion_friction(
        scorecard,
        [{"step": 1, "tag": "disabled_option_unexplained", "source": "narration"}],
    )
    assert out["frictionScore"] == 6
