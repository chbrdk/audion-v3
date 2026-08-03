"""Unit tests for history → steps error surfacing (empty model_output steps)."""

from __future__ import annotations

from types import SimpleNamespace

import main as ux_main


class _FakeHistory:
    def __init__(self, actions: list, errors: list):
        self._actions = actions
        self._errors = errors

    def action_history(self):
        return self._actions

    def errors(self):
        return self._errors

    def model_thoughts(self):
        return []


def test_history_to_steps_surfaces_errors_for_empty_actions():
    history = _FakeHistory(
        actions=[
            [{"navigate": {"url": "https://example.com"}, "result": "ok"}],
            [],
            [],
        ],
        errors=[None, "Could not parse response", "LLM call timed out after 90 seconds"],
    )
    steps = ux_main._history_to_steps(history)
    assert len(steps) == 3
    assert steps[0]["action"] == "navigate"
    assert steps[1]["action"] == "error"
    assert "parse" in (steps[1]["result"] or "").lower()
    assert steps[2]["action"] == "error"
    assert "timed out" in (steps[2]["result"] or "").lower()


def test_failure_summary_from_history():
    history = _FakeHistory(actions=[[], []], errors=["parse failed", "parse failed again"])
    steps = ux_main._history_to_steps(history)
    err, summary = ux_main._failure_summary_from_history(history, steps)
    assert err and "parse failed again" in err
    assert summary and "2 steps" in summary
