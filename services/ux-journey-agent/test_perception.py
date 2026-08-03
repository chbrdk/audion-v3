"""Perception-in-the-Loop unit tests."""

from __future__ import annotations

import perception as P


def test_salience_budget_impatient_vs_patient():
    assert P.salience_budget(0.9) == 3
    assert P.salience_budget(0.2) == 6
    assert P.salience_budget(0.5) == 4
    assert P.salience_budget(0.9, detail_orientation=0.2) == 2
    assert P.salience_budget(0.2, detail_orientation=0.9) == 7


def test_extract_perception_block():
    thinking = (
        "Ich sehe graue Displays.\n"
        "<<PERCEPTION>>"
        '{"taskReminder":"Kompatible Displays finden",'
        '"noticed":[{"what":"Displays grau","where":"rechts","relevance":"high"}],'
        '"ignoredGuess":"Footer",'
        '"think":"Ohne Erklärung komme ich nicht weiter.",'
        '"clarity":0,'
        '"feel":{"label":"frustriert","valence":-2},'
        '"confusion":"disabled_option_unexplained",'
        '"stance":"abandon",'
        '"intent":"Ich breche ab und sage das ehrlich.",'
        '"why":"Grau ohne Grund."}'
        "<</PERCEPTION>>"
    )
    perc = P.extract_perception_from_thinking(thinking, budget=3)
    assert perc is not None
    assert perc["stance"] == "abandon"
    assert perc["noticed"][0]["what"].startswith("Displays")
    assert perc["feel"]["valence"] == -2
    vo = P.strip_perception_blocks(thinking)
    assert "PERCEPTION" not in vo
    assert "graue Displays" in vo


def test_legacy_think_aloud_maps():
    thinking = (
        "<<THINK_ALOUD>>"
        '{"seen":"Matrix grau","think":"Filter unklar warum.",'
        '"next":"Als Nächstes breche ich ab.",'
        '"why":"Zu unklar.",'
        '"feel":{"label":"unsicher","valence":-1}}'
        "<</THINK_ALOUD>>"
    )
    perc = P.extract_perception_from_thinking(thinking, budget=4)
    assert perc is not None
    assert perc.get("legacyThinkAloud") is True
    assert perc["noticed"]
    ta = P.perception_to_think_aloud(perc)
    assert "Matrix" in (ta.get("seen") or "")


def test_invalid_without_noticed():
    raw = {
        "taskReminder": "x",
        "noticed": [],
        "think": "kurz",
        "clarity": 2,
        "feel": {"label": "ok", "valence": 0},
        "stance": "proceed",
        "intent": "Ich klicke weiter auf etwas.",
        "why": "Weil.",
    }
    assert P.coerce_perception(raw, budget=3, require_strict=True) is None


def test_filter_abandon_forces_done_only():
    class A:
        def model_dump(self, exclude_none=True):
            return {"click": {"index": 1}}

    class D:
        def model_dump(self, exclude_none=True):
            return {"done": {"text": "bye"}}

    perc = {
        "stance": "abandon",
        "noticed": [{"what": "grau", "relevance": "high"}],
        "intent": "Ich breche ab.",
    }
    filtered, reason = P.filter_actions_for_stance([A(), D()], perc)
    assert reason == "abandon_done"
    assert len(filtered) == 1
    assert P.action_tool_name(filtered[0]) == "done"

    filtered2, reason2 = P.filter_actions_for_stance([A()], perc)
    assert reason2 == "abandon_force_done"
    assert filtered2 == []


def test_hesitate_blocks_click():
    class A:
        def model_dump(self, exclude_none=True):
            return {"click": {"index": 2}}

    class S:
        def model_dump(self, exclude_none=True):
            return {"scroll": {"down": True}}

    perc = {"stance": "hesitate", "noticed": [{"what": "Bereich", "relevance": "med"}]}
    filtered, reason = P.filter_actions_for_stance([A(), S()], perc)
    assert reason == "hesitate_filter"
    assert len(filtered) == 1
    assert P.action_tool_name(filtered[0]) == "scroll"


def test_intent_align_keeps_overlapping_click():
    class A:
        def model_dump(self, exclude_none=True):
            return {"click": {"text": "Performance Line Karte"}}

    perc = {
        "stance": "proceed",
        "intent": "Ich klicke auf Performance Line",
        "noticed": [{"what": "Performance Line", "relevance": "high"}],
        "think": "Drive Unit wählen",
    }
    kept, reason = P.filter_actions_intent_align([A()], perc)
    assert reason in ("align_ok", "align_filtered")
    assert len(kept) == 1


def test_felt_state_updates():
    state = P.new_felt_state()
    perc = {
        "clarity": 1,
        "feel": {"label": "unsicher", "valence": -1},
        "confusion": "filter_cause_unknown",
        "think": "Warum ist das grau?",
        "noticed": [{"what": "grau", "relevance": "high"}],
        "stance": "hesitate",
    }
    P.update_felt_state(state, perc)
    assert state["confusionCount"] == 1
    assert state["lastValence"] == -1
    assert "grau" in state["lastNoticedDigest"]
    block = P.felt_state_prompt_block(state)
    assert "AUDION_FELT_STATE" in block


def test_synthesize_summary():
    trail = [
        {
            "taskReminder": "Displays finden",
            "noticed": [{"what": "Karten grau"}],
            "stance": "abandon",
            "why": "Ich breche ab wegen unerklärter grauer Optionen.",
            "confusion": "disabled_option_unexplained",
        }
    ]
    summary = P.synthesize_summary_from_perceptions(trail)
    assert summary and "grau" in summary.lower()
