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
    )
    assert reason == "nav_dom_service_coordinate"
    assert action is not None
    assert action["tool"] == "click"
    assert "index" not in action
    assert action["coordinate_x"] == 600
    assert action["coordinate_y"] == 75


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
    )
    assert reason == "nav_dom_service_coordinate"
    assert action is not None
    assert action["coordinate_y"] == 75
    assert action["coordinate_x"] == 600


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
    )
    assert reason == "nav_dom_service_coordinate"
    assert action is not None
    assert "index" not in action
    assert action["coordinate_y"] == 60  # 36 + 48*0.5
    assert 500 <= action["coordinate_x"] <= 700


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
    )
    assert reason1 == "nav_dom_service_coordinate"
    assert first is not None
    xy = (first["coordinate_x"], first["coordinate_y"])
    second, reason2 = P.select_nav_dom_action(
        summary,
        current_url="https://www.example.com/de/",
        task=NAV_TASK,
        avoid_coordinates=[xy],
        menu_hover_used=True,
    )
    assert reason2 == "nav_dom_service_coordinate"
    assert second is not None
    assert (second["coordinate_x"], second["coordinate_y"]) != xy


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
    )
    assert reason2 == "nav_dom_service_click"
    assert action2 == {"tool": "click", "index": 3}

def test_build_nav_menu_hover_evaluate_embeds_open_keys():
    action = P.build_nav_menu_hover_evaluate(["service", "beratung"])
    assert action is not None
    assert action["tool"] == "evaluate"
    assert "service" in action["code"]
    assert "mouseover" in action["code"]
    assert "mouseenter" in action["code"]


def test_select_nav_dom_action_opens_with_evaluate_hover_first():
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
    assert action["tool"] == "evaluate"
    assert "service" in action["code"].lower()


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
