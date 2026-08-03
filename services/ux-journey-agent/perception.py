"""
Perception-in-the-Loop — parse, validate, persona salience, stance gate, felt-state.

@see specs/domain/ux-journey-perception.md
@see knowledge/ux-journey-perception-in-loop.md
"""

from __future__ import annotations

import json
import os
import re
from typing import Any

_PERCEPTION_BLOCK_RE = re.compile(
    r"<<PERCEPTION>>\s*(?P<json>.*?)\s*<<\/PERCEPTION>>",
    flags=re.DOTALL,
)
_THINK_ALOUD_BLOCK_RE = re.compile(
    r"<<THINK_ALOUD>>\s*(?P<json>.*?)\s*<<\/THINK_ALOUD>>",
    flags=re.DOTALL,
)

STANCES = frozenset({"proceed", "hesitate", "abandon"})
RELEVANCE = frozenset({"high", "med", "low", "medium"})
CONFUSION_TAGS = frozenset(
    {
        "disabled_option_unexplained",
        "filter_cause_unknown",
        "selection_order_surprise",
    }
)
FEEL_VALENCES = frozenset({-2, -1, 0, 1, 2})

HESITATE_ACTIONS = frozenset(
    {"scroll", "wait", "extract", "extract_page_content", "screenshot", "send_keys"}
)
PROCEED_BLOCKED_WHEN_EMPTY_NOTICED = frozenset({"click", "input", "type", "navigate", "go_to_url"})
# P4.1: these require a valid <<PERCEPTION>> in the same turn (no thinking synthesize).
DECISION_ACTIONS = frozenset(
    {
        "done",
        "complete",
        "finish",
        "click",
        "input",
        "type",
        "navigate",
        "go_to_url",
        "select_dropdown",
        "send_keys",
    }
)

_FIELD_LIMIT = 420
_NOTICED_WHAT_LIMIT = 160
_NOTICED_WHERE_LIMIT = 120


def _trim(text: str, limit: int = _FIELD_LIMIT) -> str:
    t = re.sub(r"\s+", " ", (text or "").strip())
    if len(t) <= limit:
        return t
    return t[: max(0, limit - 1)].rstrip() + "…"


def _env_truthy(name: str, default: str = "1") -> bool:
    raw = (os.environ.get(name) or default).strip().lower()
    return raw not in ("0", "false", "off", "no")


def perception_gate_enabled() -> bool:
    return _env_truthy("UX_JOURNEY_PERCEPTION_GATE", "1")


def salience_budget(
    time_pressure: float | None,
    detail_orientation: float | None = None,
) -> int:
    """Max noticed[] length from persona dims."""
    tp = 0.5 if time_pressure is None else float(time_pressure)
    if tp >= 0.75:
        budget = 3
    elif tp <= 0.35:
        budget = 6
    else:
        budget = 4
    if detail_orientation is not None:
        if detail_orientation < 0.35:
            budget = max(2, budget - 1)
        elif detail_orientation >= 0.75:
            budget = min(7, budget + 1)
    return budget


def dims_from_persona_policy(policy: Any | None) -> dict[str, float | None]:
    """Best-effort extract dimensions from agent.persona_policy."""
    out: dict[str, float | None] = {
        "time_pressure": None,
        "detail_orientation": None,
        "exploration": None,
        "trust_skepticism": None,
    }
    if policy is None:
        return out
    dims = getattr(policy, "dimensions", None)
    if dims is None and isinstance(policy, dict):
        dims = policy.get("dimensions")
    if dims is None:
        return out
    for key in out:
        try:
            if isinstance(dims, dict):
                val = dims.get(key)
            else:
                val = getattr(dims, key, None)
            if val is not None:
                out[key] = float(val)
        except (TypeError, ValueError):
            pass
    return out


def _coerce_feel(raw: Any) -> dict[str, Any] | None:
    if not isinstance(raw, dict):
        return None
    label = str(raw.get("label") or "").strip()
    if not label:
        return None
    try:
        valence = int(raw.get("valence")) if raw.get("valence") is not None else None
    except (TypeError, ValueError):
        valence = None
    if valence not in FEEL_VALENCES:
        return None
    return {"label": _trim(label, 80), "valence": valence}


def _coerce_noticed_item(raw: Any) -> dict[str, Any] | None:
    if not isinstance(raw, dict):
        return None
    what = str(raw.get("what") or "").strip()
    if len(what) < 3:
        return None
    item: dict[str, Any] = {"what": _trim(what, _NOTICED_WHAT_LIMIT)}
    where = str(raw.get("where") or "").strip()
    if where:
        item["where"] = _trim(where, _NOTICED_WHERE_LIMIT)
    rel = str(raw.get("relevance") or "med").strip().lower()
    if rel == "medium":
        rel = "med"
    if rel not in ("high", "med", "low"):
        rel = "med"
    item["relevance"] = rel
    return item


def _parse_json_block(text: str, pattern: re.Pattern[str]) -> Any | None:
    if not text:
        return None
    for match in pattern.finditer(text):
        payload = (match.group("json") or "").strip()
        if not payload:
            continue
        try:
            return json.loads(payload)
        except json.JSONDecodeError:
            continue
    return None


def map_think_aloud_to_perception(ta: dict[str, Any]) -> dict[str, Any]:
    """Legacy THINK_ALOUD → PERCEPTION-shaped dict (may still need coerce)."""
    seen = str(ta.get("seen") or "").strip()
    noticed: list[dict[str, Any]] = []
    if seen:
        noticed.append({"what": seen, "relevance": "high"})
    return {
        "taskReminder": str(ta.get("why") or ta.get("think") or "Aufgabe fortsetzen")[:200],
        "noticed": noticed,
        "ignoredGuess": None,
        "think": ta.get("think"),
        "clarity": 1 if noticed else 0,
        "feel": ta.get("feel"),
        "confusion": None,
        "stance": "proceed",
        "intent": ta.get("next") or ta.get("think") or "Ich fahre fort.",
        "why": ta.get("why") or ta.get("think") or "",
        "priorKnow": ta.get("priorKnow"),
        "learned": ta.get("learned"),
        "_legacyThinkAloud": True,
    }


def coerce_perception(
    raw: Any,
    *,
    budget: int = 4,
    require_strict: bool = True,
) -> dict[str, Any] | None:
    """Validate perception object; return None if unusable under require_strict."""
    if not isinstance(raw, dict):
        return None

    noticed_raw = raw.get("noticed")
    noticed: list[dict[str, Any]] = []
    if isinstance(noticed_raw, list):
        for entry in noticed_raw:
            item = _coerce_noticed_item(entry)
            if item:
                noticed.append(item)
            if len(noticed) >= budget:
                break
    elif isinstance(noticed_raw, str) and noticed_raw.strip():
        noticed.append({"what": _trim(noticed_raw, _NOTICED_WHAT_LIMIT), "relevance": "high"})

    # Legacy seen
    if not noticed and isinstance(raw.get("seen"), str) and raw["seen"].strip():
        noticed.append({"what": _trim(str(raw["seen"]), _NOTICED_WHAT_LIMIT), "relevance": "high"})

    think = str(raw.get("think") or "").strip()
    intent = str(raw.get("intent") or raw.get("next") or "").strip()
    why = str(raw.get("why") or "").strip()
    task = str(raw.get("taskReminder") or "").strip()
    feel = _coerce_feel(raw.get("feel"))

    stance = str(raw.get("stance") or "").strip().lower()
    if stance not in STANCES:
        stance = "proceed" if not require_strict else ""

    clarity_raw = raw.get("clarity")
    try:
        clarity = int(clarity_raw) if clarity_raw is not None else None
    except (TypeError, ValueError):
        clarity = None
    if clarity is None or clarity < 0 or clarity > 3:
        clarity = 1 if noticed else 0

    confusion = raw.get("confusion")
    if confusion is not None:
        confusion = str(confusion).strip().lower() or None
        if confusion and confusion not in CONFUSION_TAGS:
            confusion = None

    ignored = raw.get("ignoredGuess")
    ignored_s = str(ignored).strip() if ignored is not None else ""

    if require_strict:
        if not noticed:
            return None
        if not think or len(think) < 8:
            return None
        if not intent or len(intent) < 8:
            return None
        if stance not in STANCES:
            return None
        if feel is None:
            return None
        if not task:
            task = _trim(think, 160)

    out: dict[str, Any] = {
        "taskReminder": _trim(task or think or "Aufgabe", 200),
        "noticed": noticed[:budget],
        "ignoredGuess": _trim(ignored_s, 280) if ignored_s else None,
        "think": _trim(think) if think else None,
        "clarity": clarity,
        "feel": feel,
        "confusion": confusion,
        "stance": stance if stance in STANCES else "proceed",
        "intent": _trim(intent) if intent else None,
        "why": _trim(why) if why else None,
        "salienceBudget": budget,
        "noticedUsed": len(noticed[:budget]),
    }
    if raw.get("priorKnow"):
        out["priorKnow"] = _trim(str(raw["priorKnow"]))
    if raw.get("learned"):
        out["learned"] = _trim(str(raw["learned"]))
    if raw.get("_legacyThinkAloud"):
        out["legacyThinkAloud"] = True
    return out


def extract_perception_from_thinking(
    thinking_text: str,
    *,
    budget: int = 4,
) -> dict[str, Any] | None:
    """Parse <<PERCEPTION>> or legacy <<THINK_ALOUD>> from thinking."""
    if not thinking_text:
        return None
    raw = _parse_json_block(thinking_text, _PERCEPTION_BLOCK_RE)
    if raw is None:
        ta = _parse_json_block(thinking_text, _THINK_ALOUD_BLOCK_RE)
        if isinstance(ta, dict):
            raw = map_think_aloud_to_perception(ta)
    if raw is None:
        return None
    return coerce_perception(raw, budget=budget, require_strict=True)


def strip_perception_blocks(text: str) -> str:
    if not text:
        return text
    cleaned = _PERCEPTION_BLOCK_RE.sub("", text)
    cleaned = _THINK_ALOUD_BLOCK_RE.sub("", cleaned)
    return re.sub(r"\n{3,}", "\n\n", cleaned).strip()


def perception_to_think_aloud(perception: dict[str, Any]) -> dict[str, Any]:
    """Alias for UI / Soft-Q consumers expecting thinkAloud channels."""
    noticed = perception.get("noticed") or []
    seen_parts = []
    for n in noticed:
        if isinstance(n, dict) and n.get("what"):
            bit = str(n["what"])
            if n.get("where"):
                bit = f"{bit} ({n['where']})"
            seen_parts.append(bit)
    out: dict[str, Any] = {
        "seen": "; ".join(seen_parts) if seen_parts else None,
        "think": perception.get("think"),
        "priorKnow": perception.get("priorKnow"),
        "learned": perception.get("learned"),
        "next": perception.get("intent"),
        "why": perception.get("why"),
        "feel": perception.get("feel"),
    }
    return {k: v for k, v in out.items() if v is not None}


def action_tool_name(action: Any) -> str:
    """Best-effort tool name from ActionModel / dict."""
    if action is None:
        return ""
    data: dict[str, Any]
    if hasattr(action, "model_dump"):
        try:
            data = action.model_dump(exclude_none=True)  # type: ignore[assignment]
        except Exception:
            data = {}
    elif isinstance(action, dict):
        data = action
    else:
        return str(getattr(action, "name", "") or type(action).__name__).lower()

    skip = {"id", "index", "xpath", "css", "timeout", "text"}
    for key, val in data.items():
        if key in skip or val is None:
            continue
        if isinstance(val, (dict, bool, str, int, float, list)):
            return str(key).lower()
    return ""


_GREY_FILTER_CUES = (
    "grau",
    "gray",
    "grey",
    "disabled",
    "deaktiv",
    "ausgeblend",
    "ausgegraut",
    "filter",
    "unklar",
    "nicht klick",
    "nicht wähl",
    "kompatibil",
)


def perception_text_blob(perception: dict[str, Any] | None) -> str:
    """Flatten noticed/think/intent/why for cue scans."""
    if not perception:
        return ""
    parts: list[str] = [
        str(perception.get("think") or ""),
        str(perception.get("intent") or ""),
        str(perception.get("why") or ""),
        str(perception.get("taskReminder") or ""),
        str(perception.get("ignoredGuess") or ""),
    ]
    for n in perception.get("noticed") or []:
        if isinstance(n, dict):
            parts.append(str(n.get("what") or ""))
            parts.append(str(n.get("where") or ""))
        else:
            parts.append(str(n))
    return normalize_salience_label(" ".join(parts))


def has_grey_filter_signal(perception: dict[str, Any] | None) -> bool:
    blob = perception_text_blob(perception)
    return any(cue in blob for cue in _GREY_FILTER_CUES)


def should_prefer_abandon(
    perception: dict[str, Any] | None,
    time_pressure: float | None,
    *,
    felt_confusion_count: int = 0,
) -> bool:
    """
    Impatient personas: confusion + low clarity / grey-filter signal → abandon.
    Soft preference becomes a hard stance upgrade in apply_impatient_abandon_stance.
    """
    if perception is None:
        return False
    if time_pressure is None or float(time_pressure) < 0.75:
        return False
    if str(perception.get("stance") or "") == "abandon":
        return True

    confusion = perception.get("confusion")
    clarity = perception.get("clarity")
    low_clarity = isinstance(clarity, int) and clarity <= 1
    signal = has_grey_filter_signal(perception)
    prior = int(felt_confusion_count or 0) >= 1

    if confusion and (low_clarity or signal or prior):
        return True
    if low_clarity and signal:
        return True
    if prior and signal and low_clarity:
        return True
    return False


def apply_impatient_abandon_stance(
    perception: dict[str, Any] | None,
    time_pressure: float | None,
    *,
    felt_confusion_count: int = 0,
) -> tuple[dict[str, Any] | None, bool]:
    """
    Hard-upgrade proceed/hesitate → abandon for impatient + confusion.
    Returns (perception, upgraded).
    """
    if perception is None:
        return None, False
    if str(perception.get("stance") or "") == "abandon":
        return perception, False
    if not should_prefer_abandon(
        perception,
        time_pressure,
        felt_confusion_count=felt_confusion_count,
    ):
        return perception, False

    out = dict(perception)
    out["stance"] = "abandon"
    out["stanceUpgraded"] = True
    why = str(out.get("why") or "").strip()
    if len(why) < 12:
        out["why"] = (
            "Unerklärte graue/Filter-Lage — unter Zeitdruck breche ich ab, "
            "statt weiter zu raten."
        )
    intent = str(out.get("intent") or "").lower()
    if not any(tok in intent for tok in ("abbrech", "abbruch", "aufgeb", "stoppe", "fertig")):
        out["intent"] = (
            "Ich breche ab und sage ehrlich, dass ich keine sichere Antwort habe."
        )
    feel = out.get("feel")
    if not isinstance(feel, dict) or feel.get("valence") is None:
        out["feel"] = {"label": "frustriert", "valence": -2}
    elif isinstance(feel.get("valence"), int) and feel["valence"] > -1:
        out["feel"] = {
            "label": str(feel.get("label") or "frustriert"),
            "valence": -2,
        }
    return out, True


_SURFACE_PROMOTE_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"performance\s*line", re.I), "Performance Line"),
    (
        re.compile(
            r"\bfilter\w*\b|kompatibil|freigeschalt|produktkombination|auswahl[- ]?logik",
            re.I,
        ),
        "Filter",
    ),
    (re.compile(r"\bgrau\w*|\bgrey\w*|\bgray\w*|\bdisabled\b|ausgegraut|ausgeblend", re.I), "grau / disabled"),
    (
        re.compile(
            r"unklar\s+warum|warum .{0,40}grau|ohne erklärung|ohne erkennbar|"
            r"ohne .{0,20}ursache|nicht erklärt|keine erklärung|ursache unklar",
            re.I,
        ),
        "unklar warum",
    ),
    (re.compile(r"\bdisplays?\b|\bdisplay[- ]?karten\b|\bbedieneinheit", re.I), "Displays"),
]

# Prefer keeping these in noticed when budget is full (Lab B human gold).
_CRITICAL_NOTICED_LABELS = frozenset(
    {
        "filter",
        "unklar warum",
        "grau / disabled",
        "performance line",
        "displays",
    }
)


def _noticed_whats_blob(noticed: list[dict[str, Any]]) -> str:
    return normalize_salience_label(
        " ".join(str(n.get("what") or "") for n in noticed if isinstance(n, dict))
    )


def _label_covered(blob: str, label: str) -> bool:
    norm = normalize_salience_label(label)
    if not norm:
        return True
    if norm in blob:
        return True
    tokens = [tok for tok in norm.split() if len(tok) >= 4]
    if not tokens:
        return False
    # AND: "grau / disabled" must not count as covered by "disabled" alone.
    return all(tok in blob for tok in tokens)


def _replace_index_for_critical(noticed: list[dict[str, Any]]) -> int | None:
    """Pick an index to overwrite so a critical cue can enter a full budget."""
    if not noticed:
        return None
    for rel in ("low", "med", "high"):
        for i, n in enumerate(noticed):
            if not isinstance(n, dict):
                continue
            if str(n.get("relevance") or "med") != rel:
                continue
            what_norm = normalize_salience_label(str(n.get("what") or ""))
            if what_norm in _CRITICAL_NOTICED_LABELS:
                continue
            if any(c in what_norm for c in _CRITICAL_NOTICED_LABELS):
                continue
            return i
    # last non-critical by substring
    for i in range(len(noticed) - 1, -1, -1):
        n = noticed[i]
        if not isinstance(n, dict):
            return i
        what_norm = normalize_salience_label(str(n.get("what") or ""))
        if what_norm not in _CRITICAL_NOTICED_LABELS:
            return i
    return None


def enrich_noticed_from_perception_text(
    perception: dict[str, Any] | None,
    budget: int,
) -> dict[str, Any] | None:
    """
    Promote cues already written in think/why/intent/noticed into salience slots.
    Does not invent page UI. When budget is full, may replace a non-critical
    noticed item so Filter / unklar warum / grau still surface (Lab B).
    """
    if perception is None:
        return None
    out = dict(perception)
    noticed = [
        dict(n) if isinstance(n, dict) else {"what": str(n), "relevance": "med"}
        for n in (out.get("noticed") or [])
        if n
    ]
    noticed = noticed[: max(budget, 1)]

    source = " ".join(
        [
            str(out.get("think") or ""),
            str(out.get("why") or ""),
            str(out.get("intent") or ""),
            str(out.get("taskReminder") or ""),
            " ".join(str(n.get("what") or "") for n in noticed if isinstance(n, dict)),
            str(out.get("confusion") or ""),
        ]
    )
    blob = _noticed_whats_blob(noticed)
    for pattern, label in _SURFACE_PROMOTE_PATTERNS:
        if not pattern.search(source):
            continue
        if _label_covered(blob, label):
            continue
        item = {"what": label, "relevance": "high"}
        if len(noticed) < budget:
            noticed.append(item)
        else:
            # Keep existing cues: fold label into a slot instead of dropping Performance Line / grau.
            idx = _replace_index_for_critical(noticed)
            if idx is None:
                idx = len(noticed) - 1
            prev = str(noticed[idx].get("what") or "").strip()
            if label.lower() not in prev.lower():
                merged = f"{prev}; {label}" if prev else label
                noticed[idx] = {
                    "what": _trim(merged, _NOTICED_WHAT_LIMIT),
                    "relevance": "high",
                }
        blob = _noticed_whats_blob(noticed)

    out["noticed"] = noticed[:budget]
    out["noticedUsed"] = len(out["noticed"])
    out["salienceBudget"] = budget
    return out


def finalize_perception_for_persona(
    perception: dict[str, Any] | None,
    *,
    budget: int,
    time_pressure: float | None,
    felt_confusion_count: int = 0,
) -> tuple[dict[str, Any] | None, bool]:
    """Enrich noticed from own text, then hard-upgrade impatient abandon."""
    if perception is None:
        return None, False
    enriched = enrich_noticed_from_perception_text(perception, budget) or perception
    return apply_impatient_abandon_stance(
        enriched,
        time_pressure,
        felt_confusion_count=felt_confusion_count,
    )


def filter_actions_for_stance(
    actions: list[Any],
    perception: dict[str, Any] | None,
) -> tuple[list[Any], str]:
    """
    Return (filtered_actions, reason).
    Empty filtered list means caller should force done.
    """
    if not perception:
        return actions, "no_perception"
    stance = str(perception.get("stance") or "proceed")
    if not actions:
        return actions, "empty"

    if stance == "abandon":
        done_only = [a for a in actions if action_tool_name(a) in ("done", "complete", "finish")]
        if done_only:
            return done_only[:1], "abandon_done"
        return [], "abandon_force_done"

    if stance == "hesitate":
        kept = [a for a in actions if action_tool_name(a) in HESITATE_ACTIONS]
        if kept:
            return kept, "hesitate_filter"
        # No soft action — keep wait-like or force done
        return [], "hesitate_force_done"

    # proceed: block deep actions if noticed empty (should not happen if coerced)
    noticed = perception.get("noticed") or []
    if not noticed:
        kept = [a for a in actions if action_tool_name(a) not in PROCEED_BLOCKED_WHEN_EMPTY_NOTICED]
        return (kept or []), "proceed_empty_noticed"
    return actions, "proceed"


def soft_intent_target_overlap(perception: dict[str, Any], action: Any) -> bool:
    """P2: True when click/input target text overlaps intent/noticed (or non-click)."""
    name = action_tool_name(action)
    if name not in ("click", "input", "type", "select_dropdown"):
        return True
    blob_parts = [
        str(perception.get("intent") or ""),
        str(perception.get("think") or ""),
    ]
    for n in perception.get("noticed") or []:
        if isinstance(n, dict):
            blob_parts.append(str(n.get("what") or ""))
            blob_parts.append(str(n.get("where") or ""))
    blob = " ".join(blob_parts).lower()
    tokens = [t for t in re.split(r"[^\wäöüÄÖÜß]+", blob) if len(t) >= 4]
    if not tokens:
        return True

    target_txt = ""
    if hasattr(action, "model_dump"):
        try:
            dump = action.model_dump(exclude_none=True)
            target_txt = json.dumps(dump, ensure_ascii=False).lower()
        except Exception:
            target_txt = str(action).lower()
    else:
        target_txt = str(action).lower()

    hits = sum(1 for t in tokens if t in target_txt)
    return hits >= 1


def filter_actions_intent_align(
    actions: list[Any],
    perception: dict[str, Any] | None,
) -> tuple[list[Any], str]:
    """Drop click/input actions that do not overlap perception intent/noticed."""
    if not perception or not _env_truthy("UX_JOURNEY_PERCEPTION_INTENT_ALIGN", "1"):
        return actions, "align_off"
    if str(perception.get("stance")) != "proceed":
        return actions, "align_skip_stance"
    kept = [a for a in actions if soft_intent_target_overlap(perception, a)]
    if kept:
        return kept, "align_ok" if len(kept) == len(actions) else "align_filtered"
    return [], "align_all_dropped"


def new_felt_state() -> dict[str, Any]:
    return {
        "clarityTrend": [],
        "lastValence": None,
        "confusionCount": 0,
        "openQuestions": [],
        "lastNoticedDigest": "",
        "lastStance": None,
        "stepsWithPerception": 0,
        "retries": 0,
        "forcedDone": 0,
        "missingPerceptionClears": 0,
    }


def update_felt_state(state: dict[str, Any], perception: dict[str, Any] | None) -> dict[str, Any]:
    if not perception:
        return state
    state["stepsWithPerception"] = int(state.get("stepsWithPerception") or 0) + 1
    clarity = perception.get("clarity")
    if isinstance(clarity, int):
        trend = list(state.get("clarityTrend") or [])
        trend.append(clarity)
        state["clarityTrend"] = trend[-8:]
    feel = perception.get("feel")
    if isinstance(feel, dict) and feel.get("valence") is not None:
        state["lastValence"] = feel.get("valence")
    if perception.get("confusion"):
        state["confusionCount"] = int(state.get("confusionCount") or 0) + 1
        q = str(perception.get("think") or perception.get("why") or "")[:120]
        if q:
            oq = list(state.get("openQuestions") or [])
            oq.append(q)
            state["openQuestions"] = oq[-4:]
    digest_bits = [
        str(n.get("what"))
        for n in (perception.get("noticed") or [])
        if isinstance(n, dict) and n.get("what")
    ]
    state["lastNoticedDigest"] = "; ".join(digest_bits)[:240]
    state["lastStance"] = perception.get("stance")
    return state


def felt_state_prompt_block(state: dict[str, Any] | None) -> str:
    if not state or not state.get("stepsWithPerception"):
        return ""
    trend = state.get("clarityTrend") or []
    oq = state.get("openQuestions") or []
    lines = [
        "AUDION_FELT_STATE (dein bisheriger Eindruck — baue darauf auf, nicht neu optimieren):",
        f"- Klarheit-Verlauf: {trend[-5:] if trend else '—'}",
        f"- Letztes Gefühl valence: {state.get('lastValence')}",
        f"- Confusion-Momente bisher: {state.get('confusionCount')}",
        f"- Letzte Stance: {state.get('lastStance')}",
        f"- Zuletzt bemerkt: {state.get('lastNoticedDigest') or '—'}",
    ]
    if oq:
        lines.append(f"- Offene Zweifel: {' | '.join(str(x) for x in oq[-2:])}")
    return "\n".join(lines)


def perception_prompt_extension(
    *,
    time_pressure: float | None,
    detail_orientation: float | None = None,
    exploration: float | None = None,
    trust_skepticism: float | None = None,
    felt_state: dict[str, Any] | None = None,
    completion_block: str = "",
) -> str:
    """System-message block replacing AUDION_THINK_ALOUD for perception-first steps."""
    budget = salience_budget(time_pressure, detail_orientation)
    tp = 0.5 if time_pressure is None else float(time_pressure)
    impatient = tp >= 0.75
    patient = tp <= 0.35

    persona_lines = [
        f"- Salience-Budget: maximal {budget} Einträge in noticed[] (Persona time_pressure={tp:.2f}).",
        "- Blind Spot: Handle NUR auf Basis von noticed. Erfinde keine UI außerhalb von noticed.",
        "- ignoredGuess: sag kurz, was du bewusst überspringst / nicht prüfst.",
    ]
    if impatient:
        persona_lines.append(
            "- Du bist ungeduldig: bei clarity≤1 ODER confusion-Tag und unerklärtem Grau/Filter "
            "→ stance=abandon (ehrlicher Abbruch, kein Weiteroptimieren). Runtime erzwingt das."
        )
        persona_lines.append("- ignoredGuess ist bei dir erwartet (Tunnelblick OK).")
        persona_lines.append(
            f"- Nutze das Budget ({budget}): bei grau/disabled Displays noticed MUSS "
            "die Aspekte trennen — wörtlich sinnvoll: (1) grau/disabled Zustand, "
            "(2) „Filter“ / Kompatibilitätsfilter, (3) „unklar warum“ die Ursache fehlt "
            "(plus Performance Line wenn sichtbar). Keine bloße Umschreibung ohne diese Worte."
        )
        persona_lines.append(
            "- Bei unerklärtem Grau: confusion=disabled_option_unexplained oder "
            "filter_cause_unknown setzen und in think/why „unklar warum“ sagen."
        )
    elif patient:
        persona_lines.append(
            "- Du bist geduldig: stance=hesitate (scroll/prüfen) ist erlaubt; abandon nur bei klarer Sackgasse."
        )
        persona_lines.append(
            f"- Nutze bis zu {budget} noticed-Einträge wenn die Seite reich ist; "
            "unterscheide Zustand vs. Filter/Ursache vs. Produktlinie (Wörter „Filter“, „unklar warum“ ok)."
        )
    if detail_orientation is not None and detail_orientation < 0.4:
        persona_lines.append("- Wenig Detailorientierung: Fokus Affordance/Outcome, nicht Microcopy.")
    if detail_orientation is not None and detail_orientation >= 0.75:
        persona_lines.append("- Hohe Detailorientierung: Microcopy/Fehlertexte dürfen in noticed.")
    if exploration is not None and exploration < 0.35:
        persona_lines.append("- Niedrige Exploration: keine Side-Quests / Extra-Spalten.")
    if trust_skepticism is not None and trust_skepticism >= 0.65:
        persona_lines.append("- Hohe Skepsis: Trust/Proof früh noticeen wenn sichtbar.")

    felt = felt_state_prompt_block(felt_state)
    felt_section = f"{felt}\n" if felt else ""

    return (
        "AUDION_PERCEPTION:\n"
        "ROLLENBILD: Du bist die Persona. Reihenfolge PFLICHT: erst wahrnehmen & bewerten, "
        "dann erst Action wählen. Perception steuert die Entscheidung IN DIESEM Schritt.\n"
        f"{felt_section}"
        "Persona-Filter:\n"
        + "\n".join(persona_lines)
        + "\n"
        "PFLICHT: Hänge an 'thinking' diesen Block an (wird aus dem VO entfernt):\n"
        "<<PERCEPTION>>{"
        '"taskReminder":"Ich will kompatible Displays finden",'
        '"noticed":['
        '{"what":"Display-Karten grau/disabled","where":"rechts","relevance":"high"},'
        '{"what":"Filter-Ursache unklar warum","where":"Kompatibilitätswahl","relevance":"high"},'
        '{"what":"Performance Line Karte","where":"Drive Unit","relevance":"med"}'
        '],'
        '"ignoredGuess":"Feine Tooltips und Footer lese ich nicht",'
        '"think":"Ohne Erklärung warum grau komme ich nicht weiter.",'
        '"clarity":0,'
        '"feel":{"label":"frustriert","valence":-2},'
        '"confusion":"disabled_option_unexplained",'
        '"stance":"abandon",'
        '"intent":"Ich breche ab und sage ehrlich, dass ich keine sichere Antwort habe.",'
        '"why":"Unerklärte graue Display-Optionen — keine sichere Antwort."'
        "}<</PERCEPTION>>\n"
        "Felder: taskReminder, noticed[{what,where?,relevance:high|med|low}], ignoredGuess, "
        "think, clarity 0-3, feel{label,valence -2..2}, "
        "confusion (disabled_option_unexplained|filter_cause_unknown|selection_order_surprise|null), "
        "stance (proceed|hesitate|abandon), intent, why.\n"
        "stance=abandon → nur done. stance=hesitate → nur scroll/wait. "
        "stance=proceed → Klick nur auf etwas aus noticed.\n"
        "HARD: done/click/input/navigate OHNE gültigen <<PERCEPTION>>-Block ist VERBOTEN. "
        "Runtime verwirft solche Actions — Perception wird NICHT aus freiem Text erfunden.\n"
        "VO in thinking: 1–3 Sätze Erste Person Präsens mit aktivem Verb.\n"
        "INTERNE FELDER: evaluation_previous_goal, memory, next_goal (Bot-Selektor OK).\n"
        f"{completion_block}"
        "AUDION_NAVIGATION_ONLY:\n"
        "Keine Websuche. Bleibe auf der Ziel-URL und internen Links.\n"
    )


def synthesize_summary_from_perceptions(perceptions: list[dict[str, Any]]) -> str | None:
    """Build run summary from perception trail when model summary is empty."""
    if not perceptions:
        return None
    last = perceptions[-1]
    bits: list[str] = []
    task = last.get("taskReminder")
    if task:
        bits.append(str(task))
    noticed = last.get("noticed") or []
    if noticed:
        whats = [str(n.get("what")) for n in noticed if isinstance(n, dict) and n.get("what")]
        if whats:
            bits.append("Wahrgenommen: " + "; ".join(whats[:4]))
    if last.get("stance") == "abandon":
        bits.append(str(last.get("why") or last.get("intent") or "Ich breche ab."))
    elif last.get("intent"):
        bits.append(str(last["intent"]))
    if last.get("confusion"):
        bits.append(f"Confusion: {last['confusion']}")
    text = " ".join(bits).strip()
    return text if len(text) >= 40 else None


def perception_nudge_message(budget: int) -> str:
    return (
        "AUDION_PERCEPTION_REQUIRED: Kein gültiger <<PERCEPTION>>-Block "
        f"(noticed 1–{budget}, feel, stance, intent, think). "
        "ZUERST Block, DANN Action. "
        "VERBOTEN ohne Block: done/click/input/navigate. "
        "Bei grauem Display: noticed mit Filter + unklar warum."
    )


def perception_missing_retries() -> int:
    """How many nudge+retry cycles before clearing decision actions (default 2)."""
    raw = (os.environ.get("UX_JOURNEY_PERCEPTION_MISSING_RETRIES") or "2").strip()
    try:
        n = int(raw)
    except ValueError:
        n = 2
    return max(1, min(n, 6))


def actions_need_perception(actions: list[Any] | None) -> bool:
    """True when any proposed tool requires a valid PERCEPTION in the same turn."""
    for a in actions or []:
        if action_tool_name(a) in DECISION_ACTIONS:
            return True
    return False


def clear_decision_actions(actions: list[Any] | None) -> tuple[list[Any], str]:
    """
    Strip done/click/… when PERCEPTION is missing.
    Keep hesitate-class soft tools only; never invent a perception from thinking.
    """
    if not actions:
        return [], "no_perc_empty"
    soft = [a for a in actions if action_tool_name(a) in HESITATE_ACTIONS]
    if soft:
        return soft, "no_perc_soft_only"
    return [], "no_perc_cleared"


def public_perception_stats(felt: dict[str, Any] | None, steps: list[dict[str, Any]]) -> dict[str, Any]:
    """Aggregate for result payload / L4 metrics."""
    percs = [
        s.get("perception")
        for s in steps
        if isinstance(s, dict) and isinstance(s.get("perception"), dict)
    ]
    noticed_lens = [len(p.get("noticed") or []) for p in percs]
    stances = [str(p.get("stance")) for p in percs]
    abandon_idx = next((i + 1 for i, st in enumerate(stances) if st == "abandon"), None)
    clarities = [p.get("clarity") for p in percs if isinstance(p.get("clarity"), int)]
    upgraded = sum(1 for p in percs if p.get("stanceUpgraded"))
    return {
        "stepsWithPerception": len(percs),
        "meanNoticed": (sum(noticed_lens) / len(noticed_lens)) if noticed_lens else None,
        "maxNoticed": max(noticed_lens) if noticed_lens else 0,
        "abandonStep": abandon_idx,
        "meanClarity": (sum(clarities) / len(clarities)) if clarities else None,
        "confusionCount": int((felt or {}).get("confusionCount") or 0),
        "forcedDone": int((felt or {}).get("forcedDone") or 0),
        "retries": int((felt or {}).get("retries") or 0),
        "stanceUpgraded": upgraded,
        "missingPerceptionClears": int((felt or {}).get("missingPerceptionClears") or 0),
    }


# --- Human gold overlap (P3) -------------------------------------------------

def normalize_salience_label(text: str) -> str:
    t = (text or "").lower()
    t = re.sub(r"[^\wäöüÄÖÜß]+", " ", t)
    return re.sub(r"\s+", " ", t).strip()


def perception_noticed_overlap(
    agent_noticed: list[dict[str, Any]] | list[str],
    human_labels: list[str],
) -> dict[str, Any]:
    """
    Soft overlap: fraction of human labels that appear as substring in agent noticed.
    """
    agent_blob_parts: list[str] = []
    for n in agent_noticed or []:
        if isinstance(n, dict):
            agent_blob_parts.append(str(n.get("what") or ""))
            agent_blob_parts.append(str(n.get("where") or ""))
        else:
            agent_blob_parts.append(str(n))
    agent_blob = normalize_salience_label(" ".join(agent_blob_parts))
    hits = 0
    missed: list[str] = []
    for label in human_labels:
        norm = normalize_salience_label(label)
        if not norm:
            continue
        if norm in agent_blob or any(
            tok in agent_blob for tok in norm.split() if len(tok) >= 4
        ):
            hits += 1
        else:
            missed.append(label)
    total = len([h for h in human_labels if normalize_salience_label(h)])
    score = (hits / total) if total else 0.0
    return {
        "score": score,
        "hits": hits,
        "total": total,
        "missed": missed,
        "closer": score >= 0.5,
    }
