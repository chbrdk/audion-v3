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


def test_prefer_targeted_actions_nav_h3_prefers_produktkombinationen():
    actions = [
        {"click": {"text": "Service & Beratung"}},
        {"click": {"text": "Produktkombinationen"}},
        {"done": {"text": "Ich bin fertig"}},
    ]
    kept, reason = P.prefer_targeted_actions(
        actions,
        task=(
            "Starte auf der Bosch eBike Startseite (nicht direkt im Tool). "
            "Finde den Weg zum Produktkombinationen-Tool (Service/Produktkombinationen)."
        ),
        current_url="https://www.bosch-ebike.com/de/service/",
    )
    assert reason == "path_target_visible"
    assert len(kept) == 1
    assert "produktkombination" in P.action_text_blob(kept[0])


def test_prefer_targeted_actions_nav_h3_avoids_home_loop_click_after_try():
    actions = [
        {"click": {"text": "Service & Beratung", "target": "/de/"}},
        {"scroll": {"down": True}},
        {"done": {"text": "Ich bin fertig"}},
    ]
    kept, reason = P.prefer_targeted_actions(
        actions,
        task=(
            "Starte auf der Bosch eBike Startseite (nicht direkt im Tool). "
            "Finde den Weg zum Produktkombinationen-Tool (Service/Produktkombinationen)."
        ),
        current_url="https://www.bosch-ebike.com/de/",
        exploratory_attempts=1,
    )
    assert reason == "path_avoid_home_loop"
    assert len(kept) == 1
    assert P.action_tool_name(kept[0]) == "scroll"


def test_prefer_targeted_actions_nav_h3_prefers_hover_menu_when_available():
    actions = [
        {"hover": {"text": "Service & Beratung"}},
        {"click": {"text": "Service & Beratung", "target": "/de/"}},
        {"scroll": {"down": True}},
    ]
    kept, reason = P.prefer_targeted_actions(
        actions,
        task=(
            "Starte auf der Bosch eBike Startseite (nicht direkt im Tool). "
            "Finde den Weg zum Produktkombinationen-Tool (Service/Produktkombinationen)."
        ),
        current_url="https://www.bosch-ebike.com/de/",
    )
    assert reason == "path_open_hover"
    assert len(kept) == 1
    assert P.action_tool_name(kept[0]) == "hover"


def test_select_nav_dom_action_prefers_visible_produktkombinationen_index():
    summary = {
        "dom_state": {
            "selector_map": {
                7: {
                    "is_visible": True,
                    "attributes": {"href": "/de/service/produktkombinationen"},
                    "ax_node": {"name": "Produktkombinationen", "role": "link"},
                },
                3: {
                    "is_visible": True,
                    "attributes": {"href": "/de/"},
                    "ax_node": {"name": "Service & Beratung", "role": "link"},
                },
            }
        }
    }
    action, reason = P.select_nav_dom_action(
        summary,
        current_url="https://www.bosch-ebike.com/de/",
        task=(
            "Starte auf der Bosch eBike Startseite (nicht direkt im Tool). "
            "Finde den Weg zum Produktkombinationen-Tool (Service/Produktkombinationen)."
        ),
        exploratory_attempts=1,
        menu_hover_used=True,
    )
    assert reason == "nav_dom_product_index"
    assert action == {"tool": "click", "index": 7}


def test_select_nav_dom_action_falls_back_to_service_click_on_home():
    summary = {
        "dom_state": {
            "selector_map": {
                3: {
                    "is_visible": True,
                    "bounds": {"x": 500, "y": 40, "width": 160, "height": 40},
                    "attributes": {"href": "/de/service/", "aria-expanded": "false"},
                    "ax_node": {"name": "Service & Beratung", "role": "link"},
                }
            }
        }
    }
    action, reason = P.select_nav_dom_action(
        summary,
        current_url="https://www.bosch-ebike.com/de/",
        task=(
            "Starte auf der Bosch eBike Startseite (nicht direkt im Tool). "
            "Finde den Weg zum Produktkombinationen-Tool (Service/Produktkombinationen)."
        ),
        menu_hover_used=True,
        target_click_used=True,
    )
    assert reason == "nav_dom_service_click"
    assert action == {"tool": "click", "index": 3}


def test_select_nav_dom_action_uses_coordinate_click_for_aggregated_nav():
    summary = {
        "dom_state": {
            "selector_map": {
                361: {
                    "is_visible": True,
                    "bounds": {"x": 100, "y": 50, "width": 1200, "height": 50},
                    "attributes": {"href": "/de/"},
                    "ax_node": {
                        "name": "Produkte eBikes Service & Beratung Magazin Über uns Business",
                        "role": "link",
                    },
                }
            }
        }
    }
    action, reason = P.select_nav_dom_action(
        summary,
        current_url="https://www.bosch-ebike.com/de/",
        task=(
            "Starte auf der Bosch eBike Startseite (nicht direkt im Tool). "
            "Finde den Weg zum Produktkombinationen-Tool (Service/Produktkombinationen)."
        ),
        menu_hover_used=True,
        target_click_used=True,
    )
    assert reason == "nav_dom_service_click"
    assert action is not None
    assert action["tool"] == "evaluate"
    assert "service" in action["code"].lower()


def test_select_nav_dom_action_prefers_top_nav_over_midpage_blob():
    summary = {
        "dom_state": {
            "selector_map": {
                10: {
                    "is_visible": True,
                    "bounds": {"x": 0, "y": 280, "width": 1400, "height": 400},
                    "attributes": {"href": "/de/"},
                    "ax_node": {
                        "name": (
                            "Footer Produkte eBikes Service Beratung Magazin Business "
                            "Apps & Services Support"
                        ),
                        "role": "link",
                    },
                },
                361: {
                    "is_visible": True,
                    "bounds": {"x": 100, "y": 50, "width": 1200, "height": 50},
                    "attributes": {"href": "/de/"},
                    "ax_node": {
                        "name": "Produkte eBikes Service & Beratung Magazin Über uns Business",
                        "role": "link",
                    },
                },
            }
        }
    }
    action, reason = P.select_nav_dom_action(
        summary,
        current_url="https://www.bosch-ebike.com/de/",
        task=(
            "Starte auf der Bosch eBike Startseite (nicht direkt im Tool). "
            "Finde den Weg zum Produktkombinationen-Tool (Service/Produktkombinationen)."
        ),
        menu_hover_used=True,
        target_click_used=True,
    )
    assert reason == "nav_dom_service_click"
    assert action is not None
    assert action["tool"] == "evaluate"


def test_select_nav_dom_action_rejects_tall_page_wrapper_coords():
    summary = {
        "dom_state": {
            "selector_map": {
                99: {
                    "is_visible": True,
                    # Tall wrapper: by=0 passes a naive top filter but centers at y=321.
                    "bounds": {"x": 0, "y": 0, "width": 1400, "height": 642},
                    "attributes": {"href": "/de/"},
                    "ax_node": {
                        "name": "Produkte eBikes Service & Beratung Magazin Über uns Business",
                        "role": "link",
                    },
                },
                42: {
                    "is_visible": True,
                    "attributes": {"href": "/de/service/"},
                    "ax_node": {"name": "Service & Beratung", "role": "link"},
                },
            }
        }
    }
    action, reason = P.select_nav_dom_action(
        summary,
        current_url="https://www.bosch-ebike.com/de/",
        task=(
            "Starte auf der Bosch eBike Startseite (nicht direkt im Tool). "
            "Finde den Weg zum Produktkombinationen-Tool (Service/Produktkombinationen)."
        ),
        menu_hover_used=True,
        target_click_used=True,
    )
    assert reason == "nav_dom_service_click"
    assert action == {"tool": "click", "index": 42}


def test_select_nav_dom_action_synthesizes_top_strip_for_tall_menu_wrapper():
    summary = {
        "dom_state": {
            "selector_map": {
                99: {
                    "is_visible": True,
                    "bounds": {"x": 0, "y": 0, "width": 1400, "height": 642},
                    "attributes": {"href": "/de/"},
                    "ax_node": {
                        "name": "Produkte eBikes Service & Beratung Magazin Über uns Business",
                        "role": "link",
                    },
                }
            }
        }
    }
    action, reason = P.select_nav_dom_action(
        summary,
        current_url="https://www.bosch-ebike.com/de/",
        task=(
            "Starte auf der Bosch eBike Startseite (nicht direkt im Tool). "
            "Finde den Weg zum Produktkombinationen-Tool (Service/Produktkombinationen)."
        ),
        menu_hover_used=True,
        target_click_used=True,
    )
    assert reason == "nav_dom_service_click"
    assert action is not None
    assert action["tool"] == "evaluate"


def test_select_nav_dom_action_falls_back_to_short_label_when_only_midpage_bounds():
    summary = {
        "dom_state": {
            "selector_map": {
                10: {
                    "is_visible": True,
                    "bounds": {"x": 0, "y": 280, "width": 1400, "height": 400},
                    "attributes": {"href": "/de/"},
                    "ax_node": {
                        "name": "Footer Produkte eBikes Service Beratung Magazin",
                        "role": "link",
                    },
                },
                42: {
                    "is_visible": True,
                    "attributes": {"href": "/de/service/"},
                    "ax_node": {"name": "Service & Beratung", "role": "link"},
                },
            }
        }
    }
    action, reason = P.select_nav_dom_action(
        summary,
        current_url="https://www.bosch-ebike.com/de/",
        task=(
            "Starte auf der Bosch eBike Startseite (nicht direkt im Tool). "
            "Finde den Weg zum Produktkombinationen-Tool (Service/Produktkombinationen)."
        ),
        menu_hover_used=True,
        target_click_used=True,
    )
    # Mid-page geometry is filtered; short label without bounds wins via text fallback.
    # Href-only discrete path also wins when present without bounds.
    assert reason == "nav_dom_service_click"
    assert action == {"tool": "click", "index": 42}


def test_select_nav_dom_action_prefers_discrete_service_over_coordinate():
    summary = {
        "dom_state": {
            "selector_map": {
                361: {
                    "is_visible": True,
                    "bounds": {"x": 100, "y": 50, "width": 1200, "height": 50},
                    "attributes": {"href": "/de/"},
                    "ax_node": {
                        "name": "Produkte eBikes Service & Beratung Magazin Über uns Business",
                        "role": "link",
                    },
                },
                3: {
                    "is_visible": True,
                    "bounds": {"x": 500, "y": 40, "width": 160, "height": 40},
                    "attributes": {"href": "/de/service/", "aria-expanded": "false"},
                    "ax_node": {"name": "Service & Beratung", "role": "link"},
                },
            }
        }
    }
    action, reason = P.select_nav_dom_action(
        summary,
        current_url="https://www.bosch-ebike.com/de/",
        task=(
            "Starte auf der Bosch eBike Startseite (nicht direkt im Tool). "
            "Finde den Weg zum Produktkombinationen-Tool (Service/Produktkombinationen)."
        ),
        menu_hover_used=True,
        target_click_used=True,
    )
    assert reason == "nav_dom_service_click"
    assert action == {"tool": "click", "index": 3}


def test_select_cookie_banner_action_prefers_exact_reject_button():
    summary = {
        "dom_state": {
            "selector_map": {
                3647: {
                    "is_visible": True,
                    "attributes": {"aria-label": "Alles ablehnen"},
                    "ax_node": {"name": "Alles ablehnen", "role": "button"},
                },
                830: {
                    "is_visible": True,
                    "attributes": {"href": "/de/connected-biking"},
                    "ax_node": {"name": "Apps & Services", "role": "link"},
                },
            }
        }
    }
    action, reason = P.select_cookie_banner_action(
        summary,
        current_url="https://www.bosch-ebike.com/de/",
        perception={"noticed": [{"what": "Cookie-Banner", "relevance": "high"}]},
    )
    assert reason == "cookie_dom_reject"
    assert action == {"tool": "click", "index": 3647}


def test_select_cookie_banner_action_returns_none_without_banner_signal():
    summary = {
        "dom_state": {
            "selector_map": {
                830: {
                    "is_visible": True,
                    "attributes": {"href": "/de/connected-biking"},
                    "ax_node": {"name": "Apps & Services", "role": "link"},
                }
            }
        }
    }
    action, reason = P.select_cookie_banner_action(
        summary,
        current_url="https://www.bosch-ebike.com/de/",
        perception={"noticed": [{"what": "Service Navigation", "relevance": "high"}]},
    )
    assert reason == "cookie_dom_none"
    assert action is None


def test_prefer_targeted_actions_cookie_prefers_reject_click():
    actions = [
        {"click": {"text": "Alles ablehnen"}},
        {"scroll": {"down": True}},
        {"done": {"text": "Ich breche ab"}},
    ]
    kept, reason = P.prefer_targeted_actions(
        actions,
        current_url="https://www.bosch-ebike.com/de/service/produktkombinationen",
        perception={
            "stance": "proceed",
            "intent": "Ich schließe zuerst das Cookie-Banner.",
            "think": "Das Banner blockiert die Auswahl.",
            "noticed": [{"what": "Cookie-Banner mit Alles ablehnen", "relevance": "high"}],
        },
    )
    assert reason == "cookie_reject"
    assert len(kept) == 1
    assert "ablehnen" in P.action_text_blob(kept[0])


def test_targeted_continue_nudge_mentions_cookie_reject():
    msg = P.targeted_continue_nudge(
        task="Aufgabe 2 Kombination prüfen",
        current_url="https://www.bosch-ebike.com/de/service/produktkombinationen",
        perception={
            "stance": "proceed",
            "intent": "Ich klicke auf Alles ablehnen.",
            "think": "Cookie-Banner blockiert das Tool.",
            "noticed": [{"what": "Cookie-Banner", "relevance": "high"}],
        },
        actions=[{"click": {"text": "Alles ablehnen"}}, {"done": {"text": "Stop"}}],
        min_steps=6,
    )
    assert "alles ablehnen" in msg.lower()
    assert "done ist bis mindestens schritt 6 verboten" in msg.lower()


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
    assert "abbrech" in (out.get("intent") or "").lower() or "breche ab" in (out.get("intent") or "").lower()


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
    # Default impatient floor 4 → Alex ~5–7 steps; patient still higher.
    assert P.try_before_abandon_required(0.9) == 4
    assert P.try_before_abandon_required(0.5) == 5
    assert P.try_before_abandon_required(0.2) == 6
    assert P.try_before_abandon_required(0.9, exploration=0.8) == 5
    assert P.try_before_abandon_required(0.2) > P.try_before_abandon_required(0.9)
    monkeypatch.setenv("UX_JOURNEY_TRY_BEFORE_ABANDON", "0")
    assert P.try_before_abandon_required(0.9) == 0
    monkeypatch.setenv("UX_JOURNEY_TRY_BEFORE_ABANDON", "2")
    assert P.try_before_abandon_required(0.9) == 2
    assert P.try_before_abandon_required(0.2) == 4


def test_try_before_abandon_impatient_band_for_fighting_third(monkeypatch):
    """Impatient try budget of 4 implies navigate + tries + done ≈ 5–7 steps."""
    monkeypatch.delenv("UX_JOURNEY_TRY_BEFORE_ABANDON", raising=False)
    impatient_tries = P.try_before_abandon_required(0.9)
    patient_tries = P.try_before_abandon_required(0.2)
    assert 4 <= impatient_tries <= 5
    # Rough step band: 1 navigate + tries + 1 done
    alex_steps_est = 1 + impatient_tries + 1
    assert 5 <= alex_steps_est <= 7
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


def test_browse_find_classifier_and_keywords():
    task = "Bitte gucke auf der Seite und suche nach einer Grillplatte."
    assert P.is_browse_find_task(task) is True
    keys = P.browse_find_target_keywords(task)
    assert "grillplatte" in keys


def test_browse_explore_blocks_abandon_until_scrolls(monkeypatch):
    monkeypatch.setenv("UX_JOURNEY_BROWSE_MIN_SCROLLS", "2")
    task = "Suche nach einer Grillplatte auf der Startseite."
    perc = {
        "noticed": [{"what": "Hero Banner", "relevance": "high"}],
        "think": "Oben sehe ich keine Grillplatte.",
        "clarity": 1,
        "feel": {"label": "ungeduldig", "valence": -1},
        "confusion": None,
        "stance": "abandon",
        "intent": "Ich gebe auf.",
        "why": "Nicht gefunden.",
    }
    soft, blocked = P.apply_browse_explore_before_abandon(
        perc, task=task, scroll_attempts=0, current_url="https://shop.example/"
    )
    assert blocked is True
    assert soft is not None
    assert soft["stance"] == "hesitate"
    assert soft.get("browseExploreRequired") is True
    assert "scroll" in soft["intent"].lower() or "scrolle" in soft["intent"].lower()
    assert P.try_then_quit_blocks_force_done(soft) is True

    done, blocked2 = P.apply_browse_explore_before_abandon(
        {**perc, "stance": "abandon"},
        task=task,
        scroll_attempts=2,
        current_url="https://shop.example/",
    )
    assert blocked2 is False
    assert done is not None
    assert done["stance"] == "abandon"


def test_browse_explore_allows_abandon_when_target_noticed(monkeypatch):
    monkeypatch.setenv("UX_JOURNEY_BROWSE_MIN_SCROLLS", "2")
    task = "Suche nach einer Grillplatte."
    perc = {
        "noticed": [{"what": "Grillplatte Kategorie", "relevance": "high"}],
        "think": "Da ist die Grillplatte.",
        "clarity": 2,
        "stance": "abandon",
        "intent": "Fertig.",
        "why": "Gefunden.",
    }
    out, blocked = P.apply_browse_explore_before_abandon(
        perc, task=task, scroll_attempts=0, current_url="https://shop.example/"
    )
    assert blocked is False
    assert out is not None
    assert out["stance"] == "abandon"


def test_browse_explore_skips_lab_b_destination(monkeypatch):
    monkeypatch.setenv("UX_JOURNEY_BROWSE_MIN_SCROLLS", "2")
    task = (
        "Lab-Persona: Du bist ungeduldig.\n"
        "Finde kompatible Displays; brich nach höchstens zwei Momenten ab."
    )
    perc = {
        "noticed": [{"what": "grau Displays", "relevance": "high"}],
        "think": "unklar warum",
        "clarity": 0,
        "confusion": "disabled_option_unexplained",
        "stance": "abandon",
        "intent": "Ich breche ab.",
        "why": "Grau.",
    }
    out, blocked = P.apply_browse_explore_before_abandon(
        perc,
        task=task,
        scroll_attempts=0,
        current_url="https://example.com/produktkombinationen",
    )
    assert blocked is False
    assert out is not None
    assert out["stance"] == "abandon"


def test_finalize_browse_explore_after_impatient(monkeypatch):
    monkeypatch.setenv("UX_JOURNEY_BROWSE_MIN_SCROLLS", "2")
    task = "Gucke auf der Website und suche nach einer Grillplatte."
    perc = {
        "taskReminder": "Grillplatte finden",
        "noticed": [{"what": "Header", "relevance": "high"}],
        "think": "Nichts oben.",
        "clarity": 1,
        "feel": {"label": "ungeduldig", "valence": -1},
        "confusion": None,
        "stance": "abandon",
        "intent": "Aufgeben.",
        "why": "Nicht da.",
    }
    out, upgraded = P.finalize_perception_for_persona(
        perc,
        budget=4,
        time_pressure=0.9,
        exploratory_attempts=0,
        try_before_abandon=4,
        task=task,
        current_url="https://www.moebel-martin.de/",
        browse_scroll_attempts=0,
    )
    assert upgraded is False
    assert out is not None
    assert out.get("browseExploreRequired") is True
    assert out["stance"] == "hesitate"
    assert out.get("browseExploreAllowCategoryClick") is True
    assert "garten" in [h.lower() for h in (out.get("browseCategoryHints") or [])]


def test_browse_category_hints_grill_and_pizza():
    hints = P.browse_category_hints("suche nach Grillplatte")
    assert "garten" in hints
    hints2 = P.browse_category_hints("finde einen Pizzastein")
    assert "garten" in hints2 or "outdoor" in hints2


def test_block_early_site_search_until_scrolls(monkeypatch):
    monkeypatch.setenv("UX_JOURNEY_BROWSE_MIN_SCROLLS", "2")
    task = "suche nach Grillplatte"
    perc = {
        "noticed": [{"what": "Suchfeld", "relevance": "high"}],
        "stance": "proceed",
        "intent": "Ich tippe Grillplatte in die Suche.",
        "think": "Suche ist schnell.",
        "why": "Shortcut.",
        "clarity": 2,
        "feel": {"label": "neutral", "valence": 0},
    }
    actions = [{"input": {"text": "Grillplatte", "index": 3}}]
    kept, reason = P.filter_actions_block_early_site_search(
        actions,
        perc,
        task=task,
        scroll_attempts=0,
        category_nav_attempts=0,
        current_url="https://www.moebel-martin.de/",
    )
    assert kept == []
    assert reason.startswith("browse_block_site_search")

    kept2, reason2 = P.filter_actions_block_early_site_search(
        actions,
        perc,
        task=task,
        scroll_attempts=2,
        category_nav_attempts=0,
        current_url="https://www.moebel-martin.de/",
    )
    assert kept2 == actions
    assert reason2 == "search_unlocked"


def test_hesitate_allows_category_click_during_browse_explore():
    task = "suche nach Grillplatte"
    perc = {
        "stance": "hesitate",
        "browseExploreRequired": True,
        "browseExploreAllowCategoryClick": True,
        "browseCategoryHints": ["garten", "outdoor"],
        "noticed": [{"what": "Garten Kategorie", "where": "Nav", "relevance": "high"}],
        "intent": "Ich klicke Garten.",
        "think": "Grillzeug liegt im Garten.",
        "why": "Kategorie zuerst.",
        "clarity": 1,
        "feel": {"label": "neutral", "valence": 0},
    }
    actions = [
        {"input": {"text": "Grillplatte"}},
        {"click": {"element": "Garten", "index": 12}},
        {"scroll": {"down": True}},
    ]
    kept, reason = P.filter_actions_for_stance(actions, perc, task=task)
    names = [P.action_tool_name(a) for a in kept]
    assert "scroll" in names
    assert "click" in names
    assert "input" not in names
    assert reason == "hesitate_filter"

    kept2, _ = P.filter_actions_block_early_site_search(
        kept,
        perc,
        task=task,
        scroll_attempts=0,
        category_nav_attempts=0,
        current_url="https://shop.example/",
    )
    assert any(P.action_tool_name(a) == "click" for a in kept2)


def test_dwell_seconds_by_persona():
    assert P.dwell_seconds_for_persona(0.9) <= 2
    assert P.dwell_seconds_for_persona(0.2) >= 3
    assert 2 <= P.dwell_seconds_for_persona(0.5) <= 4


def test_look_before_act_softens_and_strips_clicks(monkeypatch):
    monkeypatch.setenv("UX_JOURNEY_LOOK_BEFORE_ACT", "1")
    perc = {
        "noticed": [{"what": "Hero", "relevance": "high"}],
        "stance": "proceed",
        "intent": "Ich klicke gleich die Suche.",
        "think": "Schnell finden.",
        "why": "Shortcut.",
        "clarity": 2,
        "feel": {"label": "neutral", "valence": 0},
    }
    out, soft = P.apply_look_before_act(perc, pending=True, time_pressure=0.5)
    assert soft is True
    assert out is not None
    assert out["stance"] == "hesitate"
    assert out.get("lookBeforeActRequired") is True
    assert isinstance(out.get("dwellSeconds"), int)

    actions = [
        {"click": {"index": 3, "element": "Suche"}},
        {"wait": {"seconds": 2}},
        {"click": {"index": 9, "element": "Alles ablehnen Cookie"}},
    ]
    kept, reason = P.filter_actions_look_before_act(actions, out)
    names = [P.action_tool_name(a) for a in kept]
    assert "wait" in names
    assert "click" in names  # cookie
    assert names.count("click") == 1
    assert reason == "look_before_act"
    deep_only = [{"click": {"index": 1, "element": "Produkt"}}, {"input": {"text": "x"}}]
    empty, reason2 = P.filter_actions_look_before_act(deep_only, out)
    assert empty == []
    assert reason2 == "look_before_act_empty"


def test_look_before_act_url_arms_and_satisfies(monkeypatch):
    monkeypatch.setenv("UX_JOURNEY_LOOK_BEFORE_ACT", "1")
    state = P.new_felt_state()
    assert P.look_before_act_pending(state) is True
    P.note_look_before_act_url(state, "https://shop.example/")
    assert state["lookBeforeActPending"] is True
    # cookie-only does not satisfy
    assert (
        P.note_look_before_act_satisfied(
            state, [{"click": {"element": "Alles ablehnen Cookie"}}]
        )
        is False
    )
    assert P.look_before_act_pending(state) is True
    assert P.note_look_before_act_satisfied(state, [{"wait": {"seconds": 3}}]) is True
    assert P.look_before_act_pending(state) is False
    # new URL re-arms
    P.note_look_before_act_url(state, "https://shop.example/garten")
    assert P.look_before_act_pending(state) is True


def test_finalize_look_before_act_on_land(monkeypatch):
    monkeypatch.setenv("UX_JOURNEY_LOOK_BEFORE_ACT", "1")
    perc = {
        "noticed": [{"what": "Header", "relevance": "high"}],
        "think": "Ich öffne die Seite.",
        "clarity": 2,
        "feel": {"label": "neutral", "valence": 0},
        "stance": "proceed",
        "intent": "Ich klicke Menü.",
        "why": "Weiter.",
    }
    out, upgraded = P.finalize_perception_for_persona(
        perc,
        budget=4,
        time_pressure=0.5,
        task="Inspect https://shop.example/",
        current_url="https://shop.example/",
        look_before_act_pending=True,
    )
    assert upgraded is False
    assert out is not None
    assert out.get("lookBeforeActRequired") is True
    assert out["stance"] == "hesitate"


def test_prompt_forbids_done_without_perception():
    block = P.perception_prompt_extension(time_pressure=0.9)
    assert "VERBOTEN" in block
    assert "unklar warum" in block
    assert "Filter" in block
    assert "Try-then-quit" in block or "try-then-quit" in block.lower()
    assert "BROWSE/FIND" in block or "scrollen" in block.lower()
    assert "VISION GROUND TRUTH" in block
    assert "Mega-Menu" in block or "Mega-menu" in block or "Screenshot" in block


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


def test_lab_b_gold_context_allowed_scopes_nav_home_vs_tool_url():
    nav_task = (
        "Starte auf der Bosch eBike Startseite (nicht direkt im Tool). "
        "Finde den Weg zum Produktkombinationen-Tool (Service/Produktkombinationen)."
    )
    assert P.lab_b_gold_context_allowed("https://www.bosch-ebike.com/de/", nav_task) is False
    assert (
        P.lab_b_gold_context_allowed(
            "https://www.bosch-ebike.com/de/produktkombinationen",
            nav_task,
        )
        is True
    )

    lab_b_matrix_task = (
        "Lab-Persona: Du bist ungeduldig (Patient niedrig, time_pressure hoch). "
        "Wenn Optionen ausgeblendet/grau sind und du nicht verstehst warum: "
        "benenne das sofort und brich nach höchstens zwei solchen Momenten ab."
    )
    # Even when URL doesn't match, Lab B matrix task must allow gold cues.
    assert P.lab_b_gold_context_allowed("https://www.bosch-ebike.com/de/", lab_b_matrix_task) is True


def test_scope_nav_home_perception_rewrites_tool_bias_on_home():
    nav_task = (
        "Starte auf der Bosch eBike Startseite (nicht direkt im Tool). "
        "Finde den Weg zum Produktkombinationen-Tool (Service/Produktkombinationen)."
    )
    perc = {
        "taskReminder": "Ich will kompatible Displays finden",
        "noticed": [
            {"what": "Filter/Ursache prüfen", "where": "Tool", "relevance": "high"},
            {
                "what": "Filter-Ursache unklar warum",
                "where": "Kompatibilitätswahl",
                "relevance": "high",
            },
        ],
        "think": "Ohne Erklärung zur Ursache bleibe ich unsicher.",
        "clarity": 1,
        "feel": {"label": "angespannt", "valence": -1},
        "confusion": "filter_cause_unknown",
        "stance": "proceed",
        "intent": "Ich erkunde einmal kurz weiter.",
        "why": "Filter-Ursache unklar — ein kurzer Versuch ist noch sinnvoll.",
    }
    out = P.scope_nav_home_perception(
        perc,
        current_url="https://www.bosch-ebike.com/de/",
        task=nav_task,
        budget=3,
    )
    assert out is not None
    assert out["taskReminder"] == "Ich suche den Weg zu produktkombination."
    assert out["confusion"] is None
    joined = " ".join(n.get("what") for n in out["noticed"] if isinstance(n, dict)).lower()
    assert "startseite" in joined
    assert "filter" not in joined
    assert "bosch" not in joined
    assert "Navigation" in (out.get("think") or "")
    assert P.looks_like_research_script(out.get("think")) is False


def test_anchor_task_to_perception_injects_browse_goal():
    task = (
        "Starte auf https://www.moebel-martin.de/. "
        "Aufgabe: suche nach Grillplatte. Verfolge diese Aufgabe in jedem Schritt."
    )
    perc = {
        "noticed": [{"what": "Hero mit Kategorien", "where": "oben", "relevance": "high"}],
        "think": "Ich öffne https://www.moebel-martin.de/.",
        "intent": "Initial navigation",
        "why": "Start",
        "stance": "proceed",
        "clarity": 1,
        "feel": {"label": "neutral", "valence": 0},
    }
    out = P.anchor_task_to_perception(
        perc,
        task=task,
        lab_b_gold_context_allowed=False,
    )
    assert out is not None
    assert "grillplatte" in (out.get("taskReminder") or "").lower()
    assert "grillplatte" in (out.get("think") or "").lower()
    assert "grillplatte" in (out.get("intent") or "").lower()
    assert "initial navigation" not in (out.get("intent") or "").lower()


def test_humanize_perception_voice_rewrites_research_script():
    task = "Suche nach einer Grillplatte auf moebel-martin.de"
    perc = {
        "noticed": [
            {"what": "Hero mit Kategorien", "where": "oben", "relevance": "high"},
        ],
        "think": "Ohne Erklärung zur Ursache bleibe ich unsicher.",
        "intent": "Ich prüfe kurz weitere sichtbare Bereiche, bevor ich entscheide.",
        "why": "Filterursache unklar, ich brauche noch einen kurzen sichtbaren Seitencheck.",
        "stance": "hesitate",
        "feel": {"label": "unsicher", "valence": -1},
    }
    out = P.humanize_perception_voice(
        perc,
        task=task,
        lab_b_gold_context_allowed=False,
    )
    assert P.looks_like_research_script(out["think"]) is False
    assert P.looks_like_research_script(out["intent"]) is False
    assert P.looks_like_research_script(out["why"]) is False
    assert "grillplatte" in out["think"].lower()
    assert "scroll" in out["intent"].lower()


def test_scope_nav_home_perception_skips_on_tool_url():
    nav_task = (
        "Starte auf der Bosch eBike Startseite (nicht direkt im Tool). "
        "Finde den Weg zum Produktkombinationen-Tool (Service/Produktkombinationen)."
    )
    perc = {
        "taskReminder": "Ich will kompatible Displays finden",
        "noticed": [{"what": "Filter/Ursache prüfen", "where": "Tool", "relevance": "high"}],
        "think": "Tool ist sichtbar.",
        "clarity": 1,
        "feel": {"label": "ok", "valence": 0},
        "confusion": "filter_cause_unknown",
        "stance": "proceed",
        "intent": "Ich prüfe das Tool.",
        "why": "Tool ist geladen.",
    }
    out = P.scope_nav_home_perception(
        perc,
        current_url="https://www.bosch-ebike.com/de/service/produktkombinationen",
        task=nav_task,
        budget=3,
    )
    assert out == perc


def test_enrich_skips_matrix_gold_when_off_tool():
    # Full budget scenario: if matrix gold cues were allowed, enrichment could
    # replace the single noticed slot with "Performance Line" / "grau / disabled".
    perc = {
        "taskReminder": "Displays finden",
        "noticed": [{"what": "Kompatibilitätsfilter Auswahl", "relevance": "high"}],
        "think": "Performance Line ist zu sehen; die Optionen sind grau und ich weiß nicht warum.",
        "clarity": 0,
        "feel": {"label": "frustriert", "valence": -2},
        "confusion": "disabled_option_unexplained",
        "stance": "proceed",
        "intent": "Ich prüfe noch einmal.",
        "why": "Ohne Ursache bleibt es unklar.",
    }
    out = P.enrich_noticed_from_perception_text(
        perc,
        budget=1,
        lab_b_gold_context_allowed=False,
    )
    assert out is not None
    joined = " ".join(n.get("what") for n in out.get("noticed") or [] if isinstance(n, dict)).lower()
    assert "performance line" not in joined
    assert "grau" not in joined


def test_enrich_still_adds_matrix_gold_on_tool():
    perc = {
        "taskReminder": "Displays finden",
        "noticed": [{"what": "Kompatibilitätsfilter Auswahl", "relevance": "high"}],
        "think": "Performance Line ist zu sehen; die Optionen sind grau und ich weiß nicht warum.",
        "clarity": 0,
        "feel": {"label": "frustriert", "valence": -2},
        "confusion": "disabled_option_unexplained",
        "stance": "proceed",
        "intent": "Ich prüfe noch einmal.",
        "why": "Ohne Ursache bleibt es unklar.",
    }
    out = P.enrich_noticed_from_perception_text(
        perc,
        budget=1,
        lab_b_gold_context_allowed=True,
    )
    assert out is not None
    joined = " ".join(n.get("what") for n in out.get("noticed") or [] if isinstance(n, dict)).lower()
    assert "performance line" in joined or "grau" in joined


def test_min_steps_done_gate_blocks_before_min_steps():
    assert P.min_steps_blocks_done(1, 6, stance="proceed") is True
    assert P.min_steps_blocks_done(5, 6, stance="hesitate") is True
    assert P.min_steps_blocks_done(6, 6, stance="proceed") is False


def test_min_steps_done_gate_allows_abandon_early():
    assert P.min_steps_blocks_done(1, 6, stance="abandon") is False
    assert P.min_steps_blocks_done(2, 6, stance="abandon") is False


NAV_TASK = (
    "Starte auf der Bosch eBike Startseite (nicht direkt im Tool). "
    "Finde den Weg zum Produktkombinationen-Tool (Service/Produktkombinationen)."
)

PORSCHE_TASK = (
    "Starte auf der Porsche Startseite (nicht direkt). "
    "Finde den Weg zum Konfigurator über Modelle/Navigation. "
    "Erfolg = du landest auf der Konfigurator-Seite."
)


def test_is_ui_path_finding_task_generic_and_bosch_alias():
    assert P.is_ui_path_finding_task(NAV_TASK) is True
    assert P.is_nav_h3_task(NAV_TASK) is True
    assert P.is_ui_path_finding_task(PORSCHE_TASK) is True
    assert P.is_ui_path_finding_task("Nutze das Produktkombinationen-Tool direkt.") is False


def test_task_keywords_only_from_task_text():
    assert "produktkombination" in P._task_target_keywords(NAV_TASK)
    assert P._task_target_keywords(PORSCHE_TASK) == ["konfigurator"]
    assert P._task_target_keywords("Bitte die Startseite anschauen.") == []
    assert "modelle" in P._task_nav_open_keywords(PORSCHE_TASK)


def test_ueq_keyword_hygiene_no_meta_navigation():
    task_c = (
        "Suche Service-Angebote. Öffne „Service & Beratung“ in der Navigation "
        "(oder Service-Bereich). Bei Navigationsproblemen: sichtbare Hinweise nutzen."
    )
    opens = P._task_nav_open_keywords(task_c)
    assert "navigation" not in opens
    assert "menü" not in opens and "menu" not in opens
    assert "service" in opens
    assert "beratung" in opens
    targets = P._task_target_keywords(task_c)
    # Quoted „Service & Beratung“ may be a target label; hub path still prefers /service/
    assert "navigation" not in targets
    # Hub must not prefer …/routenplanung-navigation over /service/
    assert P._href_key_match_score("/de/connected-biking/routenplanung-navigation", opens) < P._href_key_match_score(
        "/de/service/", opens
    )


def test_ueq_ueber_uns_gate_and_keywords():
    task_f = (
        "Öffne „Über uns“: Werte, Innovation, Sicherheit. "
        "Bei Navigationsproblemen: Startseiten-Inhalte nutzen."
    )
    assert P.is_ui_path_finding_task(task_f) is True
    opens = P._task_nav_open_keywords(task_f)
    targets = P._task_target_keywords(task_f)
    assert any("ueber" in k or "unternehmen" in k or "uns" in k for k in opens + targets)
    assert "navigation" not in opens


def test_ueq_technik_open_destination_gate():
    task_d = (
        "Informiere dich über Display, Akku, DriveUnit, Technologien. "
        "Öffne den System-/Produktbereich."
    )
    assert P.is_ui_path_finding_task(task_d) is True
    opens = P._task_nav_open_keywords(task_d)
    assert "technik" in opens or "system" in opens or "produkte" in opens


def test_scope_nav_home_keeps_vision_noticed():
    perc = {
        "taskReminder": "Ich will Über uns finden",
        "noticed": [
            {"what": "Über uns in der Navigation", "where": "Header", "relevance": "high"},
            {"what": "Cookie Banner", "where": "unten", "relevance": "med"},
        ],
        "think": "Oben sehe ich Über uns.",
        "clarity": 2,
        "feel": {"label": "neutral", "valence": 0},
        "confusion": None,
        "stance": "proceed",
        "intent": "Ich klicke auf Über uns.",
        "why": "Das Label ist sichtbar.",
    }
    out = P.scope_nav_home_perception(
        perc,
        current_url="https://www.bosch-ebike.com/de/",
        task='Starte auf der Startseite. Öffne „Über uns“ in der Navigation.',
        budget=4,
    )
    assert out is not None
    whats = " ".join(str(n.get("what") or "") for n in (out.get("noticed") or []))
    assert "Über uns" in whats
    assert out.get("intent") == "Ich klicke auf Über uns."


def test_select_nav_dom_action_works_without_bosch_domain():
    summary = {
        "dom_state": {
            "selector_map": {
                3: {
                    "is_visible": True,
                    "bounds": {"x": 500, "y": 40, "width": 160, "height": 40},
                    "attributes": {"href": "/deutschland/modelle/"},
                    "ax_node": {"name": "Modelle", "role": "link"},
                }
            }
        }
    }
    action, reason = P.select_nav_dom_action(
        summary,
        current_url="https://www.porsche.com/germany/",
        task=PORSCHE_TASK,
        menu_hover_used=True,
        target_click_used=True,
    )
    assert reason == "nav_dom_service_click"
    assert action == {"tool": "click", "index": 3}


def test_filter_path_finding_deeplinks_blocks_target_navigate():
    class Nav:
        def model_dump(self, exclude_none=True):
            return {"navigate": {"url": "https://www.example.com/de/service/produktkombinationen"}}

    class Click:
        def model_dump(self, exclude_none=True):
            return {"click": {"index": 12}}

    kept, reason = P.filter_path_finding_deeplinks(
        [Nav(), Click()],
        task=NAV_TASK,
        current_url="https://www.example.com/de/",
    )
    assert reason == "deeplink_blocked"
    assert len(kept) == 1
    assert P.action_tool_name(kept[0]) == "click"


def test_path_target_reached_and_deeplink_cheat_detection():
    assert P.path_target_reached(
        "https://www.bosch-ebike.com/de/service/produktkombinationen",
        NAV_TASK,
    )
    assert not P.path_target_reached("https://www.bosch-ebike.com/de/", NAV_TASK)
    assert (
        P.detect_path_finding_deeplink_cheat(
            [
                {
                    "action": "navigate",
                    "target": "https://www.bosch-ebike.com/de/service/produktkombinationen",
                }
            ],
            task=NAV_TASK,
            start_url="https://www.bosch-ebike.com/de/",
        )
        is True
    )
    assert (
        P.detect_path_finding_deeplink_cheat(
            [
                {"action": "navigate", "target": "https://www.bosch-ebike.com/de/"},
                {"action": "evaluate", "result": "nav_target:/de/service/produktkombinationen"},
            ],
            task=NAV_TASK,
            start_url="https://www.bosch-ebike.com/de/",
        )
        is False
    )


def test_select_nav_dom_action_avoids_repeating_same_coordinates():
    summary = {
        "dom_state": {
            "selector_map": {
                99: {
                    "is_visible": True,
                    "bounds": {"x": 0, "y": 0, "width": 1400, "height": 642},
                    "attributes": {"href": "/de/"},
                    "ax_node": {
                        "name": "Produkte eBikes Service & Beratung Magazin Über uns Business",
                        "role": "link",
                    },
                }
            }
        }
    }
    first, reason1 = P.select_nav_dom_action(
        summary,
        current_url="https://www.example.com/de/",
        task=NAV_TASK,
        menu_hover_used=True,
        target_click_used=True,
    )
    # After hover, leaf opener is activated via CDP click + wait.
    assert reason1 == "nav_dom_service_click"
    assert first is not None
    assert first["tool"] == "evaluate"
    second, reason2 = P.select_nav_dom_action(
        summary,
        current_url="https://www.example.com/de/",
        task=NAV_TASK,
        avoid_coordinates=[(600, 60)],
        menu_hover_used=True,
        target_click_used=True,
        menu_click_used=True,
    )
    assert reason2 == "nav_dom_opener_spent"
    assert second is None


def test_select_nav_dom_action_menu_phase_prefers_target_after_opener():
    """Two-hop: after Service opener, prefer Produktkombinationen index on home."""
    summary = {
        "dom_state": {
            "selector_map": {
                3: {
                    "is_visible": True,
                    "bounds": {"x": 500, "y": 40, "width": 160, "height": 40},
                    "attributes": {"href": "/de/", "aria-expanded": "true"},
                    "ax_node": {"name": "Service & Beratung", "role": "link"},
                },
                12: {
                    "is_visible": True,
                    "bounds": {"x": 520, "y": 120, "width": 220, "height": 36},
                    "attributes": {"href": "/de/service/produktkombinationen"},
                    "ax_node": {"name": "Produktkombinationen", "role": "link"},
                },
            }
        }
    }
    action, reason = P.select_nav_dom_action(
        summary,
        current_url="https://www.bosch-ebike.com/de/",
        task=NAV_TASK,
        prior_nav_reason="nav_dom_service_coordinate",
        exploratory_attempts=1,
        menu_hover_used=True,
    )
    assert reason == "nav_dom_product_index"
    assert action == {"tool": "click", "index": 12}


def test_select_nav_dom_action_menu_phase_waits_once_for_submenu():
    summary = {
        "dom_state": {
            "selector_map": {
                3: {
                    "is_visible": True,
                    "bounds": {"x": 500, "y": 40, "width": 160, "height": 40},
                    "attributes": {"href": "/de/service/", "aria-expanded": "false"},
                    "ax_node": {"name": "Service & Beratung", "role": "link"},
                }
            }
        }
    }
    action, reason = P.select_nav_dom_action(
        summary,
        current_url="https://www.bosch-ebike.com/de/",
        task=NAV_TASK,
        prior_nav_reason="nav_dom_service_click",
        menu_wait_used=False,
        menu_hover_used=True,
        target_click_used=True,
    )
    assert reason == "nav_dom_menu_wait"
    assert action == {"tool": "wait", "seconds": 2}
    # Second call with wait already used falls back to opener re-click.
    action2, reason2 = P.select_nav_dom_action(
        summary,
        current_url="https://www.bosch-ebike.com/de/",
        task=NAV_TASK,
        prior_nav_reason="nav_dom_menu_wait",
        menu_wait_used=True,
        menu_hover_used=True,
        target_click_used=True,
    )
    assert reason2 == "nav_dom_service_click"
    assert action2 == {"tool": "click", "index": 3}

def test_build_nav_opener_click_evaluate_embeds_open_keys():
    action = P.build_nav_opener_click_evaluate(["service", "beratung"])
    assert action is not None
    assert action["tool"] == "evaluate"
    assert "service" in action["code"]
    assert ".click()" in action["code"]


def test_select_nav_dom_action_evaluate_click_after_hover_wait():
    summary = {
        "dom_state": {
            "selector_map": {
                # Rootish aggregated strip only — no discrete hub index.
                3: {
                    "is_visible": True,
                    "bounds": {"x": 0, "y": 40, "width": 2000, "height": 40},
                    "attributes": {"href": "/de/"},
                    "ax_node": {
                        "name": "Produkte eBikes Service & Beratung Magazin Business",
                        "role": "link",
                    },
                }
            }
        }
    }
    action, reason = P.select_nav_dom_action(
        summary,
        current_url="https://www.bosch-ebike.com/de/",
        task=NAV_TASK,
        prior_nav_reason="nav_dom_menu_wait",
        menu_wait_used=True,
        menu_hover_used=True,
    )
    assert reason == "nav_dom_target_evaluate"
    assert action is not None
    assert action["tool"] == "evaluate"
    assert "produktkombination" in action["code"].lower()


def test_select_nav_dom_action_opens_with_cdp_hover_wait_first():
    summary = {
        "dom_state": {
            "selector_map": {
                3: {
                    "is_visible": True,
                    "bounds": {"x": 500, "y": 40, "width": 160, "height": 40},
                    "attributes": {"href": "/de/service/"},
                    "ax_node": {"name": "Service & Beratung", "role": "link"},
                }
            }
        }
    }
    action, reason = P.select_nav_dom_action(
        summary,
        current_url="https://www.bosch-ebike.com/de/",
        task=NAV_TASK,
        menu_hover_used=False,
    )
    assert reason == "nav_dom_menu_hover"
    assert action is not None
    assert action["tool"] == "wait"
    assert action["seconds"] == 2
    assert isinstance(action.get("coordinate_x"), int)
    assert isinstance(action.get("coordinate_y"), int)


def test_select_nav_dom_action_synthetic_hover_without_bounds():
    """No usable bounds → synthetic top-strip CDP hover (not evaluate-only)."""
    summary = {
        "dom_state": {
            "selector_map": {
                3: {
                    "is_visible": True,
                    "attributes": {"href": "/de/service/"},
                    "ax_node": {"name": "Service & Beratung", "role": "link"},
                }
            }
        }
    }
    action, reason = P.select_nav_dom_action(
        summary,
        current_url="https://www.bosch-ebike.com/de/",
        task=NAV_TASK,
        menu_hover_used=False,
    )
    assert reason == "nav_dom_menu_hover"
    assert action is not None
    assert action["tool"] == "wait"
    assert action["seconds"] == 2
    assert isinstance(action.get("coordinate_x"), int)
    assert isinstance(action.get("coordinate_y"), int)


def test_is_home_loop_click_resolves_logo_index_href():
    summary = {
        "dom_state": {
            "selector_map": {
                1: {
                    "is_visible": True,
                    "attributes": {"href": "/de/"},
                    "ax_node": {"name": "Bosch", "role": "link"},
                }
            }
        }
    }

    class _Click:
        def model_dump(self, exclude_none=True):
            return {"click": {"index": 1}}

    assert P.is_home_loop_click(
        _Click(),
        "https://www.bosch-ebike.com/de/",
        start_url="https://www.bosch-ebike.com/de/",
        task=NAV_TASK,
        browser_state_summary=summary,
    )


def test_select_nav_dom_action_empty_map_still_hovers():
    action, reason = P.select_nav_dom_action(
        {"dom_state": {"selector_map": {}}},
        current_url="https://www.bosch-ebike.com/de/",
        task=NAV_TASK,
        menu_hover_used=False,
    )
    assert reason == "nav_dom_menu_hover"
    assert action is not None
    assert action["tool"] == "wait"
    assert isinstance(action.get("coordinate_x"), int)


def test_scope_nav_home_scrubs_think_and_blocks_filter_promote():
    nav_task = NAV_TASK
    perc = {
        "taskReminder": "x",
        "noticed": [{"what": "Startseite", "relevance": "high"}],
        "think": "Ohne Erklärung zur Ursache bleibe ich unsicher wegen Filter.",
        "clarity": 0,
        "feel": {"label": "frustriert", "valence": -2},
        "confusion": "filter_cause_unknown",
        "stance": "proceed",
        "intent": "x",
        "why": "Filter unklar warum",
    }
    scoped = P.scope_nav_home_perception(
        perc, current_url="https://www.bosch-ebike.com/de/", task=nav_task, budget=3
    )
    assert scoped is not None
    assert scoped["confusion"] is None
    assert "ohne erklärung" not in scoped["think"].lower()
    enriched = P.enrich_noticed_from_perception_text(
        scoped, budget=3, lab_b_gold_context_allowed=False
    )
    blob = " ".join(n["what"] for n in enriched["noticed"]).lower()
    assert "filter" not in blob
    assert "unklar" not in blob


def test_destination_quality_prefers_help_over_newsletter():
    task = "Öffne „Service & Beratung“ in der Navigation (Service-Bereich)."
    news = P.destination_quality_adjust(
        "/de/service/newsletter-anmeldung?utm_campaign=cta",
        "Newsletter anmelden",
        task=task,
    )
    help_u = P.destination_quality_adjust(
        "/de/service/hilfe-wartung",
        "Hilfe & Wartung",
        task=task,
    )
    hub = P.destination_quality_adjust("/de/service/", "Service", task=task)
    assert news < -100
    assert help_u > 50
    assert hub > 30
    assert help_u > news
    assert P.is_marketing_cta_url("/de/service/newsletter?utm_source=nav")


def test_href_key_match_score_penalizes_newsletter_under_service():
    keys = ["service", "beratung"]
    assert P._href_key_match_score(
        "/de/service/newsletter-anmeldung?utm_campaign=x", keys
    ) < P._href_key_match_score("/de/service/hilfe-wartung", keys)
    assert P._href_key_match_score(
        "/de/service/newsletter-anmeldung", keys
    ) < P._href_key_match_score("/de/service/", keys)


def test_build_nav_target_click_evaluate_embeds_keys():
    action = P.build_nav_target_click_evaluate(["produktkombination"])
    assert action is not None
    assert action["tool"] == "evaluate"
    assert "produktkombination" in action["code"]
    assert "shadowRoot" in action["code"]
    assert "qualityAdj" in action["code"]
    hub = P.build_nav_hub_click_evaluate(["service"])
    assert hub is not None
    assert "qualityAdj" in hub["code"]


def test_select_nav_dom_action_clicks_hidden_target_href():
    summary = {
        "dom_state": {
            "selector_map": {
                9: {
                    "is_visible": False,
                    "attributes": {"href": "/de/service/produktkombinationen"},
                    "ax_node": {"name": "Produktkombinationen", "role": "link"},
                }
            }
        }
    }
    action, reason = P.select_nav_dom_action(
        summary,
        current_url="https://www.bosch-ebike.com/de/",
        task=NAV_TASK,
        menu_hover_used=True,
        menu_wait_used=True,
    )
    assert reason == "nav_dom_product_index"
    assert action == {"tool": "click", "index": 9}


def test_select_nav_dom_action_target_evaluate_after_hover_wait():
    action, reason = P.select_nav_dom_action(
        {"dom_state": {"selector_map": {}}},
        current_url="https://www.bosch-ebike.com/de/",
        task=NAV_TASK,
        prior_nav_reason="nav_dom_menu_wait",
        menu_wait_used=True,
        menu_hover_used=True,
    )
    assert reason == "nav_dom_target_evaluate"
    assert action is not None
    assert action["tool"] == "evaluate"
