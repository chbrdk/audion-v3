"""Unit tests for vision detail / model helpers (no browser)."""
from __future__ import annotations

import os

import main as ux_main


def test_vision_detail_default_high(monkeypatch):
    monkeypatch.delenv("UX_JOURNEY_VISION_DETAIL", raising=False)
    assert ux_main._vision_detail_level() == "high"


def test_vision_detail_accepts_auto_low_high(monkeypatch):
    monkeypatch.setenv("UX_JOURNEY_VISION_DETAIL", "auto")
    assert ux_main._vision_detail_level() == "auto"
    monkeypatch.setenv("UX_JOURNEY_VISION_DETAIL", "LOW")
    assert ux_main._vision_detail_level() == "low"
    monkeypatch.setenv("UX_JOURNEY_VISION_DETAIL", "bogus")
    assert ux_main._vision_detail_level() == "high"


def test_openai_model_default_luna(monkeypatch):
    monkeypatch.delenv("UX_JOURNEY_OPENAI_MODEL", raising=False)
    assert ux_main._openai_model_id() == "gpt-5.6-luna"
