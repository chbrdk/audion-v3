# Staging smoke — path-finding deploy (`e56be68`)

**Date:** 2026-08-04  
**Agent:** `lfv0921nlqzl0qow9xse4it4` @ `e56be68` (0.13.7 + site-agnostic UI path-finding)  
**Project:** `proj-bosch-ebike-msd3hwtv`  
**Suite dump:** `/tmp/lab-pathfind-suite-2026-08-04.json`

## Results vs prior micro-lab live (`c96d84c`)

| Lab | Job | Steps | Friction | Goal | Deep-link cheat | vs prior | vs human |
|-----|-----|-------|----------|------|-----------------|----------|----------|
| **Nav H3** | `a1bbd0f8…` | **5** | **8** | false | **false** | Same fail H3 (stays on `/de/`) | Worse on landing; better honesty (no URL jump) |
| **Lab B** | (suite) | **5** | **8** | false | false | Same band (prior 5 / 8) | Closer on confusion/friction; humans often finish tool with noted abandon pressure |
| **Purchase** | | **9** | **8** | false | false | Prior pass at 8 steps | Still high-friction matrix narrative |
| **A Erstkontakt** | | **5** | **8** | false | false | Prior pass | Short try-then-quit ok |
| **C Kombination** | | **10** | **8** | false | false | Prior 7 steps pass | Product clicks present; incomplete finish |

## Verdict

- **Path-finding policy works:** Nav never deep-linked to `produktkombinationen`.
- **H3 still open:** agent sees Service cue but does not land on the tool URL.
- Soft-Q fields came back empty on evaluate this run (web assist gap / env) — friction+findings still usable for correlate.

Studies: `study-persona-lab-nav-pathfind-probe-2026-08-04-1153-mselnk3k` · Lab B / Purchase / A+C pathfind stamps under same suite file.
