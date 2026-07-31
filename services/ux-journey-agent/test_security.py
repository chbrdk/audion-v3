"""Unit tests for auth + SSRF guards (no browser required)."""

from __future__ import annotations

import os
import unittest
from unittest import mock

from fastapi import HTTPException

from security import assert_public_http_url, require_agent_secret


class SsrfTests(unittest.TestCase):
    def test_rejects_localhost(self) -> None:
        with self.assertRaises(HTTPException) as ctx:
            assert_public_http_url("http://localhost:3000/")
        self.assertEqual(ctx.exception.status_code, 400)

    def test_rejects_non_http(self) -> None:
        with self.assertRaises(HTTPException):
            assert_public_http_url("file:///etc/passwd")

    def test_allowlist_blocks_other_hosts(self) -> None:
        with mock.patch.dict(os.environ, {"UX_JOURNEY_URL_ALLOWLIST": "example.com"}):
            with mock.patch("security.socket.getaddrinfo", return_value=[
                (0, 0, 0, "", ("93.184.216.34", 443)),
            ]):
                assert_public_http_url("https://example.com/path")
            with self.assertRaises(HTTPException):
                assert_public_http_url("https://evil.example.org/")


class AuthTests(unittest.TestCase):
    def test_open_when_secret_unset(self) -> None:
        with mock.patch.dict(os.environ, {"UX_JOURNEY_AGENT_SECRET": ""}, clear=False):
            os.environ.pop("UX_JOURNEY_AGENT_SECRET", None)
            require_agent_secret(x_ux_journey_secret=None, authorization=None)

    def test_rejects_wrong_secret(self) -> None:
        with mock.patch.dict(os.environ, {"UX_JOURNEY_AGENT_SECRET": "s3cret"}):
            with self.assertRaises(HTTPException) as ctx:
                require_agent_secret(x_ux_journey_secret="nope", authorization=None)
            self.assertEqual(ctx.exception.status_code, 401)

    def test_accepts_matching_header(self) -> None:
        with mock.patch.dict(os.environ, {"UX_JOURNEY_AGENT_SECRET": "s3cret"}):
            require_agent_secret(x_ux_journey_secret="s3cret", authorization=None)


if __name__ == "__main__":
    unittest.main()
