# Cleanup inventory — audion-v3

**Date:** 2026-09-26  
**Inventor:** agent (suite-cleanup Inventor)  
**Playbook:** plexon-v3 `knowledge/suite-cleanup.md`  
**Keep/drop backlog:** [`keep-drop-backlog.md`](keep-drop-backlog.md)

Scope this pass: `tmp/migrate-v2-v3/`, v2→v3 migrate tooling, one-off knowledge run dumps (html/json), orphan ops/lab notes. **Sweeper Prio 5:** all listed `drop_safe` orphans purged 2026-09-26.

| Path | Klasse | Nachweis | Notes |
|---|---|---|---|
| `tmp/migrate-v2-v3/` (`plan.json`, `id-map.json`, `v2-project.json`) | drop_safe **done** 2026-09-26 | Purged | Regenerierbar via `scripts/migrate-project-v2-to-v3.mjs`. |
| `scripts/migrate-project-v2-to-v3.mjs` | keep | `knowledge/paths.md` (canonical migrate); gekoppelt an `knowledge/migrate-project-v2-to-v3.md`; keep-drop „Drop if migration complete“ → Gatekeeper | Operatives Plexon-first-Migrate-Tool; erst droppen wenn Migration abgeschlossen und Backlog aktualisiert. |
| `knowledge/migrate-project-v2-to-v3.md` | keep | `knowledge/paths.md`; Script-Kopfkommentar | Runbook für verbleibende v2→v3 Collections; Spec-/Ops-Bezug. |
| `knowledge/ebm-comparison-2026-08-19.json` | drop_safe **done** 2026-09-26 | Purged | Regenerierbar via `compare-ebm-evaluations.mjs`. |
| `knowledge/ebm-ai-concrete-results-2026-08-19.html` | drop_safe **done** 2026-09-26 | Purged | Statischer HTML-Lauf-Dump. |
| `knowledge/ebm-human-vs-ai-findings-2026-08-19.html` | drop_safe **done** 2026-09-26 | Purged | Orphan HTML. |
| `knowledge/bsh-home-concrete-results-2026-08-19.html` | drop_safe **done** 2026-09-26 | Purged | Canonical in paths ist `.pdf`. |
| `knowledge/bsh-human-vs-ai-2026-08-19.html` | drop_safe **done** 2026-09-26 | Purged | Gleiche BSH-Welle. |
| `knowledge/ueq-ebike-*-2026-08-19.html` (Benchmark, human-vs-ai, ai-voices, gesamtbericht, concrete-results) | drop_safe **done** 2026-09-26 | Purged | JSON + Scripts bleiben SSOT. |
| `knowledge/ueq-ebike-benchmark-2026-08-19.json` | keep | `apps/web/__tests__/ueq-ebike-benchmark.test.ts`; mehrere `scripts/*.py` | Contract-/Lab-Evidence; nicht mit HTML-Drops mischen. |
| `knowledge/ueq-ebike-human-vs-ai-2026-08-19.json` | keep | Gleicher Test + `export-ueq-ebike-gesamtbericht.py` | |
| `knowledge/ueq-ebike-ai-voices-2026-08-19.json` | keep | Test + Export-Skripte | |
| `knowledge/ueq-ebike-gesamtbericht-2026-08-19.json` | keep | Export-Skript; Metadaten für Gesamtbericht | |
| `knowledge/ux-journey-fail-buckets-*-2026-08-*.json` | keep | `knowledge/paths.md`, Lab-Notes (`lab-staging-smoke-luna-vision`, `ux-agent-*`); `scripts/bucket-ux-journey-fail-reasons.py` | Aggregierte Fail-Buckets; referenzieren (optionale) `knowledge/ueq-ebike-runs/` Pfade. |
| `knowledge/ebm-produktkombinationen-evaluation-audion-2026-08-19-wave-{1,2,3}.json` | keep | Nur in orphan HTML erwähnt; unsicher → keep | EBM-Lab-Roh-Evaluierungen; behalten bis Gatekeeper klärt ob archiviert oder in pathfind-Baseline konsolidiert. |
| `knowledge/ebm-produktkombinationen-evaluation-audion-2026-08-04-pathfind.json` | keep | `specs/domain/ebm-evaluation-export.md`, `ebm-batch-scripts.test.ts`, viele UX-Study-Tests | Baseline-Evidence — nicht droppen. |
| `knowledge/coolify-web-deploy-fail-copy-next-2026-08-03.md` | drop_safe **done** 2026-09-26 | Purged | Einmal-Deploy-Notiz. |
| `knowledge/knowledge-sync-after-bind-2026-08-03.md` | drop_safe **done** 2026-09-26 | Purged | Orphan Ops-Notiz. |
| `knowledge/coolify-msqdx-audion-v3-2026-08-03.md` | keep | `knowledge/deploy-urls.md`, `coolify-deploy-api-2026-08-03.md` | Coolify-Inventar — Live-Deploy-Bezug. |
| `knowledge/cloudfront-403-bosch-headless-ua-2026-08-03.md` | keep | `apps/web/lib/paths.ts`, `services/ux-journey-agent/browser_ua.py`, `main.py`, `paths.md` | Runtime-relevante UA-Dokumentation. |
| `knowledge/flyout-ds-2026-07-30.md` | keep | `paths.md` (Chat flyouts) | DS-Migrationsnotiz mit Produktbezug. |
| `knowledge/v2-v3-feature-parity.md` | keep | `knowledge/ux-studies.md`, `remaining-gaps.md`, manuelle Parity-Checkliste | Phase-1-Parity-SSOT. |
| `knowledge/v2-v3-runtime-separation.md` | keep | `knowledge/paths.md`, `remaining-gaps.md` | Trennung v2 Prod vs v3 — weiterhin relevant. |
| `knowledge/persona-migration-map.md` | keep | Migration-/Workspace-Docs (v2→v3) | Referenz solange v2-Daten existieren. |
| `knowledge/project-migration-map.md` | keep | `specs/domain/project-workspace.md` | Spec-linked migration map. |
| `knowledge/fixtures/perception-human-gold-b.json` | keep | `apps/web/lib/paths.ts`, `services/ux-journey-agent/perception_gold.py`, Tests | Fixture mit Code- + Agent-Refs. |
| `scripts/export-persona-chats.mjs` | keep | `knowledge/paths.md`, `persona-chat-corpus-analysis.md`, `coolify-rest-env-ops-2026-09-20.md` | Ops-Export; Output unter `.tmp/persona-chats/` (gitignored). |
| `scripts/compare-ebm-evaluations.mjs` | keep | `apps/web/__tests__/ebm-batch-scripts.test.ts` | Getestetes Lab-Tool. |
| `scripts/run-ueq-ebike-batch.sh` (+ infer/build/export UEQ Python) | keep | `knowledge/paths.md`, `ueq-ebike-test-plan-2026-08-19.md`, Tests | Lab-Repro-Pipeline; nicht mit HTML-Artefakten verwechseln. |
| `knowledge/ueq-ebike-runs/` (Verzeichnis, oft leer/untracked) | defer | Skripte default hierhin; nicht zwingend im Git-Tree | Raw Agent-Runs — bewusst lokal/schwer; kein Massen-Drop ohne Run-Archiv-Entscheid. |
| Persona fixture path `fixtures` vs Live `api` | reshape | keep-drop backlog „Reshape“ | Env-gesteuert; Fixture-Pfad bis Live-only-Mandat behalten. |
| Share-Links Hub writer (ephemeral chat links) | defer | keep-drop backlog „Defer“ | Bewusst später; keine Cleanup-Welle. |

## Kurzliste `drop_safe` (Prio 5 Sweeper — **done** 2026-09-26)

Alle 9 Orphans oben als `drop_safe **done**` — keine offenen Sweeper-Ziele aus dieser Liste.

**Nicht** droppen (noch): `scripts/migrate-project-v2-to-v3.mjs` / `migrate-project-v2-to-v3.md` — erst nach expliziter „Migration complete“-Freigabe im Backlog.
