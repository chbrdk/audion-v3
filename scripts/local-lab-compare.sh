#!/usr/bin/env bash
# Compare two local lab JSON dumps (impatient vs patient) for L4 A/B.
# Usage:
#   ./scripts/local-lab-compare.sh /tmp/local-lab-run-IMP.json /tmp/local-lab-run-PAT.json
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
A="${1:?impatient json}"
B="${2:?patient json}"

PYTHONPATH="$ROOT/services/ux-journey-agent" python3 - <<PY
import json, sys
from pathlib import Path
from persona_lab_l4 import l4_contrast_checks

def load(p):
    job = json.load(open(p))
    res = job.get("result") or {}
    steps = res.get("steps") or []
    sc = res.get("scorecard") or {}
    sb = res.get("stepBudget") or {}
    ca = res.get("confusionAbandon") or {}
    conf = sc.get("confusion") or {}
    pp = (res.get("personaPolicy") or {}).get("dimensions") or {}
    return {
        "file": str(p),
        "persona": (res.get("persona") or {}).get("name") or (res.get("persona") or {}).get("id"),
        "steps": len(steps),
        "actions": [s.get("action") for s in steps[:12]],
        "time_pressure": pp.get("time_pressure"),
        "maxSteps": sb.get("maxSteps"),
        "impatientApplied": sb.get("impatientApplied"),
        "abandonForced": bool(ca.get("forced")),
        "abandonCount": ca.get("count"),
        "abandonEnabled": ca.get("enabled"),
        "friction": sc.get("frictionScore"),
        "fit": sc.get("personaFitScore"),
        "goal": (sc.get("coverage") or {}).get("goalReached"),
        "tagCount": conf.get("tagCount"),
        "success": res.get("success"),
    }

a = load(Path("$A"))
b = load(Path("$B"))

def row(label, ka, kb):
    print(f"{label:22} {str(ka):28} {str(kb)}")

print(f"{'metric':22} {'A (expect impatient)':28} {'B (expect patient)'}")
print("-" * 80)
row("persona", a["persona"], b["persona"])
row("time_pressure", a["time_pressure"], b["time_pressure"])
row("steps", a["steps"], b["steps"])
row("maxSteps budget", a["maxSteps"], b["maxSteps"])
row("impatientApplied", a["impatientApplied"], b["impatientApplied"])
row("abandonEnabled", a["abandonEnabled"], b["abandonEnabled"])
row("abandonForced", a["abandonForced"], b["abandonForced"])
row("abandonCount", a["abandonCount"], b["abandonCount"])
row("friction", a["friction"], b["friction"])
row("fit", a["fit"], b["fit"])
row("goalReached", a["goal"], b["goal"])
row("confusionTags", a["tagCount"], b["tagCount"])
row("success", a["success"], b["success"])
print()
print("actions A:", a["actions"])
print("actions B:", b["actions"])

checks = l4_contrast_checks(a, b)
passed = sum(1 for _, ok in checks if ok)
print()
print(f"L4 checks {passed}/{len(checks)}")
for name, ok in checks:
    print(f"  [{'PASS' if ok else 'FAIL'}] {name}")
sys.exit(0 if passed >= 3 else 1)
PY
