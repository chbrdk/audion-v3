# AUDION soft-fork rebase notes

**Current vendored baseline:** `browser-use` **0.12.6** → package version `0.12.6+audion.7`  
**Target baseline (state of the art):** `browser-use` **0.13.7** → `0.13.7+audion.1`

## Why not a blind swap

Upstream 0.13.x adds a Rust beta agent (`browser_use.beta`) while keeping the Python agent.
Our product patches (persona DSL, live-frame hooks, tolerant AgentOutput, per-action hooks, web-search off)
live in the Python agent path and must be re-applied after each upstream bump.

## Rebase procedure

1. `git clone --depth 1 --branch 0.13.7 https://github.com/browser-use/browser-use.git /tmp/bu-0.13.7`
2. Diff `browser_use/` vs `audion_agent/` for structural renames.
3. Re-apply patches listed in [`audion-agent/CHANGELOG.md`](./audion-agent/CHANGELOG.md) (Phases 1–7).
4. Rename env kill-switches to `AUDION_AGENT_*`.
5. Run `audion-agent/tests` + `test_security.py` + a headless smoke `/run`.
6. Bump `pyproject.toml` version to `0.13.7+audion.1`.

## Interim policy

Ship the hardened 0.12.6+audion fork in V3 Coolify first (auth + SSRF).  
Complete the 0.13.7 rebase in-tree before marking Studies Wave Start “production-complete”.
Do **not** default to `browser_use.beta` (Rust) until recording/persona hooks are ported.
