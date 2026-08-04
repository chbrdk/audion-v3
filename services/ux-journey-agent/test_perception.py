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


def test_impatient_abandon_upgrade_from_proceed():
    perc = {
        "taskReminder": "Displays finden",
        "noticed": [{"what": "Display-Karten grau", "relevance": "high"}],
        "think": "Filter-Ursache unklar warum die Optionen grau sind.",
        "clarity": 1,
        "feel": {"label": "unsicher", "valence": 0},
        "confusion": "filter_cause_unknown",
        "stance": "proceed",
        "intent": "Ich klicke auf Performance Line",
        "why": "Vielleicht hilft die Drive Unit.",
    }
    assert P.should_prefer_abandon(perc, 0.9) is True
    assert P.should_prefer_abandon(perc, 0.2) is False
    # Try budget already spent → hard upgrade
    out, upgraded = P.apply_impatient_abandon_stance(
        perc, 0.9, exploratory_attempts=1, try_before_abandon=1
    )
    assert upgraded is True
    assert out is not None
    assert out["stance"] == "abandon"
    assert out.get("stanceUpgraded") is True
    assert "abbrech" in (out.get("intent") or "").lower() or "sicher" in (out.get("intent") or "").lower()


def test_try_then_quit_softens_first_confused_step():
    perc = {
        "taskReminder": "Displays finden",
        "noticed": [{"what": "Display-Karten grau", "relevance": "high"}],
        "think": "Filter-Ursache unklar warum die Optionen grau sind.",
        "clarity": 1,
        "feel": {"label": "unsicher", "valence": 0},
        "confusion": "filter_cause_unknown",
        "stance": "abandon",
        "intent": "Ich breche ab und sage das ehrlich.",
        "why": "Grau ohne Erklärung.",
    }
    soft, upgraded = P.apply_impatient_abandon_stance(
        perc, 0.9, exploratory_attempts=0, try_before_abandon=1
    )
    assert upgraded is False
    assert soft is not None
    assert soft["stance"] in ("hesitate", "proceed")
    assert soft.get("stanceSoftened") is True
    assert soft.get("tryThenQuit") is True

    hard, upgraded2 = P.apply_impatient_abandon_stance(
        perc, 0.9, exploratory_attempts=1, try_before_abandon=1
    )
    assert upgraded2 is False  # already abandon
    assert hard is not None
    assert hard["stance"] == "abandon"


def test_try_before_abandon_satisficing_budget(monkeypatch):
    monkeypatch.delenv("UX_JOURNEY_TRY_BEFORE_ABANDON", raising=False)
    # Default impatient floor 3 → Alex ~4–6 steps; patient still higher.
    assert P.try_before_abandon_required(0.9) == 3
    assert P.try_before_abandon_required(0.5) == 4
    assert P.try_before_abandon_required(0.2) == 5
    assert P.try_before_abandon_required(0.9, exploration=0.8) == 4
    assert P.try_before_abandon_required(0.2) > P.try_before_abandon_required(0.9)
    monkeypatch.setenv("UX_JOURNEY_TRY_BEFORE_ABANDON", "0")
    assert P.try_before_abandon_required(0.9) == 0
    monkeypatch.setenv("UX_JOURNEY_TRY_BEFORE_ABANDON", "2")
    assert P.try_before_abandon_required(0.9) == 2
    assert P.try_before_abandon_required(0.2) == 4


def test_try_before_abandon_impatient_band_for_4_to_6_steps(monkeypatch):
    """Impatient try budget of 3 implies navigate + tries + done ≈ 4–6 steps."""
    monkeypatch.delenv("UX_JOURNEY_TRY_BEFORE_ABANDON", raising=False)
    impatient_tries = P.try_before_abandon_required(0.9)
    patient_tries = P.try_before_abandon_required(0.2)
    assert 3 <= impatient_tries <= 4
    # Rough step band: 1 navigate + tries + 1 done
    alex_steps_est = 1 + impatient_tries + 1
    assert 4 <= alex_steps_est <= 6
    assert patient_tries > impatient_tries
    sam_steps_est = 1 + patient_tries + 1
    assert sam_steps_est > alex_steps_est


def test_felt_state_counts_exploratory_and_persist_low_clarity():
    state = P.new_felt_state()
    p1 = {
        "noticed": [{"what": "grau", "relevance": "high"}],
        "clarity": 1,
        "feel": {"label": "unsicher", "valence": -1},
        "confusion": "filter_cause_unknown",
        "stance": "hesitate",
        "stanceSoftened": True,
        "think": "Erstmal scrollen.",
        "intent": "Ich prüfe noch kurz.",
        "why": "Erste Verwirrung.",
    }
    P.update_felt_state(state, p1)
    assert state["exploratoryAttempts"] == 1
    assert state["tryThenQuitSoftens"] == 1
    assert state["confusionCount"] == 1
    assert state["lowClarityStreak"] == 1

    p2 = {
        "noticed": [{"what": "Filter unklar", "relevance": "high"}],
        "clarity": 0,
        "feel": {"label": "frustriert", "valence": -2},
        "confusion": "disabled_option_unexplained",
        "stance": "proceed",
        "think": "Immer noch unklar.",
        "intent": "Ich klicke einmal probehalber.",
        "why": "Noch ein Versuch.",
    }
    P.update_felt_state(state, p2)
    assert state["exploratoryAttempts"] == 2
    assert state["lowClarityStreak"] == 2
    assert P.clarity_persistently_low(state["clarityTrend"], min_steps=2) is True

    # After try budget: persistent low clarity + confusion → abandon
    hard, upgraded = P.apply_impatient_abandon_stance(
        p2,
        0.9,
        felt_confusion_count=state["confusionCount"],
        exploratory_attempts=state["exploratoryAttempts"],
        try_before_abandon=1,
        clarity_trend=state["clarityTrend"],
    )
    assert upgraded is True
    assert hard["stance"] == "abandon"


def test_enrich_noticed_from_think_fills_budget():
    perc = {
        "taskReminder": "Kompatible Displays für Performance Line finden",
        "noticed": [{"what": "Display-Karten grau", "relevance": "high"}],
        "think": "Filter unklar warum grau; Performance Line noch nicht gewählt.",
        "clarity": 1,
        "feel": {"label": "frustriert", "valence": -2},
        "confusion": "disabled_option_unexplained",
        "stance": "proceed",
        "intent": "Ich will weiterklicken.",
        "why": "Ohne Erklärung komme ich nicht weiter.",
    }
    finalized, upgraded = P.finalize_perception_for_persona(
        perc,
        budget=3,
        time_pressure=0.9,
        exploratory_attempts=1,
        try_before_abandon=1,
    )
    assert finalized is not None
    assert upgraded is True
    assert finalized["stance"] == "abandon"
    assert len(finalized["noticed"]) >= 2
    overlap = P.perception_noticed_overlap(
        finalized["noticed"],
        ["grau", "Displays", "Filter", "Performance Line", "unklar warum"],
    )
    assert overlap["hits"] >= 3
    assert overlap["score"] >= 0.5


def test_patient_does_not_force_abandon():
    perc = {
        "noticed": [{"what": "Display-Karten grau", "relevance": "high"}],
        "think": "Filter unklar warum.",
        "clarity": 1,
        "feel": {"label": "nachdenklich", "valence": -1},
        "confusion": "filter_cause_unknown",
        "stance": "hesitate",
        "intent": "Ich scrolle und prüfe noch.",
        "why": "Vielleicht steht die Erklärung weiter unten.",
    }
    out, upgraded = P.apply_impatient_abandon_stance(perc, 0.2)
    assert upgraded is False
    assert out["stance"] == "hesitate"


def test_clear_decision_actions_strips_done_without_perception():
    class D:
        def model_dump(self, exclude_none=True):
            return {"done": {"text": "bye"}}

    class C:
        def model_dump(self, exclude_none=True):
            return {"click": {"index": 1}}

    class S:
        def model_dump(self, exclude_none=True):
            return {"scroll": {"down": True}}

    assert P.actions_need_perception([D()]) is True
    assert P.actions_need_perception([S()]) is False
    cleared, reason = P.clear_decision_actions([D(), C()])
    assert cleared == []
    assert reason == "no_perc_cleared"
    soft, reason2 = P.clear_decision_actions([D(), S()])
    assert len(soft) == 1
    assert P.action_tool_name(soft[0]) == "scroll"
    assert reason2 == "no_perc_soft_only"


def test_nudge_forbids_done_without_block():
    msg = P.perception_nudge_message(3)
    assert "VERBOTEN" in msg
    assert "done" in msg.lower()
    assert "Filter" in msg or "unklar" in msg
    assert P.perception_missing_retries() == 2


def test_try_then_quit_blocks_force_done_flag():
    soft, _ = P.apply_impatient_abandon_stance(
        {
            "noticed": [{"what": "grau", "relevance": "high"}],
            "think": "Filter unklar warum.",
            "clarity": 0,
            "feel": {"label": "frustriert", "valence": -2},
            "confusion": "disabled_option_unexplained",
            "stance": "abandon",
            "intent": "Ich breche ab und sage das ehrlich.",
            "why": "Grau ohne Erklärung.",
        },
        0.9,
        exploratory_attempts=0,
        try_before_abandon=1,
    )
    assert soft is not None
    assert P.try_then_quit_blocks_force_done(soft) is True
    hard, _ = P.apply_impatient_abandon_stance(
        soft, 0.9, exploratory_attempts=1, try_before_abandon=1
    )
    assert hard is not None
    assert hard["stance"] == "abandon"
    assert P.try_then_quit_blocks_force_done(hard) is False


def test_prompt_forbids_done_without_perception():
    block = P.perception_prompt_extension(time_pressure=0.9)
    assert "VERBOTEN" in block
    assert "unklar warum" in block
    assert "Filter" in block
    assert "Try-then-quit" in block or "try-then-quit" in block.lower()


def test_enrich_at_full_budget_promotes_filter_and_cause():
    """Budget full of verbose notices — still lift Filter / unklar warum from think."""
    perc = {
        "taskReminder": "Displays finden",
        "noticed": [
            {"what": "Auswahl-Tool Finde deine Produktkombination sichtbar", "relevance": "high"},
            {"what": "Performance Line Karte listet Drive Unit", "relevance": "high"},
            {"what": "Displays Bereich mit greyed disabled Optik", "relevance": "med"},
        ],
        "think": "Kompatibilitätsfilter freischaltet nichts; ohne erkennbare Ursache unklar warum grau.",
        "clarity": 0,
        "feel": {"label": "frustriert", "valence": -2},
        "confusion": "disabled_option_unexplained",
        "stance": "abandon",
        "intent": "Ich breche ab.",
        "why": "Ohne Erklärung der Filter-Ursache keine sichere Antwort.",
    }
    out = P.enrich_noticed_from_perception_text(perc, budget=3)
    assert out is not None
    assert len(out["noticed"]) == 3
    blob = " ".join(n["what"] for n in out["noticed"]).lower()
    assert "filter" in blob
    assert "unklar" in blob
    overlap = P.perception_noticed_overlap(
        out["noticed"],
        ["grau", "Displays", "Filter", "Performance Line", "unklar warum"],
    )
    assert overlap["hits"] >= 4
    assert overlap["score"] >= 0.8
