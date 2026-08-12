"""Regression: never surface AgentBrain dumps as Denken VO."""

from main import (
    _extract_thinking_text,
    _extract_structured_model_output,
    _looks_like_agent_bookkeeping_dump,
    _thought_entry_from_history_item,
)


class _FakeBrain:
    def __init__(self):
        self.thinking = None
        self.evaluation_previous_goal = "Start — landed on storefront."
        self.memory = "Home hero visible"
        self.next_goal = "Open Wohnzimmer [4]"

    def model_dump(self):
        return {
            "thinking": self.thinking,
            "evaluation_previous_goal": self.evaluation_previous_goal,
            "memory": self.memory,
            "next_goal": self.next_goal,
        }


def test_extract_thinking_none_does_not_return_dump():
    dump = (
        "thinking=None evaluation_previous_goal='Start' "
        "memory='Home' next_goal='Open catalog'"
    )
    assert _looks_like_agent_bookkeeping_dump(dump)
    assert _extract_thinking_text(dump) == ""
    structured = _extract_structured_model_output(dump)
    assert structured is not None
    assert structured["thinking"] == ""
    assert structured["evaluation_previous_goal"] == "Start"
    assert structured["memory"] == "Home"
    assert structured["next_goal"] == "Open catalog"


def test_thought_entry_from_agent_brain_object():
    entry = _thought_entry_from_history_item(_FakeBrain())
    assert entry["thinking"] == ""
    assert entry["structured"]["evaluation_previous_goal"] == "Start — landed on storefront."
    assert entry["structured"]["next_goal"] == "Open Wohnzimmer [4]"


def test_extract_quoted_thinking_still_works():
    raw = (
        "thinking='Ich sehe den Hero und will Wohnzimmer öffnen.\\n"
        "<<PERCEPTION>>{\"think\":\"ok\"}<</PERCEPTION>>' "
        "evaluation_previous_goal='ok' memory='m' next_goal='n'"
    )
    text = _extract_thinking_text(raw)
    assert "Ich sehe den Hero" in text
    assert "thinking=None" not in text
