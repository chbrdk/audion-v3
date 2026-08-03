"""Browser User-Agent for CloudFront / WAF-friendly headless runs.

Keep in sync with ``paths.uxJourneyBrowserUserAgent`` in ``apps/web/lib/paths.ts``
and ``knowledge/cloudfront-403-bosch-headless-ua-2026-08-03.md``.
Override via env ``UX_JOURNEY_USER_AGENT`` (Coolify).
"""

from __future__ import annotations

import os

# Must NOT contain "HeadlessChrome" — bosch-ebike.com CloudFront returns 403 for that UA.
DEFAULT_UX_JOURNEY_BROWSER_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/128.0.0.0 Safari/537.36"
)

ENV_UX_JOURNEY_USER_AGENT = "UX_JOURNEY_USER_AGENT"


def resolve_browser_user_agent(
    env: dict[str, str] | None = None,
    *,
    default: str = DEFAULT_UX_JOURNEY_BROWSER_USER_AGENT,
) -> str:
    """Return configured browser UA, rejecting empty / HeadlessChrome overrides."""
    source = env if env is not None else os.environ
    raw = (source.get(ENV_UX_JOURNEY_USER_AGENT) or "").strip()
    if not raw:
        return default
    if "HeadlessChrome" in raw:
        return default
    return raw
