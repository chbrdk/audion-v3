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


def action_text_blob(action: Any) -> str:
    """Best-effort lowercase JSON/text blob for action target matching."""
    if action is None:
        return ""
    if hasattr(action, "model_dump"):
        try:
            return json.dumps(action.model_dump(exclude_none=True), ensure_ascii=False).lower()
        except Exception:
            return str(action).lower()
    if isinstance(action, dict):
        try:
            return json.dumps(action, ensure_ascii=False).lower()
        except Exception:
            return str(action).lower()
    return str(action).lower()


def _actions_matching_keywords(
    actions: list[Any],
    keywords: list[str] | tuple[str, ...],
    *,
    tool_names: tuple[str, ...] = (
        "click",
        "hover",
        "input",
        "type",
        "select_dropdown",
        "navigate",
    ),
) -> list[Any]:
    want = [str(k).lower() for k in keywords if str(k).strip()]
    if not actions or not want:
        return []
    out: list[Any] = []
    for action in actions:
        if action_tool_name(action) not in tool_names:
            continue
        blob = action_text_blob(action)
        if any(k in blob for k in want):
            out.append(action)
    return out


def _selector_map_items(browser_state_summary: Any) -> list[tuple[int, Any]]:
    try:
        dom = (
            browser_state_summary.get("dom_state")
            if isinstance(browser_state_summary, dict)
            else getattr(browser_state_summary, "dom_state", None)
        ) or (
            browser_state_summary.get("domState")
            if isinstance(browser_state_summary, dict)
            else getattr(browser_state_summary, "domState", None)
        )
        selector_map = (
            dom.get("selector_map")
            if isinstance(dom, dict)
            else getattr(dom, "selector_map", None)
        )
        if isinstance(selector_map, dict):
            return [(int(k), v) for k, v in selector_map.items()]
    except Exception:
        pass
    return []


def _node_attr(node: Any, key: str) -> str:
    attrs = node.get("attributes") if isinstance(node, dict) else getattr(node, "attributes", None)
    if isinstance(attrs, dict):
        return str(attrs.get(key) or "")
    return ""


def _node_visible(node: Any) -> bool:
    val = node.get("is_visible") if isinstance(node, dict) else getattr(node, "is_visible", None)
    return val is not False


def _node_bounds(node: Any) -> tuple[float, float, float, float] | None:
    """
    Prefer ``absolute_position`` (frame-offset CSS viewport coords used by
    upstream click/highlight). Fall back to snapshot bounds / dict fixtures.
    """
    candidates: list[Any] = []
    if isinstance(node, dict):
        candidates.extend(
            [
                node.get("absolute_position"),
                node.get("bounds"),
                (node.get("snapshot_node") or {}).get("clientRects")
                if isinstance(node.get("snapshot_node"), dict)
                else None,
                (node.get("snapshot_node") or {}).get("bounds")
                if isinstance(node.get("snapshot_node"), dict)
                else None,
            ]
        )
    else:
        candidates.extend(
            [
                getattr(node, "absolute_position", None),
                getattr(node, "bounds", None),
            ]
        )
        snap = getattr(node, "snapshot_node", None)
        if snap is not None:
            candidates.extend(
                [
                    getattr(snap, "clientRects", None),
                    getattr(snap, "bounds", None),
                ]
            )
    for bounds in candidates:
        if bounds is None:
            continue
        if isinstance(bounds, dict):
            x = bounds.get("x")
            y = bounds.get("y")
            w = bounds.get("width")
            h = bounds.get("height")
        else:
            x = getattr(bounds, "x", None)
            y = getattr(bounds, "y", None)
            w = getattr(bounds, "width", None)
            h = getattr(bounds, "height", None)
        if all(isinstance(v, (int, float)) for v in (x, y, w, h)):
            return float(x), float(y), float(w), float(h)
    return None


def _node_text_blob(node: Any) -> str:
    parts: list[str] = []
    if isinstance(node, dict):
        for key in ("node_name", "node_value"):
            parts.append(str(node.get(key) or ""))
        ax = node.get("ax_node") or {}
        if isinstance(ax, dict):
            parts.extend([str(ax.get("name") or ""), str(ax.get("role") or "")])
    else:
        parts.extend([str(getattr(node, "node_name", "") or ""), str(getattr(node, "node_value", "") or "")])
        ax = getattr(node, "ax_node", None)
        if ax is not None:
            parts.extend([str(getattr(ax, "name", "") or ""), str(getattr(ax, "role", "") or "")])
        for meth in ("get_all_children_text", "get_meaningful_text_for_llm"):
            fn = getattr(node, meth, None)
            if callable(fn):
                try:
                    parts.append(str(fn() or ""))
                except Exception:
                    pass
    for k in ("href", "title", "aria-label", "aria-controls", "aria-expanded"):
        parts.append(_node_attr(node, k))
    return " ".join(p for p in parts if p).lower()


def _task_nav_open_keywords(task: str | None) -> list[str]:
    """Opener keywords that appear in the task (path toward the goal)."""
    t = str(task or "").lower()
    keys: list[str] = []
    for tok in (
        "service",
        "beratung",
        "support",
        "hilfe",
        "menu",
        "menü",
        "navigation",
        "produkte",
        "products",
        "modelle",
        "models",
    ):
        if tok in t and tok not in keys:
            keys.append(tok)
    return keys


def _task_target_keywords(task: str | None) -> list[str]:
    """Destination keywords present in the task only — no fixture defaults."""
    t = str(task or "").lower()
    keys: list[str] = []
    for tok in (
        "produktkombination",
        "kompatibil",
        "konfigurator",
        "probefahrt",
        "händlerfinder",
        "haendlerfinder",
        "dealer",
        "preislisten",
        "testfahrt",
    ):
        if tok in t and tok not in keys:
            keys.append(tok)
    for m in re.finditer(r"([a-zäöü0-9][a-zäöü0-9-]{4,})-(?:tool|seite|page)", t):
        stem = m.group(1)
        if stem not in keys:
            keys.append(stem)
    return keys


def is_ui_path_finding_task(task: str | None) -> bool:
    """
    True when the persona must reach a destination via UI path-finding
    (home / find-the-way / not opening the tool directly).
    """
    if not task:
        return False
    t = str(task).lower()
    path_cues = (
        "startseite",
        "home page",
        "start page",
        "starte auf",
        "finde den weg",
        "find the way",
        "nicht direkt",
        "nicht direkt im tool",
        "via navigation",
        "über die navigation",
        "from the home",
        "from home",
    )
    if not any(c in t for c in path_cues):
        return False
    if _task_target_keywords(task):
        return True
    return any(c in t for c in ("finde", "find ", "suche", "reach", "lande", "landest"))


def is_nav_h3_task(task: str | None) -> bool:
    """Backward-compatible alias for Persona Lab Nav fixtures."""
    return is_ui_path_finding_task(task)


def path_target_reached(current_url: str | None, task: str | None) -> bool:
    """True when the observed URL already encodes the task destination keywords."""
    keys = _task_target_keywords(task)
    if keys:
        return _url_contains_any(current_url, keys)
    return "produktkombinationen" in str(current_url or "").lower()


def detect_path_finding_deeplink_cheat(
    steps: list[dict[str, Any]] | None,
    *,
    task: str | None,
    start_url: str | None = None,
) -> bool | None:
    """
    True when a path-finding run recorded navigate/go_to_url straight to the
    destination. False when path-finding and no such shortcut. None otherwise.
    """
    if not is_ui_path_finding_task(task):
        return None
    keys = _task_target_keywords(task)
    if not keys:
        return False
    start_norm = str(start_url or "").rstrip("/").lower()
    for step in steps or []:
        if not isinstance(step, dict):
            continue
        action = str(step.get("action") or "").strip().lower()
        if action not in ("navigate", "go_to_url", "open_tab"):
            continue
        target = str(step.get("target") or step.get("url") or step.get("result") or "").strip()
        target_norm = target.rstrip("/").lower()
        # Initial home load is allowed even when the blob mentions the task target.
        if start_norm and target_norm and (
            target_norm == start_norm or target_norm.startswith(start_norm + "?")
        ):
            continue
        blob = " ".join(
            str(step.get(k) or "") for k in ("target", "result", "url", "reasoning")
        ).lower()
        if any(k in blob for k in keys):
            return True
    return False


def _is_rootish_href(href: str) -> bool:
    h = (href or "").strip().lower().rstrip("/")
    if h in ("", "/", "#"):
        return True
    if re.fullmatch(r"https?://[^/]+", h):
        return True
    if re.fullmatch(r"https?://[^/]+/[a-z]{2}", h):
        return True
    if re.fullmatch(r"/[a-z]{2}", h):
        return True
    return False


def _url_contains_any(url: str | None, keys: list[str]) -> bool:
    blob = str(url or "").lower()
    return bool(keys) and any(k in blob for k in keys)


def _coords_too_close(
    a: tuple[Any, Any] | None,
    b: tuple[Any, Any] | None,
    *,
    tol: int = 48,
) -> bool:
    if not a or not b:
        return False
    try:
        ax, ay = float(a[0]), float(a[1])
        bx, by = float(b[0]), float(b[1])
    except (TypeError, ValueError):
        return False
    return abs(ax - bx) <= tol and abs(ay - by) <= tol


def _coord_xy(action: dict[str, Any] | None) -> tuple[int, int] | None:
    if not action:
        return None
    x, y = action.get("coordinate_x"), action.get("coordinate_y")
    if isinstance(x, (int, float)) and isinstance(y, (int, float)):
        return int(x), int(y)
    return None


def _coordinate_click_for_label(
    rect: tuple[float, float, float, float],
    blob: str,
    needles: list[str],
    *,
    ordinal_bias: float = 0.5,
) -> dict[str, Any]:
    """
    Click inside a wide aggregated nav node near the matching label.

    Omit ``index`` so runtime uses coordinate clicking. Index+coords still
    resolves to the whole aggregated link and fails to open the submenu.

    For multi-item top bars, prefer ordinal position among known LTR nav
    labels — character offsets in concatenated AX text under-estimate how
    far right later items sit visually.

    ``ordinal_bias`` (0–1 within the label cell) shifts the click inside the
    matched tab — use >0.5 after a missed opener so Service is hit further right.
    """
    bx, by, bw, bh = rect
    frac = 0.5
    bias = max(0.15, min(0.85, float(ordinal_bias)))
    nav_labels = (
        "produkte",
        "product",
        "ebikes",
        "models",
        "modelle",
        "service",
        "beratung",
        "magazin",
        "magazine",
        "business",
        "über uns",
        "about",
        "support",
        "hilfe",
    )
    synonym_skip = {
        "beratung": "service",
        "product": "produkte",
        "magazine": "magazin",
        "about": "über uns",
        "models": "modelle",
    }
    hits: list[tuple[int, str]] = []
    for lab in nav_labels:
        pos = blob.find(lab)
        if pos >= 0:
            hits.append((pos, lab))
    hits.sort(key=lambda item: item[0])
    present: list[str] = []
    for _pos, lab in hits:
        skip_if = synonym_skip.get(lab)
        if skip_if and skip_if in present:
            continue
        if lab in present:
            continue
        present.append(lab)
        if len(present) >= 7:
            break
    target_idx: int | None = None
    for needle in needles:
        for i, lab in enumerate(present):
            if needle in lab or lab in needle:
                target_idx = i
                break
        if target_idx is not None:
            break
    if target_idx is not None and present:
        frac = (float(target_idx) + bias) / float(len(present))
    else:
        for needle in needles:
            pos = blob.find(needle)
            if pos >= 0 and len(blob) > 0:
                frac = (pos + (len(needle) / 2.0)) / float(len(blob))
                break
    frac = max(0.08, min(0.92, frac))
    # Cap absolute X so wide/full-bleed AX strips don't click past the viewport.
    # Mega-nav nodes often report bw ≫ visible chrome; ordinal frac then lands off-screen.
    eff_bw = min(float(bw), 1100.0)
    eff_bx = float(bx)
    if bw > 1100:
        # Keep the strip anchored near typical LTR header chrome.
        eff_bx = max(40.0, float(bx))
    x = int(round(eff_bx + (eff_bw * frac)))
    y = int(round(by + (bh * 0.5)))
    x = max(24, min(x, 1280))
    y = max(8, min(y, 160))
    return {
        "tool": "click",
        "coordinate_x": x,
        "coordinate_y": y,
    }


def _is_menu_open_phase(prior_nav_reason: str | None) -> bool:
    """True after an opener steer while still hunting the destination on home."""
    reason = str(prior_nav_reason or "")
    return reason.startswith("nav_dom_service") or reason in (
        "path_open_menu",
        "path_open_hover",
        "nav_dom_menu_wait",
        "nav_dom_menu_hover",
    )


def build_nav_menu_hover_evaluate(open_keys: list[str]) -> dict[str, Any] | None:
    """
    Site-agnostic hover-equivalent via ``evaluate`` (0.13.x has no hover tool).

    Dispatches mouseover/mouseenter/pointerover on the first top-chrome control
    whose visible text or href matches a task opener keyword.
    """
    keys = [str(k).strip().lower() for k in (open_keys or []) if str(k).strip()]
    if not keys:
        return None
    keys_js = json.dumps(keys, ensure_ascii=True)
    code = (
        "(function(){try{"
        f"const keys={keys_js};"
        "const match=t=>keys.some(k=>t.includes(k));"
        "const nodes=Array.from(document.querySelectorAll("
        "'a,button,nav a,header a,[role=menuitem],[role=link],[role=button],"
        "[class*=nav] a,[class*=menu] a,[class*=Menu] a'));"
        "let best=null; let bestScore=-1e9;"
        "for(const el of nodes){"
        "const href=String(el.getAttribute('href')||'').toLowerCase();"
        "const t=((el.innerText||el.textContent||'')+' '+"
        "(el.getAttribute('aria-label')||'')+' '+(el.getAttribute('title')||'')+' '+href)"
        ".toLowerCase().replace(/\\s+/g,' ').trim();"
        "if(!match(t)) continue;"
        # Prefer compact labels (Service & Beratung) over the whole nav strip.
        "if(t.length>56) continue;"
        "if((t.match(/produkte|ebikes|magazin|business|über uns/g)||[]).length>=2) continue;"
        "const r=el.getBoundingClientRect();"
        "if(r.width<8||r.height<8||r.bottom<0||r.top>420) continue;"
        "let score=0;"
        "if(r.top<=160) score+=50; else if(r.top<=280) score+=20;"
        "if(href && href!=='/' && !/^\\/[a-z]{2}\\/?$/.test(href)) score+=25;"
        "if(t.length<=40) score+=20; else if(t.length<=56) score+=8;"
        "if(keys.some(k=>t===k||t.startsWith(k+' ')||t.includes('& '+k)||t.includes(k+' &'))) score+=30;"
        "if(score>bestScore){bestScore=score; best=el;}"
        "}"
        "if(!best){"
        "const all=Array.from(document.querySelectorAll('a,button,[role=menuitem],[role=link]'));"
        "for(const el of all){"
        "const t=String(el.innerText||el.textContent||'').toLowerCase().replace(/\\s+/g,' ').trim();"
        "if(t.length<4||t.length>56||!match(t)) continue;"
        "if((t.match(/produkte|ebikes|magazin|business/g)||[]).length>=2) continue;"
        "const r=el.getBoundingClientRect();"
        "if(r.width<8||r.height<8||r.top>420||r.top<0) continue;"
        "best=el; break;"
        "}"
        "}"
        "if(!best) return 'nav_hover:no_opener';"
        "const r=best.getBoundingClientRect();"
        "const x=r.left+r.width*0.55; const y=r.top+r.height*0.5;"
        "const opts={bubbles:true,cancelable:true,view:window,clientX:x,clientY:y};"
        "best.dispatchEvent(new PointerEvent('pointermove',opts));"
        "best.dispatchEvent(new MouseEvent('mousemove',opts));"
        "best.dispatchEvent(new MouseEvent('mouseover',opts));"
        "best.dispatchEvent(new MouseEvent('mouseenter',opts));"
        "try{best.dispatchEvent(new PointerEvent('pointerover',opts));}catch(_e){}"
        "try{best.focus({preventScroll:true});}catch(_e2){}"
        "return 'nav_hover:'+String(best.innerText||best.textContent||'').trim().slice(0,48);"
        "}catch(e){return 'nav_hover:err:'+e.message}}())"
    )
    return {"tool": "evaluate", "code": code}


def build_nav_target_click_evaluate(target_keys: list[str]) -> dict[str, Any] | None:
    """
    Click an on-page destination link whose href/text matches task target keywords.

    Walks light DOM + open shadow roots. This is still UI path-finding (follow a
    real page link) — not ``navigate``/``go_to_url`` deeplink injection.
    """
    keys = [str(k).strip().lower() for k in (target_keys or []) if str(k).strip()]
    if not keys:
        return None
    keys_js = json.dumps(keys, ensure_ascii=True)
    code = (
        "(function(){try{"
        f"const keys={keys_js};"
        "const match=t=>keys.some(k=>t.includes(k));"
        "function* anchors(root){"
        "for(const a of root.querySelectorAll('a[href]')) yield a;"
        "for(const el of root.querySelectorAll('*')){"
        "if(el.shadowRoot) yield* anchors(el.shadowRoot);"
        "}"
        "}"
        "let best=null; let bestScore=-1e9;"
        "for(const el of anchors(document)){"
        "const href=String(el.getAttribute('href')||el.href||'').toLowerCase();"
        "const t=((el.innerText||el.textContent||'')+' '+"
        "(el.getAttribute('aria-label')||'')+' '+href)"
        ".toLowerCase().replace(/\\s+/g,' ').trim();"
        "if(!match(href) && !match(t)) continue;"
        "if(href==='/' || /^\\/[a-z]{2}\\/?$/.test(href)) continue;"
        "let score=0;"
        "if(match(href)) score+=80;"
        "if(match(t)) score+=40;"
        "const r=el.getBoundingClientRect();"
        "if(r.width>=4 && r.height>=4 && r.top>=0 && r.top<=900) score+=25;"
        "if(score>bestScore){bestScore=score; best=el;}"
        "}"
        "if(!best) return 'nav_target:no_link';"
        "best.click();"
        "return 'nav_target:'+String(best.getAttribute('href')||best.href||'').slice(0,120);"
        "}catch(e){return 'nav_target:err:'+e.message}}())"
    )
    return {"tool": "evaluate", "code": code}


def build_nav_hub_click_evaluate(open_keys: list[str]) -> dict[str, Any] | None:
    """
    Click a non-rootish opener hub link (e.g. ``/…/service/…``) from the live DOM.
    """
    keys = [str(k).strip().lower() for k in (open_keys or []) if str(k).strip()]
    if not keys:
        return None
    keys_js = json.dumps(keys, ensure_ascii=True)
    code = (
        "(function(){try{"
        f"const keys={keys_js};"
        "const match=t=>keys.some(k=>t.includes(k));"
        "function* anchors(root){"
        "for(const a of root.querySelectorAll('a[href]')) yield a;"
        "for(const el of root.querySelectorAll('*')){"
        "if(el.shadowRoot) yield* anchors(el.shadowRoot);"
        "}"
        "}"
        "let best=null; let bestScore=-1e9;"
        "for(const el of anchors(document)){"
        "const href=String(el.getAttribute('href')||el.href||'').toLowerCase();"
        "if(!href || href==='/' || /^\\/[a-z]{2}\\/?$/.test(href)) continue;"
        "if(!keys.some(k=>href.includes(k))) continue;"
        # Prefer compact hub paths (/service/, /service/ebike-beratung) over deep tools.
        "const depth=(href.match(/\\//g)||[]).length;"
        "const t=((el.innerText||el.textContent||'')+' '+"
        "(el.getAttribute('aria-label')||'')).toLowerCase().replace(/\\s+/g,' ').trim();"
        "let score=40;"
        "if(match(t) && t.length<=48) score+=30;"
        "if(depth<=4) score+=20;"
        "const r=el.getBoundingClientRect();"
        "if(r.width>=4 && r.height>=4 && r.top>=0 && r.top<=420) score+=25;"
        "if(score>bestScore){bestScore=score; best=el;}"
        "}"
        "if(!best) return 'nav_hub:no_link';"
        "best.click();"
        "return 'nav_hub:'+String(best.getAttribute('href')||best.href||'').slice(0,120);"
        "}catch(e){return 'nav_hub:err:'+e.message}}())"
    )
    return {"tool": "evaluate", "code": code}


def build_nav_opener_click_evaluate(
    open_keys: list[str],
    *,
    point: tuple[float, float] | None = None,
) -> dict[str, Any] | None:
    """
    Site-agnostic opener activation via ``evaluate`` click on the best
    top-chrome control matching task opener keywords (leaf labels only).

    Optional ``point`` falls back to ``elementFromPoint`` when text scan misses
    (common with shadow/mega-menu chrome).
    """
    keys = [str(k).strip().lower() for k in (open_keys or []) if str(k).strip()]
    if not keys:
        return None
    keys_js = json.dumps(keys, ensure_ascii=True)
    point_js = (
        f"[{float(point[0])},{float(point[1])}]"
        if point is not None
        else "null"
    )
    code = (
        "(function(){try{"
        f"const keys={keys_js};"
        f"const point={point_js};"
        "const match=t=>keys.some(k=>t.includes(k));"
        "const nodes=Array.from(document.querySelectorAll("
        "'a,button,nav a,header a,[role=menuitem],[role=link],[role=button],"
        "[class*=nav] a,[class*=menu] a,[class*=Menu] a'));"
        "let best=null; let bestScore=-1e9;"
        "for(const el of nodes){"
        "const href=String(el.getAttribute('href')||'').toLowerCase();"
        "const t=((el.innerText||el.textContent||'')+' '+"
        "(el.getAttribute('aria-label')||'')+' '+(el.getAttribute('title')||'')+' '+href)"
        ".toLowerCase().replace(/\\s+/g,' ').trim();"
        "if(!match(t)) continue;"
        "if(t.length>96) continue;"
        "if((t.match(/produkte|ebikes|magazin|business|über uns/g)||[]).length>=3) continue;"
        "const r=el.getBoundingClientRect();"
        "if(r.width<8||r.height<8||r.bottom<0||r.top>520) continue;"
        "let score=0;"
        "if(r.top<=160) score+=50; else if(r.top<=280) score+=20;"
        "if(href && href!=='/' && !/^\\/[a-z]{2}\\/?$/.test(href)) score+=25;"
        "if(t.length<=48) score+=20; else if(t.length<=96) score+=8;"
        "if(keys.some(k=>t===k||t.startsWith(k+' ')||t.includes('& '+k)||t.includes(k+' &'))) score+=30;"
        "if(score>bestScore){bestScore=score; best=el;}"
        "}"
        "if(!best && point){"
        "const hit=document.elementFromPoint(point[0], point[1]);"
        "if(hit){"
        "const el=hit.closest('a,button,[role=menuitem],[role=link],[role=button]')||hit;"
        "const href=String(el.getAttribute && el.getAttribute('href')||el.href||'').toLowerCase();"
        "const t=String(el.innerText||el.textContent||el.getAttribute && el.getAttribute('aria-label')||'')"
        ".toLowerCase().replace(/\\s+/g,' ').trim();"
        "if(match(t) || keys.some(k=>href.includes(k))) best=el;"
        "}"
        "}"
        "if(!best){"
        # Last resort: navigate via a non-rootish hub href containing an opener key.
        "for(const el of nodes){"
        "const href=String(el.getAttribute('href')||'').toLowerCase();"
        "if(!href || href==='/' || /^\\/[a-z]{2}\\/?$/.test(href)) continue;"
        "if(!keys.some(k=>href.includes(k))) continue;"
        "const r=el.getBoundingClientRect();"
        "if(r.width<8||r.height<8||r.top>520) continue;"
        "best=el; break;"
        "}"
        "}"
        "if(!best) return 'nav_click:no_opener';"
        "const hrefOut=String(best.getAttribute('href')||best.href||'');"
        "best.click();"
        "return 'nav_click:'+String(best.innerText||best.textContent||hrefOut||'').trim().slice(0,64);"
        "}catch(e){return 'nav_click:err:'+e.message}}())"
    )
    return {"tool": "evaluate", "code": code}


def _nav_open_candidate_score(
    rect: tuple[float, float, float, float],
    blob: str,
    menuish: int,
) -> float:
    """
    Prefer top chrome / compact nav bars over mid-page content that happens
    to mention the same labels (hero, footer, sitemap dumps).
    """
    _bx, by, bw, bh = rect
    score = float(menuish) * 5.0
    if by <= 140:
        score += 50.0
    elif by <= 220:
        score += 20.0
    else:
        score -= 40.0
    if bh <= 80:
        score += 30.0
    elif bh <= 120:
        score += 15.0
    else:
        score -= 25.0
    if bw >= 400:
        score += 10.0
    blob_len = len(blob or "")
    if blob_len and blob_len < 220:
        score += 15.0
    elif blob_len > 800:
        score -= 25.0
    return score


def select_cookie_banner_action(
    browser_state_summary: Any,
    *,
    current_url: str | None = None,
    perception: dict[str, Any] | None = None,
) -> tuple[dict[str, Any] | None, str]:
    """
    Prefer an explicit cookie/consent dismiss click when a blocker is visible.
    """
    blob = " ".join(
        bit
        for bit in (str(current_url or ""), perception_text_blob(perception))
        if bit
    ).lower()
    cookieish = any(tok in blob for tok in ("cookie", "consent", "banner", "ablehnen"))
    exact_reject_idx: int | None = None
    generic_reject_idx: int | None = None
    for idx, node in _selector_map_items(browser_state_summary):
        if not _node_visible(node):
            continue
        node_blob = _node_text_blob(node)
        if not node_blob:
            continue
        if "alles ablehnen" in node_blob:
            exact_reject_idx = idx
            break
        if any(tok in node_blob for tok in ("ablehnen", "reject", "consent")):
            generic_reject_idx = idx
    if exact_reject_idx is not None:
        return {"tool": "click", "index": exact_reject_idx}, "cookie_dom_reject"
    if cookieish and generic_reject_idx is not None:
        return {"tool": "click", "index": generic_reject_idx}, "cookie_dom_reject"
    return None, "cookie_dom_none"


def select_nav_dom_action(
    browser_state_summary: Any,
    *,
    current_url: str | None,
    task: str | None,
    exploratory_attempts: int = 0,
    max_nav_attempts: int = 4,
    start_url: str | None = None,
    avoid_coordinates: list[tuple[int, int]] | None = None,
    prior_nav_reason: str | None = None,
    menu_wait_used: bool = False,
    menu_hover_used: bool = False,
    menu_click_used: bool = False,
    target_click_used: bool = False,
) -> tuple[dict[str, Any] | None, str]:
    """
    Deterministically steer brittle home→destination nav using visible DOM nodes.

    Site-agnostic: keywords from the task; no domain allowlist. Uses ``evaluate``
    mouseover as hover-equivalent (0.13.x has no hover tool).

    Two-phase: after opener hover/click/wait while still on home, prefer
    target/submenu clicks and shifted opener coords (mega-menu second hop).
    """
    if not is_ui_path_finding_task(task):
        return None, "nav_dom_skip_task"
    cur = str(current_url or "").lower()
    target_keys = _task_target_keywords(task)
    if _url_contains_any(cur, target_keys):
        return None, "nav_dom_skip_url"
    if exploratory_attempts >= max_nav_attempts:
        return None, "nav_dom_budget_spent"

    open_keys = _task_nav_open_keywords(task)
    if not open_keys and not target_keys:
        return None, "nav_dom_no_keywords"

    menu_phase = _is_menu_open_phase(prior_nav_reason)
    # After a missed Service click, bias slightly into the label cell — not past it.
    ordinal_bias = 0.58 if menu_phase else 0.5

    avoid = list(avoid_coordinates or [])
    target_idx: int | None = None
    hidden_target_idx: int | None = None
    submenu_target_idx: int | None = None
    opener_click_idx: int | None = None
    opener_click_score = float("-inf")
    best_coord: dict[str, Any] | None = None
    best_coord_score = float("-inf")
    text_opener_idx: int | None = None
    text_opener_len = 10**9
    strip_coord: dict[str, Any] | None = None
    strip_score = float("-inf")
    alt_strip: dict[str, Any] | None = None
    menu_expanded = False

    def _accept_coord(action: dict[str, Any] | None) -> bool:
        xy = _coord_xy(action)
        if xy is None:
            return False
        return not any(_coords_too_close(xy, prev) for prev in avoid)

    for idx, node in _selector_map_items(browser_state_summary):
        href = _node_attr(node, "href").lower()
        blob = _node_text_blob(node)
        visible = _node_visible(node)
        expanded = _node_attr(node, "aria-expanded").lower()
        if expanded in ("true", "1"):
            menu_expanded = True
        # Destination hrefs win even when mega-menu AX marks them not visible.
        if target_keys and any(k in href or k in blob for k in target_keys):
            if href and not _is_rootish_href(href):
                if visible:
                    target_idx = idx
                    break
                if hidden_target_idx is None:
                    hidden_target_idx = idx
            elif visible and target_idx is None and blob:
                target_idx = idx
            continue
        if not visible:
            continue
        if not blob:
            continue
        # Soft target stems (e.g. "produktkombinationen" partial in submenu labels)
        if target_keys and href and not _is_rootish_href(href):
            soft = any(
                stem[:8] in blob or stem[:8] in href
                for stem in target_keys
                if len(stem) >= 8
            )
            if soft and submenu_target_idx is None:
                submenu_target_idx = idx
        if open_keys and not any(k in blob for k in open_keys):
            continue
        menuish = sum(
            1
            for tok in (
                "produkte",
                "product",
                "ebikes",
                "models",
                "modelle",
                "service",
                "beratung",
                "magazin",
                "magazine",
                "business",
                "über uns",
                "about",
            )
            if tok in blob
        )
        # Never treat root/home hrefs as the Service opener (logo /de/ loops).
        if (
            open_keys
            and not _is_rootish_href(href)
            and len(blob) < text_opener_len
            and len(blob) <= 120
        ):
            text_opener_len = len(blob)
            text_opener_idx = idx
        rect = _node_bounds(node)
        if rect is not None:
            bx, by, bw, bh = rect
            top_chrome = by <= 180 and bh <= 120 and (by + bh) <= 220
            if top_chrome:
                score = _nav_open_candidate_score(rect, blob, menuish)
                coord_eligible = (menuish >= 3) or (menuish >= 2 and bw >= 240 and bh <= 120)
                if open_keys and coord_eligible:
                    cand = _coordinate_click_for_label(
                        rect, blob, open_keys, ordinal_bias=ordinal_bias
                    )
                    if _accept_coord(cand) and score > best_coord_score:
                        best_coord_score = score
                        best_coord = cand
                discrete = False
                if href and not _is_rootish_href(href):
                    discrete = bw < 420 and bh <= 100
                elif (not href or href.startswith("#")) and bw < 400 and bh <= 80:
                    # Mega-menu buttons often have # / empty href — still clickable.
                    discrete = True
                if discrete and score > opener_click_score:
                    opener_click_score = score
                    opener_click_idx = idx
            elif open_keys and menuish >= 3 and bw >= 400:
                score = float(menuish) * 5.0 + (10.0 if bw >= 800 else 0.0)
                if by <= 280:
                    score += 5.0
                cand = _coordinate_click_for_label(
                    (bx, 36.0, max(bw, 800.0), 48.0),
                    blob,
                    open_keys,
                    ordinal_bias=ordinal_bias,
                )
                if _accept_coord(cand) and score > strip_score:
                    strip_score = score
                    strip_coord = cand
                elif not _accept_coord(cand) and score >= strip_score:
                    nudged = dict(cand)
                    shift = max(100.0, max(bw, 800.0) * 0.14) if menu_phase else max(
                        80.0, max(bw, 800.0) * 0.12
                    )
                    nudged["coordinate_x"] = int(
                        min(
                            bx + max(bw, 800.0) * 0.92,
                            float(cand["coordinate_x"]) + shift,
                        )
                    )
                    if _accept_coord(nudged):
                        alt_strip = nudged
        elif open_keys and menuish >= 3:
            score = float(menuish) * 5.0
            cand = _coordinate_click_for_label(
                (0.0, 36.0, 1400.0, 48.0),
                blob,
                open_keys,
                ordinal_bias=ordinal_bias,
            )
            if _accept_coord(cand) and score > strip_score:
                strip_score = score
                strip_coord = cand
            elif not _accept_coord(cand):
                nudged = dict(cand)
                nudged["coordinate_x"] = int(
                    min(1288, float(cand["coordinate_x"]) + (160 if menu_phase else 120))
                )
                if _accept_coord(nudged):
                    alt_strip = nudged
        elif href and not _is_rootish_href(href):
            if opener_click_idx is None:
                opener_click_idx = idx

    if target_idx is not None:
        return {"tool": "click", "index": target_idx}, "nav_dom_product_index"
    if hidden_target_idx is not None:
        return {"tool": "click", "index": hidden_target_idx}, "nav_dom_product_index"
    if submenu_target_idx is not None:
        return {"tool": "click", "index": submenu_target_idx}, "nav_dom_product_index"

    # Open mega-menus before the first blind opener click — once per run.
    # Prefer CDP pointer move via attached coords (CSS :hover); evaluate is fallback.
    # Always emit a hover before any LLM click while still on the path-home surface.
    if open_keys and not menu_hover_used and not menu_phase and not menu_expanded:
        coord_src = best_coord or strip_coord
        if coord_src is None and opener_click_idx is not None:
            for idx, node in _selector_map_items(browser_state_summary):
                if idx != opener_click_idx:
                    continue
                rect = _node_bounds(node)
                if rect is None:
                    break
                bx, by, bw, bh = rect
                coord_src = {
                    "coordinate_x": int(round(bx + bw * 0.55)),
                    "coordinate_y": int(round(by + bh * 0.5)),
                }
                break
        if coord_src is None:
            coord_src = _synthetic_top_opener_coord(open_keys)
        if coord_src is not None:
            return {
                "tool": "wait",
                "seconds": 2,
                "coordinate_x": coord_src.get("coordinate_x"),
                "coordinate_y": coord_src.get("coordinate_y"),
            }, "nav_dom_menu_hover"
        hover_action = build_nav_menu_hover_evaluate(open_keys)
        if hover_action is not None:
            return hover_action, "nav_dom_menu_hover"

    # Mega-menu may need a paint frame after hover/opener before submenu AX appears.
    if menu_phase and not menu_wait_used and not menu_expanded and target_idx is None:
        return {"tool": "wait", "seconds": 2}, "nav_dom_menu_wait"

    # Follow an on-page destination link (often already in HTML / shadow tree).
    # Prefer after hover+wait so mega-menus can paint; still ok if hover missed.
    if target_keys and not target_click_used and (menu_hover_used or menu_phase or menu_click_used):
        target_eval = build_nav_target_click_evaluate(target_keys)
        if target_eval is not None:
            return target_eval, "nav_dom_target_evaluate"

    # After hover+wait: hub index, hub evaluate (/…/service/…), then CDP/coords.
    if open_keys and (menu_hover_used or menu_phase) and not menu_click_used:
        hub_idx: int | None = None
        hub_score = float("-inf")
        for idx, node in _selector_map_items(browser_state_summary):
            if not _node_visible(node):
                continue
            href = _node_attr(node, "href").lower()
            if not href or _is_rootish_href(href):
                continue
            blob = _node_text_blob(node)
            if not any(k in blob or k in href for k in open_keys):
                continue
            score = 20.0 if any(k in href for k in open_keys) else 10.0
            score += max(0.0, 40.0 - float(len(blob)))
            if score > hub_score:
                hub_score = score
                hub_idx = idx
        if hub_idx is not None:
            return {"tool": "click", "index": hub_idx}, "nav_dom_service_click"
        hub_eval = build_nav_hub_click_evaluate(open_keys)
        if hub_eval is not None:
            return hub_eval, "nav_dom_service_click"
        synth = _synthetic_top_opener_coord(open_keys)
        if synth is not None:
            return {
                "tool": "wait",
                "seconds": 2,
                "coordinate_x": synth.get("coordinate_x"),
                "coordinate_y": synth.get("coordinate_y"),
            }, "nav_dom_service_cdp_click"
        click_eval = build_nav_opener_click_evaluate(open_keys)
        if click_eval is not None:
            return click_eval, "nav_dom_service_click"

    # After opener spent: still try destination evaluate once more if not yet.
    if target_keys and not target_click_used and menu_click_used:
        target_eval = build_nav_target_click_evaluate(target_keys)
        if target_eval is not None:
            return target_eval, "nav_dom_target_evaluate"

    if opener_click_idx is not None and not menu_phase and not menu_click_used:
        return {"tool": "click", "index": opener_click_idx}, "nav_dom_service_click"
    if opener_click_idx is not None and menu_phase and not menu_click_used:
        # Re-try discrete opener only if we have no better target yet.
        return {"tool": "click", "index": opener_click_idx}, "nav_dom_service_click"
    if text_opener_idx is not None and not menu_click_used:
        return {"tool": "click", "index": text_opener_idx}, "nav_dom_service_click"

    # Opener already activated once — stop thrashing; wait for target AX or LLM.
    if menu_click_used and target_click_used:
        _ = start_url
        return None, "nav_dom_opener_spent"

    def _sane_coord(action: dict[str, Any] | None) -> dict[str, Any] | None:
        if action is None or not _accept_coord(action):
            return None
        x = int(action.get("coordinate_x") or 0)
        if x <= 0 or x > 1280:
            return None
        return action

    if not menu_click_used:
        sane_best = _sane_coord(best_coord)
        if sane_best is not None:
            return sane_best, "nav_dom_service_coordinate"
        sane_strip = _sane_coord(strip_coord)
        if sane_strip is not None:
            return sane_strip, "nav_dom_service_coordinate"
        sane_alt = _sane_coord(alt_strip)
        if sane_alt is not None:
            return sane_alt, "nav_dom_service_coordinate"
        if open_keys and (menu_hover_used or menu_phase):
            synth = _synthetic_top_opener_coord(open_keys)
            sane_synth = _sane_coord(synth)
            if sane_synth is not None:
                return sane_synth, "nav_dom_service_coordinate"
    # Never return off-screen strip coords — that only burns the try budget.
    _ = start_url
    if menu_click_used:
        return None, "nav_dom_opener_spent"
    return None, "nav_dom_no_candidate"


def _synthetic_top_opener_coord(open_keys: list[str]) -> dict[str, Any] | None:
    """
    Last-resort top-chrome coordinate for opener keywords when the selector
    map has no usable bounds yet (still site-agnostic — only task keywords).
    """
    keys = [str(k).strip().lower() for k in (open_keys or []) if str(k).strip()]
    if not keys:
        return None
    # Fake a typical LTR top nav label strip so ordinal bias can land near Service.
    fake_blob = "produkte product ebikes models service beratung magazin magazine business"
    return _coordinate_click_for_label(
        (80.0, 48.0, 1100.0, 44.0),
        fake_blob,
        keys,
        ordinal_bias=0.55,
    )


def _click_action_index(action: Any) -> int | None:
    """Extract click index from ActionModel / dict shapes."""
    if action is None:
        return None
    dump: Any = None
    if hasattr(action, "model_dump"):
        try:
            dump = action.model_dump(exclude_none=True)
        except Exception:
            dump = None
    elif isinstance(action, dict):
        dump = action
    if not isinstance(dump, dict):
        return None
    click = dump.get("click")
    if isinstance(click, dict) and isinstance(click.get("index"), int):
        return int(click["index"])
    if isinstance(dump.get("index"), int) and action_tool_name(action) == "click":
        return int(dump["index"])
    return None


def is_home_loop_click(
    action: Any,
    current_url: str | None,
    *,
    start_url: str | None = None,
    task: str | None = None,
    browser_state_summary: Any = None,
) -> bool:
    """True when a path-finding click only points back to the start/root URL."""
    if action_tool_name(action) != "click":
        return False
    blob = action_text_blob(action)
    target_keys = _task_target_keywords(task)
    if target_keys and any(k in blob for k in target_keys):
        return False
    # Resolve index → href from the live selector map (logo clicks often lack /de/ text).
    idx = _click_action_index(action)
    if idx is not None and browser_state_summary is not None:
        for i, node in _selector_map_items(browser_state_summary):
            if i != idx:
                continue
            href = _node_attr(node, "href").lower()
            if _is_rootish_href(href):
                return True
            node_blob = _node_text_blob(node)
            # Bosch logo / brand home control.
            if href and _is_rootish_href(href.rstrip("/")):
                return True
            if node_blob in ("bosch", "logo", "startseite", "home") or node_blob.endswith(
                " logo"
            ):
                return True
            break
    cur = (current_url or "").strip().lower().rstrip("/")
    start = (start_url or "").strip().lower().rstrip("/")
    tokens = [
        '"target": "/"',
        '"url": "/"',
        '"target": "/de/"',
        '"url": "/de/"',
        '"target": "/en/"',
        '"url": "/en/"',
        "target=/de/",
        " /de/ ",
        "'/de/'",
        '"/de/"',
        '"href": "/de/"',
        '"href": "/"',
        '"href": "/en/"',
    ]
    if cur:
        tokens.extend([cur, cur + "/"])
    if start:
        tokens.extend([start, start + "/"])
    return any(token and token in blob for token in tokens)


# Backward-compatible private alias.
_is_home_loop_click = is_home_loop_click


def prefer_targeted_actions(
    actions: list[Any],
    *,
    task: str | None = None,
    current_url: str | None = None,
    perception: dict[str, Any] | None = None,
    exploratory_attempts: int = 0,
    start_url: str | None = None,
) -> tuple[list[Any], str]:
    """
    Prefer a higher-signal next step for brittle path-finding / cookie flows.
    """
    if not actions:
        return actions, "targeted_none"

    if is_ui_path_finding_task(task):
        target_keys = _task_target_keywords(task)
        if target_keys:
            produkt = _actions_matching_keywords(actions, target_keys)
            if produkt:
                return produkt, "path_target_visible"
        open_keys = _task_nav_open_keywords(task) or [
            "service",
            "beratung",
            "menu",
            "menü",
            "submenu",
            "navigation",
        ]
        service = _actions_matching_keywords(
            actions,
            open_keys,
            tool_names=("click", "hover"),
        )
        hover_service = [a for a in service if action_tool_name(a) == "hover"]
        if hover_service:
            return hover_service, "path_open_hover"
        if service:
            service = [
                a
                for a in service
                if not _is_home_loop_click(
                    a, current_url, start_url=start_url, task=task
                )
            ]
        if not service:
            non_loop = [
                a
                for a in actions
                if action_tool_name(a) not in ("done", "complete", "finish")
                and not _is_home_loop_click(
                    a, current_url, start_url=start_url, task=task
                )
            ]
            if non_loop and exploratory_attempts >= 0:
                # Always prefer avoiding home/logo loops while path-finding.
                if any(
                    _is_home_loop_click(a, current_url, start_url=start_url, task=task)
                    for a in actions
                ):
                    return non_loop, "path_avoid_home_loop"
        if service:
            return service, "path_open_menu"

    blob = " ".join(
        bit
        for bit in (
            str(current_url or ""),
            perception_text_blob(perception),
            " ".join(action_text_blob(a) for a in actions),
        )
        if bit
    ).lower()
    if any(tok in blob for tok in ("cookie", "consent", "ablehnen", "banner")):
        cookie = _actions_matching_keywords(
            actions,
            ["alles ablehnen", "ablehnen", "reject", "cookie", "consent"],
        )
        if cookie:
            return cookie, "cookie_reject"

    return actions, "targeted_passthrough"


def filter_path_finding_deeplinks(
    actions: list[Any],
    *,
    task: str | None,
    current_url: str | None,
) -> tuple[list[Any], str]:
    """
    Drop navigate/go_to_url shortcuts that jump straight to the task target
    while the persona is still supposed to find it via the UI.
    """
    if not actions or not is_ui_path_finding_task(task):
        return actions, "deeplink_skip"
    target_keys = _task_target_keywords(task)
    if not target_keys:
        return actions, "deeplink_skip"
    if _url_contains_any(current_url, target_keys):
        return actions, "deeplink_already_there"
    kept: list[Any] = []
    blocked = 0
    for action in actions:
        tool = action_tool_name(action)
        if tool in ("navigate", "go_to_url", "open_tab"):
            blob = action_text_blob(action).lower()
            if any(k in blob for k in target_keys):
                blocked += 1
                continue
        kept.append(action)
    if blocked:
        return kept, "deeplink_blocked"
    return actions, "deeplink_passthrough"


def targeted_continue_nudge(
    *,
    task: str | None,
    current_url: str | None,
    perception: dict[str, Any] | None,
    actions: list[Any],
    min_steps: int,
) -> str:
    """Targeted no-done retry message for pre-minSteps recovery."""
    _hinted, reason = prefer_targeted_actions(
        actions,
        task=task,
        current_url=current_url,
        perception=perception,
    )
    if reason in ("path_target_visible", "nav_h3_produktkombinationen"):
        return (
            f"AUDION_MIN_STEPS_DONE_GATE: done ist bis mindestens Schritt {min_steps} verboten. "
            "PATH: Wenn der Ziel-Link sichtbar ist, klicke ihn jetzt gezielt "
            "statt erneut nur ein Menü zu öffnen oder eine Deep-URL zu raten."
        )
    if reason in ("path_open_menu", "nav_h3_service"):
        return (
            f"AUDION_MIN_STEPS_DONE_GATE: done ist bis mindestens Schritt {min_steps} verboten. "
            "PATH: Klicke jetzt auf den sichtbaren Navigations-Einstieg aus der Aufgabe, "
            "um den Weg zum Ziel weiterzuverfolgen — keine Direkt-URL."
        )
    if reason in ("path_open_hover", "nav_h3_hover_service"):
        return (
            f"AUDION_MIN_STEPS_DONE_GATE: done ist bis mindestens Schritt {min_steps} verboten. "
            "PATH: Öffne jetzt zuerst das sichtbare Menü (Klick; hover gibt es nicht), "
            "dann den Unterpunkt zum Ziel."
        )
    if reason == "cookie_reject":
        return (
            f"AUDION_MIN_STEPS_DONE_GATE: done ist bis mindestens Schritt {min_steps} verboten. "
            "Die sichtbare nächste Aktion ist das Cookie-Banner zu schließen: klicke "
            "auf 'Alles ablehnen' / 'Ablehnen' statt abzubrechen oder blind zu scrollen."
        )
    return (
        f"AUDION_MIN_STEPS_DONE_GATE: done ist bis mindestens Schritt {min_steps} verboten. "
        "Bitte liefere einen sichtbaren nächsten Schritt (passender Klick/Scroll), kein done "
        "und keine geratene Deep-URL zum Ziel."
    )



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


def try_before_abandon_required(
    time_pressure: float | None,
    *,
    exploration: float | None = None,
) -> int:
    """
    Min exploratory actions after the first confusion cue before hard abandon / L2 force.

    Env ``UX_JOURNEY_TRY_BEFORE_ABANDON`` (default **4**) is the impatient floor —
    targets ~5–7 steps for impatient Alex (navigate + tries + done) so the persona
    fights like the human “kämpfendes Drittel” before honest abandon, while patient
    personas still get a higher budget (Sam contrast).
    """
    raw = (os.environ.get("UX_JOURNEY_TRY_BEFORE_ABANDON") or "4").strip()
    try:
        base = int(raw)
    except ValueError:
        base = 4
    base = max(0, min(base, 6))
    tp = 0.5 if time_pressure is None else float(time_pressure)
    if tp <= 0.35:
        # Patient / satisficing: try more before quit
        base = min(6, max(base, base + 2))
    elif tp < 0.75:
        base = min(6, max(base, base + 1))
    if exploration is not None and float(exploration) >= 0.65:
        base = min(6, base + 1)
    return base


def clarity_persistently_low(clarity_trend: list[Any] | None, *, min_steps: int = 2) -> bool:
    """True when recent clarity stays ≤1 across ≥min_steps (felt-state continuity)."""
    if not clarity_trend:
        return False
    recent = [c for c in clarity_trend[-4:] if isinstance(c, int)]
    if len(recent) < min_steps:
        return False
    return all(c <= 1 for c in recent[-min_steps:])


def should_prefer_abandon(
    perception: dict[str, Any] | None,
    time_pressure: float | None,
    *,
    felt_confusion_count: int = 0,
    clarity_trend: list[Any] | None = None,
) -> bool:
    """
    Impatient personas: confusion + low clarity / grey-filter signal → abandon.
    Soft preference becomes a hard stance upgrade in apply_impatient_abandon_stance
    only after the try-then-quit budget is exhausted.
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
    stuck = clarity_persistently_low(clarity_trend, min_steps=2)

    if confusion and (low_clarity or signal or prior or stuck):
        return True
    if low_clarity and signal:
        return True
    if prior and signal and low_clarity:
        return True
    if stuck and signal and prior:
        return True
    return False


def _soften_to_hesitate(perception: dict[str, Any]) -> dict[str, Any]:
    """First confused step: prefer exploratory proceed/hesitate before abandon."""
    out = dict(perception)
    # Prefer proceed so a probe click can pass the stance filter; hesitate alone
    # often empties done-only model output and collapsed into force-done/stop.
    out["stance"] = "proceed"
    out["stanceSoftened"] = True
    out["tryThenQuit"] = True
    intent = str(out.get("intent") or "").lower()
    if any(tok in intent for tok in ("abbrech", "abbruch", "aufgeb", "fertig")):
        out["intent"] = "Ich probiere noch kurz scrollen oder klicken, bevor ich aufgebe."
    elif len(str(out.get("intent") or "").strip()) < 12:
        out["intent"] = "Ich schaue mir das noch kurz an, bevor ich aufgebe."
    why = str(out.get("why") or "").strip()
    if len(why) < 12 or looks_like_research_script(why):
        out["why"] = "Noch nicht sicher — ich schaue mir das kurz an."
    return out


def _hard_upgrade_abandon(perception: dict[str, Any]) -> dict[str, Any]:
    out = dict(perception)
    out["stance"] = "abandon"
    out["stanceUpgraded"] = True
    out["tryThenQuit"] = True
    out.pop("stanceSoftened", None)
    why = str(out.get("why") or "").strip()
    if len(why) < 12 or looks_like_research_script(why):
        out["why"] = (
            "Die ausgegrauten Optionen erklären sich nicht — ich breche ab."
        )
    intent = str(out.get("intent") or "").lower()
    if not any(tok in intent for tok in ("abbrech", "abbruch", "aufgeb", "stoppe", "fertig")):
        out["intent"] = "Ich breche ab — so komme ich nicht weiter."
    feel = out.get("feel")
    if not isinstance(feel, dict) or feel.get("valence") is None:
        out["feel"] = {"label": "frustriert", "valence": -2}
    elif isinstance(feel.get("valence"), int) and feel["valence"] > -1:
        out["feel"] = {
            "label": str(feel.get("label") or "frustriert"),
            "valence": -2,
        }
    return out


def apply_impatient_abandon_stance(
    perception: dict[str, Any] | None,
    time_pressure: float | None,
    *,
    felt_confusion_count: int = 0,
    exploratory_attempts: int = 0,
    try_before_abandon: int | None = None,
    exploration: float | None = None,
    clarity_trend: list[Any] | None = None,
) -> tuple[dict[str, Any] | None, bool]:
    """
    Try-then-quit then hard-upgrade for impatient + confusion.

    While ``exploratory_attempts < try_before_abandon``: soften abandon/proceed →
    hesitate (one exploratory click/scroll). After the budget: hard-upgrade to abandon.
    Returns (perception, upgraded_to_abandon).
    """
    if perception is None:
        return None, False

    required = (
        try_before_abandon
        if try_before_abandon is not None
        else try_before_abandon_required(time_pressure, exploration=exploration)
    )
    prefers = should_prefer_abandon(
        perception,
        time_pressure,
        felt_confusion_count=felt_confusion_count,
        clarity_trend=clarity_trend,
    )
    stance = str(perception.get("stance") or "")

    # Model already abandoning / would prefer abandon — gate on try budget.
    if stance == "abandon" or prefers:
        if int(exploratory_attempts or 0) < int(required):
            # Soften even model-chosen abandon on the first confused step.
            return _soften_to_hesitate(perception), False
        if stance == "abandon":
            out = dict(perception)
            out["tryThenQuit"] = True
            out.pop("stanceSoftened", None)
            return out, False
        return _hard_upgrade_abandon(perception), True

    return perception, False


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

# Lab B matrix / "human gold" cues that must not be invented on Nav-home.
_LAB_B_GOLD_PROMOTE_LABELS = frozenset(
    {
        # Explicitly called out in smoke evidence: no "Display-Karten grau" and no
        # "Performance Line" on the Nav-home path.
        "grau / disabled",
        "Performance Line",
        # "Displays" can indirectly contribute to "Display-Karten grau" wording.
        "Displays",
        # Filter / unklar warum belong to the destination matrix — inventing them
        # on home burns try-then-quit via confusion-cue scanners.
        "Filter",
        "unklar warum",
    }
)

_RESEARCH_SCRIPT_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(r"ohne erkl[aä]rung zur ursache", re.I),
    re.compile(r"filterursache", re.I),
    re.compile(r"unklar warum", re.I),
    re.compile(r"sichtbar(er|en)?\s+seiten(check|bereich)", re.I),
    re.compile(r"weitere sichtbare bereiche", re.I),
    re.compile(r"prüfe kurz weitere", re.I),
    re.compile(r"ursache unklar", re.I),
    re.compile(r"keine sichere antwort", re.I),
    re.compile(r"sichtbaren bereich prüfen", re.I),
    re.compile(r"erkl[aä]rung zur ursache", re.I),
    re.compile(r"sichtbaren navigations-einstieg", re.I),
)


def looks_like_research_script(text: str | None) -> bool:
    """True when copy reads like UX-research template, not shopper think-aloud."""
    s = (text or "").strip()
    if len(s) < 8:
        return False
    return any(p.search(s) for p in _RESEARCH_SCRIPT_PATTERNS)


def _noticed_ui_digest(noticed: list[Any], *, limit: int = 2) -> str:
    parts: list[str] = []
    for entry in noticed:
        if not isinstance(entry, dict):
            continue
        what = str(entry.get("what") or "").strip()
        if len(what) < 3 or looks_like_research_script(what):
            continue
        where = str(entry.get("where") or "").strip()
        parts.append(f"{what} ({where})" if where else what)
        if len(parts) >= limit:
            break
    return "; ".join(parts)


def task_reminder_from_task(task: str | None) -> str | None:
    """Short first-person task anchor for taskReminder."""
    if not task:
        return None
    keys = browse_find_target_keywords(task)
    if keys:
        return f"Ich suche nach {keys[0]}."
    match = re.search(r"Aufgabe:\s*([^.\n]+)", str(task))
    if match:
        bit = match.group(1).strip()
        return bit[:200] if bit else None
    t = str(task).strip()
    if is_browse_find_task(task) and len(t) <= 200:
        return t
    return None


def _goal_in_perception(perception: dict[str, Any], goal: str) -> bool:
    """True when think/intent/why already mention the browse goal (not taskReminder)."""
    voice = " ".join(
        [
            str(perception.get("think") or ""),
            str(perception.get("intent") or ""),
            str(perception.get("why") or ""),
        ]
    )
    return goal.lower() in voice.lower()


_AGENT_VOICE_STUBS = frozenset(
    {
        "start",
        "none",
        "initial navigation",
        "navigate",
        "navigation",
    }
)


def is_agent_voice_stub(text: str | None) -> bool:
    t = str(text or "").strip().lower()
    return not t or t in _AGENT_VOICE_STUBS


def anchor_task_to_perception(
    perception: dict[str, Any] | None,
    *,
    task: str | None,
    lab_b_gold_context_allowed: bool = True,
) -> dict[str, Any] | None:
    """Ensure browse/find tasks stay visible in think/intent/why — then naturalize voice."""
    if perception is None or not task:
        return perception
    out = dict(perception)
    reminder = task_reminder_from_task(task)
    if reminder:
        out["taskReminder"] = reminder
    keys = browse_find_target_keywords(task)
    goal = keys[0] if keys else None
    if goal and is_browse_find_task(task) and not _goal_in_perception(out, goal):
        stance = str(out.get("stance") or "proceed")
        if stance == "abandon":
            out["think"] = f"So finde ich {goal} hier nicht."
            out["intent"] = f"Ich gebe die Suche nach {goal} auf."
            out["why"] = "Mir fehlt ein klarer Einstieg zum Ziel."
        elif stance == "hesitate" or out.get("browseExploreRequired"):
            out["think"] = f"Ich sehe {goal} noch nicht — ich scroll weiter."
            out["intent"] = f"Ich scrolle weiter und suche nach {goal}."
            out["why"] = "Oben reicht der Blick noch nicht."
        else:
            out["think"] = f"Ich bin auf der Seite und suche nach {goal}."
            out["intent"] = f"Ich mache den nächsten Schritt Richtung {goal}."
            out["why"] = f"Erst muss klar werden, wo ich {goal} finde."
    return humanize_perception_voice(
        out,
        task=task,
        lab_b_gold_context_allowed=lab_b_gold_context_allowed,
    )


def humanize_perception_voice(
    perception: dict[str, Any],
    *,
    task: str | None = None,
    lab_b_gold_context_allowed: bool = True,
) -> dict[str, Any]:
    """
    Rewrite research-script think/intent/why into colloquial shopper copy.
    Uses noticed[] + task goal — never invents UI off-screen.
    """
    out = dict(perception)
    noticed = [n for n in (out.get("noticed") or []) if isinstance(n, dict)]
    if not lab_b_gold_context_allowed:
        cleaned: list[dict[str, Any]] = []
        for n in noticed:
            what = str(n.get("what") or "")
            if looks_like_research_script(what):
                continue
            cleaned.append(n)
        if cleaned:
            noticed = cleaned
            out["noticed"] = noticed

    digest = _noticed_ui_digest(noticed)
    goal_keys = browse_find_target_keywords(task)
    goal = goal_keys[0] if goal_keys else "mein Ziel"
    stance = str(out.get("stance") or "proceed")
    browse = is_browse_find_task(task) and not lab_b_gold_context_allowed

    def rewrite_think() -> str:
        if digest:
            if browse:
                return f"Ich sehe {digest} — {goal} finde ich so noch nicht."
            return f"Ich sehe {digest} und überlege, wie es weitergeht."
        if browse:
            return f"Ich schaue mich um und suche nach {goal}."
        return "Ich schaue mir an, was auf dem Screen passiert."

    def rewrite_intent() -> str:
        if stance == "abandon":
            if browse:
                return f"Ich gebe es auf — {goal} finde ich hier nicht."
            return "Ich breche ab, weil ich nicht weiterkomme."
        if stance == "hesitate" or out.get("browseExploreRequired"):
            if browse:
                return f"Ich scroll weiter und suche nach {goal}."
            return "Ich schaue mir erst noch den restlichen Screen an."
        if digest:
            lead = digest.split(";")[0].strip()
            return f"Ich mache als Nächstes einen Schritt Richtung {lead}."
        return "Ich mache den nächsten sichtbaren Schritt."

    def rewrite_why() -> str:
        if stance == "abandon":
            if browse:
                return f"So finde ich {goal} nicht — mir fehlt ein klarer Einstieg."
            return "Ich komme hier nicht weiter und will nicht raten."
        if out.get("browseExploreRequired"):
            return "Oben reicht der Blick noch nicht — erst weiter schauen."
        feel = out.get("feel")
        if isinstance(feel, dict) and int(feel.get("valence") or 0) < 0:
            return "Das wirkt gerade unübersichtlich für mich."
        if digest:
            return f"Erst muss klar werden, wo {goal} überhaupt startet."
        return "Ich will erst verstehen, was ich hier sehe."

    think = str(out.get("think") or "").strip()
    intent = str(out.get("intent") or "").strip()
    why = str(out.get("why") or "").strip()

    if looks_like_research_script(think) or is_agent_voice_stub(think) or (
        not lab_b_gold_context_allowed and "unklar warum" in think.lower()
    ):
        out["think"] = rewrite_think()
    if looks_like_research_script(intent) or is_agent_voice_stub(intent) or "prüfe kurz" in intent.lower():
        out["intent"] = rewrite_intent()
    if looks_like_research_script(why) or is_agent_voice_stub(why) or (
        not lab_b_gold_context_allowed and "filter" in why.lower() and "ursache" in why.lower()
    ):
        out["why"] = rewrite_why()

    return out


def is_lab_b_matrix_task(task: str | None) -> bool:
    """
    Best-effort task classifier for the Lab B matrix run.

    We avoid relying on pack/runKey plumbing at the Python layer; instead we
    match stable German phrases from the scenario-pack fixture.
    """
    if not task:
        return False
    t = str(task)
    # Lab B matrix fixture includes explicit "Lab-Persona:" line.
    if "Lab-Persona:" in t and "Du bist ungeduldig" in t:
        return True
    # Also stable: early quit instruction after at most two grey/disabled moments.
    if "höchstens zwei" in t and "Momenten" in t:
        return True
    return False


def is_browse_find_task(task: str | None) -> bool:
    """
    True when the persona should search/find something on a live page
    (chat inspect, product find) — scroll before honest abandon.
    """
    if not task:
        return False
    if is_ui_path_finding_task(task):
        return True
    t = str(task).lower()
    cues = (
        "suche nach",
        "such nach",
        "suche eine",
        "suche einen",
        "suche die",
        "finde ",
        "find ",
        "look for",
        "search for",
        "gucke",
        "guck auf",
        "schaue",
        "schau auf",
        "auf der seite",
        "auf der website",
        "auf der webpage",
        "browse",
    )
    return any(c in t for c in cues)


def browse_find_target_keywords(task: str | None) -> list[str]:
    """Destination / product words from find phrasing + existing target keys."""
    keys = list(_task_target_keywords(task))
    t = str(task or "")
    patterns = (
        r"suche\s+(?:auf\s+(?:der\s+)?(?:seite|website|webpage)\s+)?nach\s+(?:einer?\s+|einem\s+|der\s+|dem\s+|das\s+|die\s+)?"
        r"([A-Za-zÄÖÜäöüß0-9][A-Za-zÄÖÜäöüß0-9\-]{2,})",
        r"finde\s+(?:eine?\s+|einen?\s+|die\s+|den\s+|das\s+)?"
        r"([A-Za-zÄÖÜäöüß0-9][A-Za-zÄÖÜäöüß0-9\-]{2,})",
        r"search\s+for\s+(?:a\s+|an\s+|the\s+)?"
        r"([A-Za-z0-9][A-Za-z0-9\-]{2,})",
        r"look\s+for\s+(?:a\s+|an\s+|the\s+)?"
        r"([A-Za-z0-9][A-Za-z0-9\-]{2,})",
    )
    skip = {
        "seite",
        "website",
        "webpage",
        "page",
        "site",
        "etwas",
        "etwasem",
        "produkt",
        "produkte",
    }
    for pat in patterns:
        for m in re.finditer(pat, t, re.I):
            tok = m.group(1).lower().strip("-")
            if len(tok) < 3 or tok in skip:
                continue
            if tok not in keys:
                keys.append(tok)
    return keys


def browse_min_scrolls_required() -> int:
    raw = (os.environ.get("UX_JOURNEY_BROWSE_MIN_SCROLLS") or "2").strip()
    try:
        n = int(raw)
    except ValueError:
        n = 2
    return max(1, min(n, 6))


def browse_target_visible(
    perception: dict[str, Any] | None,
    *,
    task: str | None,
    current_url: str | None,
) -> bool:
    """True when URL or noticed[] already names the find target (not mere denial in think)."""
    keys = browse_find_target_keywords(task)
    if not keys:
        return False
    if _url_contains_any(current_url, keys):
        return True
    noticed = (perception or {}).get("noticed") or []
    blob = " ".join(
        str(n.get("what") or "")
        for n in noticed
        if isinstance(n, dict)
    ).lower()
    return any(k in blob for k in keys)


def browse_explore_satisfied(
    *,
    scroll_attempts: int,
    target_visible: bool,
) -> bool:
    if target_visible:
        return True
    return int(scroll_attempts or 0) >= browse_min_scrolls_required()


def count_scroll_actions(actions: list[Any] | None) -> int:
    """Count scroll tool calls (prefer down; any scroll counts for the budget)."""
    if not actions:
        return 0
    n = 0
    for action in actions:
        name = action_tool_name(action)
        if name in ("scroll", "scroll_down", "scroll_up"):
            n += 1
    return n


def _soften_browse_explore(perception: dict[str, Any], *, task: str | None) -> dict[str, Any]:
    """Force scroll exploration before abandon on browse/find tasks."""
    out = dict(perception)
    keys = browse_find_target_keywords(task)
    goal = keys[0] if keys else "dem Ziel"
    out["stance"] = "hesitate"
    out["stanceSoftened"] = True
    out["browseExploreRequired"] = True
    out["tryThenQuit"] = True
    out["confusion"] = None
    out["intent"] = f"Ich scroll runter und suche nach {goal}."
    out["why"] = "Oben sehe ich noch nicht genug — erst weiter schauen."
    out["think"] = f"{goal.capitalize()} sehe ich oben noch nicht; ich scroll weiter."
    noticed = list(out.get("noticed") or [])
    if not any(
        isinstance(n, dict) and "scroll" in str(n.get("what") or "").lower()
        for n in noticed
    ):
        noticed.append(
            {
                "what": "Unterer Seitenbereich noch nicht geprüft",
                "where": "Viewport",
                "relevance": "high",
            }
        )
        out["noticed"] = noticed[:6]
    return out


def apply_browse_explore_before_abandon(
    perception: dict[str, Any] | None,
    *,
    task: str | None,
    scroll_attempts: int = 0,
    current_url: str | None = None,
) -> tuple[dict[str, Any] | None, bool]:
    """
    Block early abandon on browse/find until min scrolls (or target visible).

    Returns (perception, blocked) where blocked means abandon/soften was redirected
    to scroll explore.
    """
    if perception is None:
        return None, False
    if not is_browse_find_task(task):
        return perception, False
    # Lab B destination tool: keep grey-filter abandon (no forced homepage scroll).
    if lab_b_gold_context_allowed(current_url, task):
        return perception, False
    visible = browse_target_visible(
        perception, task=task, current_url=current_url
    )
    if browse_explore_satisfied(
        scroll_attempts=scroll_attempts, target_visible=visible
    ):
        return perception, False
    stance = str(perception.get("stance") or "")
    # Soften hard abandon, and also re-steer try-then-quit softens toward scroll.
    if stance == "abandon" or perception.get("stanceSoftened"):
        return _soften_browse_explore(perception, task=task), True
    return perception, False


def lab_b_gold_context_allowed(current_url: str | None, task: str | None) -> bool:
    """
    When False: disable Lab-B gold enrich/prompt bias so path-finding home
    can't invent destination-tool filter state.

    Allowed when:
    - the current task is the Lab B matrix run, OR
    - current URL already contains task target keywords (on the destination).
    """
    if is_lab_b_matrix_task(task):
        return True
    if not current_url:
        return False
    keys = _task_target_keywords(task)
    if keys:
        return _url_contains_any(current_url, keys)
    return "produktkombinationen" in str(current_url).lower()


def scope_nav_home_perception(
    perception: dict[str, Any] | None,
    *,
    current_url: str | None,
    task: str | None,
    budget: int,
) -> dict[str, Any] | None:
    """
    Keep path-finding tasks on the *path* problem while not yet on the target URL.

    Without this, the model can hallucinate destination-tool state from the task
    and abandon before it has actually reached the target surface.
    """
    if not perception or not is_ui_path_finding_task(task):
        return perception
    if lab_b_gold_context_allowed(current_url, task):
        return perception
    target_keys = _task_target_keywords(task)
    if _url_contains_any(current_url, target_keys):
        return perception

    out = dict(perception)
    blob = perception_text_blob(out)
    open_keys = _task_nav_open_keywords(task)
    noticed: list[dict[str, Any]] = [
        {
            "what": "Startseite geladen",
            "where": "Home",
            "relevance": "high",
        }
    ]
    if open_keys and any(tok in blob for tok in open_keys):
        label = " / ".join(open_keys[:2])
        noticed.append(
            {
                "what": f"{label} als möglicher Einstieg",
                "where": "Navigation",
                "relevance": "high",
            }
        )
    if target_keys and any(tok in blob for tok in target_keys):
        noticed.append(
            {
                "what": f"{target_keys[0]} noch nicht verifiziert",
                "where": "Zielpfad",
                "relevance": "high",
            }
        )
    if len(noticed) == 1:
        noticed.append(
            {
                "what": "Direkter Ziel-Einstieg noch nicht sichtbar",
                "where": "Startseite",
                "relevance": "high",
            }
        )
    out["noticed"] = noticed[: max(2, budget)]
    goal = target_keys[0] if target_keys else "Ziel"
    out["taskReminder"] = f"Ich suche den Weg zu {goal}."
    out["intent"] = f"Ich öffne das Menü und suche einen Einstieg zu {goal}."
    out["why"] = f"Auf der Startseite muss ich erst den Weg zu {goal} finden."
    out["think"] = "Ich bin auf der Startseite und suche in der Navigation einen passenden Einstieg."
    out["confusion"] = None
    feel = out.get("feel")
    if isinstance(feel, dict):
        label = str(feel.get("label") or "").lower()
        if any(tok in label for tok in ("frustr", "überforder", "ärger")):
            out["feel"] = {
                **feel,
                "label": "vorsichtig ungeduldig",
                "valence": min(int(feel.get("valence") or -1), -1),
            }
    return out


def min_steps_blocks_done(current_step: int, min_steps: int, *, stance: str) -> bool:
    """
    True when "done" should be blocked because we're still below minSteps.

    We explicitly allow abandonment flows (stance=abandon) to finish early.
    """
    if str(stance) == "abandon":
        return False
    try:
        cs = int(current_step)
    except (TypeError, ValueError):
        cs = 1
    try:
        ms = int(min_steps)
    except (TypeError, ValueError):
        ms = 1
    return cs < ms


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
    *,
    lab_b_gold_context_allowed: bool = True,
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
        if not lab_b_gold_context_allowed and label in _LAB_B_GOLD_PROMOTE_LABELS:
            continue
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
    exploratory_attempts: int = 0,
    try_before_abandon: int | None = None,
    exploration: float | None = None,
    clarity_trend: list[Any] | None = None,
    lab_b_gold_context_allowed: bool = True,
    task: str | None = None,
    current_url: str | None = None,
    browse_scroll_attempts: int = 0,
) -> tuple[dict[str, Any] | None, bool]:
    """Enrich noticed from own text, then try-then-quit / browse-explore / hard-upgrade abandon."""
    if perception is None:
        return None, False
    enriched = (
        enrich_noticed_from_perception_text(
            perception,
            budget,
            lab_b_gold_context_allowed=lab_b_gold_context_allowed,
        )
        or perception
    )
    out, upgraded = apply_impatient_abandon_stance(
        enriched,
        time_pressure,
        felt_confusion_count=felt_confusion_count,
        exploratory_attempts=exploratory_attempts,
        try_before_abandon=try_before_abandon,
        exploration=exploration,
        clarity_trend=clarity_trend,
    )
    out2, browse_blocked = apply_browse_explore_before_abandon(
        out,
        task=task,
        scroll_attempts=browse_scroll_attempts,
        current_url=current_url,
    )
    if browse_blocked:
        upgraded = False
    out3 = anchor_task_to_perception(
        out2,
        task=task,
        lab_b_gold_context_allowed=lab_b_gold_context_allowed,
    )
    return out3, upgraded


def try_then_quit_blocks_force_done(perception: dict[str, Any] | None) -> bool:
    """True when the soften turn must not collapse into force-done."""
    return bool(
        perception
        and (perception.get("stanceSoftened") or perception.get("browseExploreRequired"))
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
        "exploratoryAttempts": 0,
        "tryThenQuitSoftens": 0,
        "browseScrollAttempts": 0,
        "browseExploreSoftens": 0,
        "lowClarityStreak": 0,
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
        if clarity <= 1:
            state["lowClarityStreak"] = int(state.get("lowClarityStreak") or 0) + 1
        else:
            state["lowClarityStreak"] = 0
    feel = perception.get("feel")
    if isinstance(feel, dict) and feel.get("valence") is not None:
        state["lastValence"] = feel.get("valence")
    had_confusion_before = int(state.get("confusionCount") or 0) > 0
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

    stance = str(perception.get("stance") or "")
    confused_now = bool(perception.get("confusion")) or has_grey_filter_signal(perception)
    # Count exploratory tries after (or on) confusion cues — try-then-quit budget.
    if perception.get("stanceSoftened") or perception.get("browseExploreRequired"):
        state["exploratoryAttempts"] = int(state.get("exploratoryAttempts") or 0) + 1
        state["tryThenQuitSoftens"] = int(state.get("tryThenQuitSoftens") or 0) + 1
        if perception.get("browseExploreRequired"):
            state["browseExploreSoftens"] = int(state.get("browseExploreSoftens") or 0) + 1
    elif stance in ("hesitate", "proceed") and (had_confusion_before or confused_now):
        state["exploratoryAttempts"] = int(state.get("exploratoryAttempts") or 0) + 1
    return state


def note_browse_scroll_attempts(state: dict[str, Any], actions: list[Any] | None) -> int:
    """Increment felt-state scroll counter from applied actions; return new total."""
    added = count_scroll_actions(actions)
    if added:
        state["browseScrollAttempts"] = int(state.get("browseScrollAttempts") or 0) + added
    return int(state.get("browseScrollAttempts") or 0)


def felt_state_prompt_block(state: dict[str, Any] | None) -> str:
    if not state or not state.get("stepsWithPerception"):
        return ""
    trend = state.get("clarityTrend") or []
    oq = state.get("openQuestions") or []
    stuck = clarity_persistently_low(trend, min_steps=2)
    lines = [
        "AUDION_FELT_STATE (dein bisheriger Eindruck — baue darauf auf, nicht neu optimieren):",
        f"- Klarheit-Verlauf: {trend[-5:] if trend else '—'}",
        f"- Niedrige-Klarheit-Serie: {state.get('lowClarityStreak')}",
        f"- Letztes Gefühl valence: {state.get('lastValence')}",
        f"- Confusion-Momente bisher: {state.get('confusionCount')}",
        f"- Explorative Versuche nach Verwirrung: {state.get('exploratoryAttempts')}",
        f"- Browse-Scrolls (Find-Tasks): {state.get('browseScrollAttempts') or 0}",
        f"- Letzte Stance: {state.get('lastStance')}",
        f"- Zuletzt bemerkt: {state.get('lastNoticedDigest') or '—'}",
    ]
    if stuck:
        lines.append(
            "- Persistenz: Klarheit bleibt niedrig über mehrere Steps — "
            "nach kurzem Versuch eher stance=abandon als weiteroptimieren."
        )
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
    lab_b_gold_context_allowed: bool = True,
    task: str | None = None,
) -> str:
    """System-message block replacing AUDION_THINK_ALOUD for perception-first steps."""
    budget = salience_budget(time_pressure, detail_orientation)
    tp = 0.5 if time_pressure is None else float(time_pressure)
    impatient = tp >= 0.75
    patient = tp <= 0.35
    browse_find = is_browse_find_task(task) and not lab_b_gold_context_allowed

    persona_lines = [
        f"- Salience-Budget: maximal {budget} Einträge in noticed[] (Persona time_pressure={tp:.2f}).",
        "- Blind Spot: Handle NUR auf Basis von noticed. Erfinde keine UI außerhalb von noticed.",
        "- ignoredGuess: sag kurz, was du bewusst überspringst / nicht prüfst.",
        "- SPRACHE: think/intent/why = umgangssprachlich wie ein echter Nutzer (Menü, Kategorie, Banner, Suchfeld). "
        "Keine UX-Fachsprache (VERBOTEN: „Filterursache“, „unklar warum“, „Erklärung zur Ursache“, "
        "„Seitencheck“, „sichtbare Bereiche prüfen“, „keine sichere Antwort“). "
        "confusion-Tags sind intern — nicht wörtlich in think/why wiederholen.",
    ]
    if browse_find:
        persona_lines.append(
            "- Browse/Find: beschreibe konkret was du auf dem Screen siehst und ob du dein Ziel findest. "
            "Beispiel-Ton: „Oben nur Werbung — ich scroll nach Garten/Grill.“"
        )
    if impatient and not browse_find:
        try_n = try_before_abandon_required(tp, exploration=exploration)
        persona_lines.append(
            f"- Try-then-quit: nach erster Verwirrung (grau/Filter) erst {try_n}× "
            "zögern/kurz explorieren (hesitate/scroll/ein Klick), DANN erst stance=abandon. "
            "Runtime erzwingt das."
        )
        persona_lines.append(
            "- Du bist ungeduldig: bei clarity≤1 ODER confusion-Tag und unerklärtem Grau/Filter "
            "→ nach dem kurzen Versuch stance=abandon (ehrlicher Abbruch, kein Weiteroptimieren)."
        )
        persona_lines.append("- ignoredGuess ist bei dir erwartet (Tunnelblick OK).")
        if lab_b_gold_context_allowed:
            persona_lines.append(
                f"- Nutze das Budget ({budget}): bei grau/disabled Displays noticed MUSS "
                "die Aspekte trennen — wörtlich sinnvoll: (1) grau/disabled Zustand, "
                "(2) „Filter“ / Kompatibilitätsfilter, (3) „unklar warum“ die Ursache fehlt "
                "(plus Performance Line wenn sichtbar). Keine bloße Umschreibung ohne diese Worte."
            )
            persona_lines.append(
                "- Bei unerklärtem Grau: confusion=disabled_option_unexplained oder "
                "filter_cause_unknown setzen — in think/why natürlich sagen "
                "(„ausgegraut und ich verstehe nicht warum“), nicht Schablonen copy-pasten."
            )
        if felt_state and clarity_persistently_low(felt_state.get("clarityTrend"), min_steps=2):
            persona_lines.append(
                "- Felt-State: Klarheit bleibt niedrig — Abbruch ist wahrscheinlicher als Optimieren."
            )
    elif impatient and browse_find:
        try_n = try_before_abandon_required(tp, exploration=exploration)
        persona_lines.append(
            f"- Ungeduldig, aber Browse/Find: erst mindestens 2× scrollen und sichtbar suchen, "
            f"dann erst Abbruch. Try-Budget ≈{try_n} kurze Versuche."
        )
    elif patient:
        try_n = try_before_abandon_required(tp, exploration=exploration)
        persona_lines.append(
            f"- Du bist geduldig (satisficing Explore-Budget ≈{try_n}): "
            "stance=hesitate (scroll/prüfen) ist erlaubt; abandon nur bei klarer Sackgasse."
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
    task_section = ""
    if task and str(task).strip():
        task_section = f"AUFTRAG (jeder Schritt): {str(task).strip()[:240]}\n"

    if browse_find:
        sample_perception_block = (
            "<<PERCEPTION>>{"
            '"taskReminder":"Ich suche eine Grillplatte auf der Seite",'
            '"noticed":['
            '{"what":"Hero mit Aktionen und Kategorien","where":"oben","relevance":"high"},'
            '{"what":"Suchfeld oder Garten-Kategorie","where":"Header","relevance":"high"}'
            '],'
            '"ignoredGuess":"Footer und Fein-Tooltips lese ich nicht",'
            '"think":"Oben sehe ich viel Werbung — die Grillplatte springt mir noch nicht ins Auge.",'
            '"clarity":1,'
            '"feel":{"label":"unsicher","valence":-1},'
            '"confusion":null,'
            '"stance":"hesitate",'
            '"intent":"Ich scroll runter und schaue, ob Garten oder Grill auftauchen.",'
            '"why":"Ohne Kategorie oder Suche finde ich das Produkt so nicht."'
            "}<</PERCEPTION>>\n"
        )
    elif lab_b_gold_context_allowed:
        sample_perception_block = (
            "<<PERCEPTION>>{"
            '"taskReminder":"Ich will kompatible Displays finden",'
            '"noticed":['
            '{"what":"Display-Karten sind ausgegraut","where":"rechts","relevance":"high"},'
            '{"what":"Kompatibilitätsfilter ohne Erklärung","where":"Auswahl","relevance":"high"},'
            '{"what":"Performance Line Karte","where":"Drive Unit","relevance":"med"}'
            '],'
            '"ignoredGuess":"Feine Tooltips und Footer lese ich nicht",'
            '"think":"Die Karten sind grau und ich verstehe nicht, warum ich sie nicht wählen kann.",'
            '"clarity":0,'
            '"feel":{"label":"frustriert","valence":-2},'
            '"confusion":"disabled_option_unexplained",'
            '"stance":"abandon",'
            '"intent":"Ich breche ab — so komme ich nicht weiter.",'
            '"why":"Ausgegraute Optionen ohne Erklärung — ich will nicht raten."'
            "}<</PERCEPTION>>\n"
        )
    else:
        sample_perception_block = (
            "<<PERCEPTION>>{"
            '"taskReminder":"Ich suche den Weg zum Produktkombinationen-Tool",'
            '"noticed":['
            '{"what":"Startseite mit Hauptnavigation","where":"oben","relevance":"high"},'
            '{"what":"Service-Menüpunkt","where":"Nav","relevance":"high"}'
            '],'
            '"ignoredGuess":"Footer lese ich nicht",'
            '"think":"Ich bin auf der Startseite und suche in der Navigation einen Einstieg.",'
            '"clarity":1,'
            '"feel":{"label":"neutral","valence":0},'
            '"confusion":null,'
            '"stance":"proceed",'
            '"intent":"Ich klicke auf Service und schaue, ob Produktkombinationen auftaucht.",'
            '"why":"Über die Navigation komme ich normalerweise zum Ziel."'
            "}<</PERCEPTION>>\n"
        )

    return (
        "AUDION_PERCEPTION:\n"
        "ROLLENBILD: Du bist die Persona. Reihenfolge PFLICHT: erst wahrnehmen & bewerten, "
        "dann erst Action wählen. Perception steuert die Entscheidung IN DIESEM Schritt.\n"
        f"{task_section}"
        f"{felt_section}"
        "Persona-Filter:\n"
        + "\n".join(persona_lines)
        + "\n"
        "PFLICHT: Hänge an 'thinking' diesen Block an (wird aus dem VO entfernt):\n"
        + sample_perception_block
        + "Felder: taskReminder, noticed[{what,where?,relevance:high|med|low}], ignoredGuess, "
        "think, clarity 0-3, feel{label,valence -2..2}, "
        "confusion (disabled_option_unexplained|filter_cause_unknown|selection_order_surprise|null), "
        "stance (proceed|hesitate|abandon), intent, why.\n"
        "stance=abandon → nur done. stance=hesitate → nur scroll/wait. "
        "stance=proceed → Klick nur auf etwas aus noticed.\n"
        "BROWSE/FIND: Wenn die Aufgabe etwas auf der Seite suchen/finden soll und das Ziel "
        "noch nicht in noticed/URL ist — VOR stance=abandon mindestens zweimal nach unten "
        "scrollen und den sichtbaren Bereich prüfen. Ohne Scroll ist abandon VERBOTEN.\n"
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
    softened = sum(1 for p in percs if p.get("stanceSoftened"))
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
        "stanceSoftened": softened,
        "exploratoryAttempts": int((felt or {}).get("exploratoryAttempts") or 0),
        "tryThenQuitSoftens": int((felt or {}).get("tryThenQuitSoftens") or 0),
        "lowClarityStreak": int((felt or {}).get("lowClarityStreak") or 0),
        "missingPerceptionClears": int((felt or {}).get("missingPerceptionClears") or 0),
        "lastObservedUrl": (felt or {}).get("lastObservedUrl"),
        "targetClickUsed": bool((felt or {}).get("targetClickUsed")),
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
