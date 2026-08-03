"""Unit tests for CloudFront-safe browser User-Agent resolution."""

from __future__ import annotations

import unittest

from browser_ua import (
    DEFAULT_UX_JOURNEY_BROWSER_USER_AGENT,
    ENV_UX_JOURNEY_USER_AGENT,
    resolve_browser_user_agent,
)


class BrowserUaTests(unittest.TestCase):
    def test_default_has_no_headless_token(self) -> None:
        ua = resolve_browser_user_agent({})
        self.assertEqual(ua, DEFAULT_UX_JOURNEY_BROWSER_USER_AGENT)
        self.assertNotIn("HeadlessChrome", ua)
        self.assertIn("Chrome/", ua)

    def test_env_override(self) -> None:
        custom = (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
        )
        ua = resolve_browser_user_agent({ENV_UX_JOURNEY_USER_AGENT: custom})
        self.assertEqual(ua, custom)

    def test_rejects_headless_override(self) -> None:
        bad = (
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) HeadlessChrome/120.0.0.0 Safari/537.36"
        )
        ua = resolve_browser_user_agent({ENV_UX_JOURNEY_USER_AGENT: bad})
        self.assertEqual(ua, DEFAULT_UX_JOURNEY_BROWSER_USER_AGENT)
        self.assertNotIn("HeadlessChrome", ua)

    def test_blank_env_falls_back(self) -> None:
        ua = resolve_browser_user_agent({ENV_UX_JOURNEY_USER_AGENT: "   "})
        self.assertEqual(ua, DEFAULT_UX_JOURNEY_BROWSER_USER_AGENT)


if __name__ == "__main__":
    unittest.main()
