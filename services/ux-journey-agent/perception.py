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
            "- Du bist ungeduldig: bei clarity≤1 und unerklärtem Grau/Filter → stance=abandon "
            "(ehrlicher Abbruch, kein Weiteroptimieren)."
        )
        persona_lines.append("- ignoredGuess ist bei dir erwartet (Tunnelblick OK).")
    elif patient:
        persona_lines.append(
            "- Du bist geduldig: stance=hesitate (scroll/prüfen) ist erlaubt; abandon nur bei klarer Sackgasse."
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
        '"noticed":[{"what":"Display-Karten grau","where":"rechts","relevance":"high"}],'
        '"ignoredGuess":"Feine Tooltips lese ich nicht",'
        '"think":"Ohne Erklärung warum grau komme ich nicht weiter.",'
        '"clarity":0,'
        '"feel":{"label":"frustriert","valence":-2},'
        '"confusion":"disabled_option_unexplained",'
        '"stance":"abandon",'
        '"intent":"Ich breche ab und sage ehrlich, dass ich keine sichere Antwort habe.",'
        '"why":"Zwei unerklärte graue Optionen — lohnt sich nicht."'
        "}<</PERCEPTION>>\n"
        "Felder: taskReminder, noticed[{what,where?,relevance:high|med|low}], ignoredGuess, "
        "think, clarity 0-3, feel{label,valence -2..2}, "
        "confusion (disabled_option_unexplained|filter_cause_unknown|selection_order_surprise|null), "
        "stance (proceed|hesitate|abandon), intent, why.\n"
        "stance=abandon → nur done. stance=hesitate → nur scroll/wait. "
        "stance=proceed → Klick nur auf etwas aus noticed.\n"
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
        "AUDION_PERCEPTION_REQUIRED: Dein letzter Output hatte keinen gültigen "
        f"<<PERCEPTION>>-Block (noticed 1–{budget}, feel, stance, intent, think). "
        "Wiederhole den Step: ZUERST Perception, DANN Action. "
        "Ohne Perception keine Klicks."
    )


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
    return {
        "stepsWithPerception": len(percs),
        "meanNoticed": (sum(noticed_lens) / len(noticed_lens)) if noticed_lens else None,
        "maxNoticed": max(noticed_lens) if noticed_lens else 0,
        "abandonStep": abandon_idx,
        "meanClarity": (sum(clarities) / len(clarities)) if clarities else None,
        "confusionCount": int((felt or {}).get("confusionCount") or 0),
        "forcedDone": int((felt or {}).get("forcedDone") or 0),
        "retries": int((felt or {}).get("retries") or 0),
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
