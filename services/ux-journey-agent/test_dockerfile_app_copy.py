"""Dockerfile must ship every module imported by main.py."""

from __future__ import annotations

import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent


class DockerfileAppCopyTests(unittest.TestCase):
    def test_copies_browser_ua_module(self) -> None:
        df = (ROOT / "Dockerfile").read_text(encoding="utf-8")
        self.assertIn("COPY browser_ua.py", df)
        self.assertTrue((ROOT / "browser_ua.py").is_file())
        self.assertIn("from browser_ua import", (ROOT / "main.py").read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
