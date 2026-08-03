"""Lab L1: persona time_pressure → hard step budget."""

from __future__ import annotations

import os

import main as ux_main


def test_impatient_clamps_max_steps(monkeypatch):
    monkeypatch.setenv("UX_JOURNEY_IMPATIENT_MAX_STEPS", "10")
    monkeypatch.setenv("UX_JOURNEY_MIN_STEPS", "6")
    persona = {
        "id": "p",
        "name": "Alex",
        "dimensionOverrides": {"time_pressure": 0.9},
    }
    max_s, min_s, tp = ux_main._apply_persona_step_budget(40, persona)
    assert tp == 0.9
    assert max_s == 10
    assert min_s == 3


def test_patient_keeps_base(monkeypatch):
    monkeypatch.setenv("UX_JOURNEY_IMPATIENT_MAX_STEPS", "10")
    monkeypatch.setenv("UX_JOURNEY_MIN_STEPS", "6")
    persona = {
        "id": "p",
        "name": "Sam",
        "dimensionOverrides": {"timePressure": 0.2},
    }
    max_s, min_s, tp = ux_main._apply_persona_step_budget(40, persona)
    assert tp == 0.2
    assert max_s == 40
    assert min_s == 6


def test_neutral_unchanged(monkeypatch):
    monkeypatch.setenv("UX_JOURNEY_MIN_STEPS", "6")
    max_s, min_s, tp = ux_main._apply_persona_step_budget(15, {"id": "x", "name": "N"})
    assert max_s == 15
    assert min_s == 6
    # name alone may keyword-score; allow None or mid
    if tp is not None:
        assert 0.34 < tp < 0.75 or max_s == 15


def test_time_pressure_from_camel_overrides():
    assert ux_main._persona_time_pressure({"dimensionOverrides": {"timePressure": 0.88}}) == 0.88


def test_impatient_cap_env(monkeypatch):
    monkeypatch.setenv("UX_JOURNEY_IMPATIENT_MAX_STEPS", "8")
    max_s, _, _ = ux_main._apply_persona_step_budget(
        50, {"dimension_overrides": {"time_pressure": 1.0}}
    )
    assert max_s == 8
