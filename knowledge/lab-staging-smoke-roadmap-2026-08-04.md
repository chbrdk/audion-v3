# Staging smoke — Human-vs-AI roadmap (`360ecb8`)

**Date:** 2026-08-04  
**Commit:** `360ecb8` (agent + web Coolify finished)  
**Project:** `proj-bosch-ebike-msd3hwtv`  
**Suite dump:** `/tmp/lab-roadmap-suite-2026-08-04.json`

## What we verified

| Check | Result |
|-------|--------|
| Lab B dual from-pack (Alex + Sam, no PATCH) | **Pass** — 2 runs seeded |
| Soft-Q Evaluate (LLM assist) | **Pass** — Q1–Q7 filled (pathfind wave had empty Soft-Q) |
| Nav honesty (no deeplink cheat) | **Pass** — stays on `/de/`, no `navigate` to tool URL |
| Nav H3 land on `produktkombinationen` | **Fail** — still home-loop / abandon |
| Try-budget default **4** live | **Pass after env fix** — Coolify had `=3`; set to `4` + agent redeploy → verify Nav `tryBeforeAbandon=4`, exploratory **4**, steps **6** |

## Runs

### Nav (`pack-ebm-persona-lab-nav`)

- Study: `study-persona-lab-nav-roadmap-2026-08-04-1332-msep68ak`
- Wave: `wave-persona-lab-nav-msep68cc`
- Job: `dcf553e0-8ee9-47f2-9e24-bca7be3acedc`
- Steps **5**, friction **8**, goal **false**, start URL `/de/`
- Soft-Q: Q2=2, Q3=2, Q7=4 (Schulnote); Q4 null (expected for nav slice narrative)

### Lab B dual (`pack-ebm-persona-lab-b`)

- Study: `study-persona-lab-b-dual-roadmap-2026-08-04-1332-msep6ab2`
- Wave: `wave-persona-lab-b-msep6ab8`
- Alex (`B-aufgabe1-nachruesten`): steps **5**, friction **8**, `tryBeforeAbandon` **3** (env), exploratory **3**
- Sam (`B-aufgabe1-nachruesten-patient`): steps **8**, friction **8**, `tryBeforeAbandon` **6**, exploratory **0**
- Soft-Q: Q2=2, Q3=2, Q7=4 from **2** validEvidence runs

## Try-budget verify (post env fix)

- Coolify agent env `UX_JOURNEY_TRY_BEFORE_ABANDON` → **4** (prod + preview), redeploy `y1427nvmj7w6h49bkvjaqxlf`
- Study: `study-persona-lab-nav-try4-verify-2026-08-04-mseq1wd7` / job `87a0a8cd-…`
- `tryBeforeAbandon=4`, `exploratoryAttempts=4`, steps **6**, still no H3 tool URL (honest abandon)

## Still open

Nav H3 landing on `produktkombinationen` — two-phase steering shipped; live still home-loops then quits.
