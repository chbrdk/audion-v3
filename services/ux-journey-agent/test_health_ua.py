"""Smoke tests for /health browser UA deploy probe (no browser required)."""

from __future__ import annotations

import unittest
from unittest import mock

# Import after path is the service root when run via unittest discovery.
from browser_ua import DEFAULT_UX_JOURNEY_BROWSER_USER_AGENT


class HealthUaContractTests(unittest.TestCase):
    def test_health_exposes_safe_browser_ua(self) -> None:
        # Import lazily so missing FastAPI deps in some envs don't break UA unit tests.
        import main

        with mock.patch.dict("os.environ", {"OPENAI_API_KEY": "sk-test"}, clear=False):
            payload = main.health()
        self.assertEqual(payload["browserUserAgent"], DEFAULT_UX_JOURNEY_BROWSER_USER_AGENT)
        self.assertTrue(payload["browserUserAgentSafe"])
        self.assertNotIn("HeadlessChrome", payload["browserUserAgent"])


if __name__ == "__main__":
    unittest.main()
