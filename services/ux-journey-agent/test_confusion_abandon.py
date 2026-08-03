"""Lab L2: hard abandon after N unexplained confusion cues."""

from __future__ import annotations

import main as ux_main


def test_text_detects_grey_and_matrix():
    assert ux_main._text_has_confusion_cue("Die Optionen sind grau und ich weiß nicht warum.")
    assert ux_main._text_has_confusion_cue("Filterlogik unklar, Matrix verwirrend.")
    assert not ux_main._text_has_confusion_cue("Alles klar, keine Verwirrung.")
    assert not ux_main._text_has_confusion_cue("Ich klicke auf Service.")


def test_step_blob_uses_think_aloud():
    step = {
        "step": 3,
        "action": "click",
        "thinkAloud": {
            "seen": "ausgeblendete Displays",
            "think": "Filterursache unbekannt",
            "feel": {"label": "frustriert", "valence": -2},
        },
    }
    assert ux_main._step_has_confusion_cue(step)


def test_enabled_for_impatient_by_default(monkeypatch):
    monkeypatch.delenv("UX_JOURNEY_CONFUSION_ABANDON", raising=False)
    assert ux_main._confusion_abandon_enabled(0.9) is True
    assert ux_main._confusion_abandon_enabled(0.5) is False
    assert ux_main._confusion_abandon_enabled(None) is False


def test_env_force_on_and_off(monkeypatch):
    monkeypatch.setenv("UX_JOURNEY_CONFUSION_ABANDON", "1")
    assert ux_main._confusion_abandon_enabled(0.1) is True
    monkeypatch.setenv("UX_JOURNEY_CONFUSION_ABANDON", "0")
    assert ux_main._confusion_abandon_enabled(0.99) is False


def test_counter_arms_force_after_threshold(monkeypatch):
    monkeypatch.setenv("UX_JOURNEY_CONFUSION_ABANDON_AFTER", "2")
    monkeypatch.setenv("UX_JOURNEY_CONFUSION_ABANDON", "1")
    state = ux_main._new_confusion_abandon_state(0.2)
    assert state["enabled"] is True
    steps = [
        {"step": 1, "reasoning": "Ich navigiere zur Seite."},
        {"step": 2, "reasoning": "Einige Optionen sind grau ohne Erklärung."},
        {"step": 3, "thinkAloud": {"think": "Immer noch unklar warum disabled."}},
    ]
    ux_main._update_confusion_abandon_from_steps(state, steps)
    assert state["count"] == 2
    assert state["forceNext"] is True
    assert len(state["cues"]) == 2

    # Idempotent on re-scan of same steps
    ux_main._update_confusion_abandon_from_steps(state, steps)
    assert state["count"] == 2


def test_public_snapshot_is_json_safe(monkeypatch):
    monkeypatch.setenv("UX_JOURNEY_CONFUSION_ABANDON", "1")
    state = ux_main._new_confusion_abandon_state(0.9)
    state["seenSteps"].add(1)
    state["count"] = 1
    state["cues"].append({"step": 1, "snippet": "grau"})
    pub = ux_main._confusion_abandon_public(state)
    assert pub["enabled"] is True
    assert pub["count"] == 1
    assert pub["cues"][0]["step"] == 1
    assert "seenSteps" not in pub


def test_force_message_mentions_done():
    msg = ux_main._confusion_abandon_force_message(
        {"count": 2, "threshold": 2, "cues": [{"step": 4, "snippet": "grau"}]}
    )
    assert "done" in msg.lower()
    assert "success=false" in msg
    assert "grau" in msg


def test_abandon_summary_names_cues():
    summary = ux_main._confusion_abandon_summary(
        {
            "count": 2,
            "cues": [
                {"step": 3, "snippet": "Akkus grau"},
                {"step": 4, "snippet": "Displays noch grau / Verwirrung"},
            ],
        }
    )
    assert "breche ab" in summary.lower() or "Abbruch" in summary or "ab" in summary.lower()
    assert "grau" in summary.lower()
