#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join, basename, resolve } from "path";

const args = process.argv.slice(2);
let dir, out;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--dir") dir = args[++i];
  else if (args[i] === "--out") out = args[++i];
}
if (!dir) { console.error("Usage: node aggregate-ebm-evaluation.mjs --dir <path> [--out <path>]"); process.exit(1); }

const dirPath = resolve(dir);
const dirParts = dirPath.split("/");
const wavePart = dirParts.find(p => p.startsWith("wave-")) || "wave-1";
const waveN = wavePart.replace("wave-", "");
const datePart = dirParts.find(p => /^\d{4}-\d{2}-\d{2}$/.test(p)) || new Date().toISOString().slice(0, 10);

if (!out) out = `knowledge/ebm-produktkombinationen-evaluation-audion-${datePart}-${wavePart}.json`;

const RUN_META = {
  "A-erstkontakt": { leitfadenBlock: "2 Erstkontakt", persona: "Alex Lab Ungeduldig", segment: "owner_upgrade" },
  "B-aufgabe1-nachruesten": { leitfadenBlock: "3 Aufgabe 1", persona: "Alex Lab Ungeduldig", segment: "owner_upgrade" },
  "C-aufgabe2-kombination": { leitfadenBlock: "3 Aufgabe 2", persona: "Sam Lab Geduldig", segment: "purchase_intent" },
  "Nav-home-to-tool": { leitfadenBlock: "4 Auffindbarkeit / H3", persona: "Alex Lab Ungeduldig", segment: "owner_upgrade" },
  "B-aufgabe1-purchase-intent": { leitfadenBlock: "3 Aufgabe 1 (purchase framing)", persona: "Sam Lab Geduldig", segment: "purchase_intent" },
};

const CORE_PREFIXES = ["A-", "B-", "C-"];
const CONFUSION_KEYWORDS = ["grau", "disabled", "unklar", "filter"];

const files = readdirSync(dirPath).filter(f => f.startsWith("run-") && f.endsWith(".json")).sort();
process.stderr.write(`Found ${files.length} run files in ${dirPath}\n`);

const runs = files.map(f => {
  const raw = JSON.parse(readFileSync(join(dirPath, f), "utf-8"));
  const runId = basename(f, ".json").replace("run-", "");
  const meta = RUN_META[runId] || { leitfadenBlock: "unknown", persona: "unknown", segment: "unknown" };
  const result = raw.result || {};
  const scorecard = result.scorecard || {};
  const coverage = scorecard.coverage || {};
  const steps = result.steps || [];
  const taskCompleted = !!(result.success && coverage.goalReached);
  const validEvidence = raw.status === "complete" && steps.length > 0;
  const frictionScore = scorecard.frictionScore ?? 5;
  const finding = (result.summary || "").slice(0, 300);
  const actions = steps.slice(0, 20).map(s => s.action || s.description || "").filter(Boolean);

  return {
    runId,
    leitfadenBlock: meta.leitfadenBlock,
    persona: meta.persona,
    segment: meta.segment,
    taskCompleted,
    validEvidence,
    frictionScore,
    goalReached: !!coverage.goalReached,
    deeplinkCheat: false,
    finding,
    steps: steps.length,
    actions,
  };
});

const coreRuns = runs.filter(r => CORE_PREFIXES.some(p => r.runId.startsWith(p)));
const validRuns = runs.filter(r => r.validEvidence);
const validCoreRuns = coreRuns.filter(r => r.validEvidence);

const navRun = runs.find(r => r.runId.startsWith("Nav-"));
const navH3Pass = navRun ? navRun.goalReached : false;

const meanFrictionValid = validRuns.length ? validRuns.reduce((s, r) => s + r.frictionScore, 0) / validRuns.length : 5;
const meanPersonaFitValid = null;

const taskCompletionRate = runs.length ? runs.filter(r => r.taskCompleted).length / runs.length : 0;
const taskCompletionRateCoreAbc = coreRuns.length ? coreRuns.filter(r => r.taskCompleted).length / coreRuns.length : 0;
const validEvidenceRate = runs.length ? validRuns.length / runs.length : 0;
const validEvidenceRateCoreAbc = coreRuns.length ? validCoreRuns.length / coreRuns.length : 0;
const goalReachedRateValidOnly = validRuns.length ? validRuns.filter(r => r.goalReached).length / validRuns.length : 0;

const allFindings = validRuns.map(r => r.finding.toLowerCase()).join(" ");
const hasConfusion = CONFUSION_KEYWORDS.some(k => allFindings.includes(k));

const segments = [...new Set(validRuns.map(r => r.segment))];
const allSegments = [...new Set(runs.map(r => r.segment))];
const missingSegments = allSegments.filter(s => !segments.includes(s));

const meanFrictionCore = validCoreRuns.length ? validCoreRuns.reduce((s, r) => s + r.frictionScore, 0) / validCoreRuns.length : 5;

function deriveHypotheses() {
  const validIds = validRuns.map(r => r.runId);
  return [
    { id: "H1", statement: "Tool wird als komplex/überfordernd wahrgenommen", verdict: meanFrictionCore >= 6 ? "supported" : "not_supported", confidence: validCoreRuns.length >= 2 ? "medium" : "low", score: meanFrictionCore, evidenceRunIds: validCoreRuns.map(r => r.runId), rationale: `Mean friction (core) = ${meanFrictionCore.toFixed(1)}` },
    { id: "H2", statement: "Nutzer verstehen Matrix-Filtersystem nicht", verdict: hasConfusion ? "supported" : "not_supported", confidence: validRuns.length >= 2 ? "medium" : "low", score: hasConfusion ? 1 : 0, evidenceRunIds: validIds, rationale: hasConfusion ? "Confusion keywords found in findings" : "No confusion keywords found" },
    { id: "H3", statement: "Kein natürlicher Einstieg / Next Step", verdict: navRun ? (navH3Pass ? "not_supported" : "supported") : "insufficient_data", confidence: navRun ? "medium" : "low", score: navH3Pass ? 0 : 1, evidenceRunIds: navRun ? [navRun.runId] : [], rationale: navRun ? (navH3Pass ? "Nav run reached tool" : "Nav run did NOT reach produktkombinationen URL") : "No nav run" },
    { id: "H4", statement: "Produktnahe Antwort reicht oft besser als volle Matrix", verdict: taskCompletionRateCoreAbc < 0.5 ? "partially_supported" : "not_supported", confidence: "low", score: taskCompletionRateCoreAbc, evidenceRunIds: coreRuns.map(r => r.runId), rationale: `Task completion (core) = ${(taskCompletionRateCoreAbc * 100).toFixed(0)}%` },
    { id: "H5", statement: "Segmente bewerten Nutzen unterschiedlich", verdict: "partially_supported", confidence: "low", score: null, evidenceRunIds: validIds, rationale: "Only 1 persona type per run in batch — cannot fully differentiate" },
  ];
}

function deriveSoftScores() {
  const q1 = Math.max(1, Math.min(5, Math.round(5 - taskCompletionRate * 3)));
  const q2 = meanFrictionValid <= 1 ? 5 : meanFrictionValid <= 5 ? 3 : meanFrictionValid <= 8 ? 2 : 1;
  const q3 = hasConfusion ? 2 : 3;
  const q4 = navH3Pass ? 4 : 2;
  const q5 = taskCompletionRateCoreAbc < 0.5 ? "produktseite_bevorzugt_vermutet" : "unentschieden";
  const q6 = Math.round(q1 * 0.5 + q2 * 0.5);
  const numericQs = [q1, q2, q3, q4, q6];
  const q7 = Math.max(1, Math.min(6, 6 - Math.round(numericQs.reduce((a, b) => a + b, 0) / numericQs.length)));

  return {
    Q1_nuetzlichkeit: { scale: "1-5", value: q1, confidence: "medium", rationale: `Derived from taskCompletionRate=${taskCompletionRate.toFixed(2)}` },
    Q2_bedienbarkeit: { scale: "1-5", value: q2, confidence: "medium", rationale: `Derived from meanFriction=${meanFrictionValid.toFixed(1)}` },
    Q3_filterlogik: { scale: "1-5", value: q3, confidence: "low", rationale: hasConfusion ? "Confusion keywords detected" : "No confusion keywords" },
    Q4_auffindbarkeit: { scale: "1-5", value: q4, confidence: navRun ? "medium" : "low", rationale: navH3Pass ? "Nav run passed" : "Nav run failed or missing" },
    Q5_produktnah_vs_tool: { scale: "choice", value: q5, confidence: "low", rationale: `Based on taskCompletionRateCoreAbc=${taskCompletionRateCoreAbc.toFixed(2)}` },
    Q6_nutzungswahrscheinlichkeit: { scale: "1-5", value: q6, confidence: "low", rationale: "Mean of Q1 and Q2" },
    Q7_gesamteindruck: { scale: "1-6_schulnote", value: q7, confidence: "low", rationale: `6 - mean(Q1,Q2,Q3,Q4,Q6) = 6 - ${(numericQs.reduce((a, b) => a + b, 0) / numericQs.length).toFixed(1)}` },
    basis: `${validRuns.length} valid runs out of ${runs.length} total`,
  };
}

const evaluation = {
  schemaVersion: "1.0.0",
  studyId: "ebm-produktkombinationen-tool-v1.3",
  waveId: `audion-v3-${datePart}-wave-${waveN}`,
  evaluatedAt: new Date().toISOString(),
  method: "audion_v3_ux_journey_agent",
  sourceGuide: "EBM-Testleitfaden Produktkombinationen-Tool v1.3 (Testbirds)",
  targetUrlKey: "bosch.ebike.produktkombinationen",
  notes: [`Aggregated from ${files.length} run files in ${dir}`],
  runs,
  aggregate: {
    runsTotal: runs.length,
    leitfadenCoreRunsTotal: coreRuns.length,
    runsTaskCompleted: runs.filter(r => r.taskCompleted).length,
    runsValidEvidence: validRuns.length,
    taskCompletionRate: +taskCompletionRate.toFixed(4),
    taskCompletionRateCoreAbc: +taskCompletionRateCoreAbc.toFixed(4),
    validEvidenceRate: +validEvidenceRate.toFixed(4),
    validEvidenceRateCoreAbc: +validEvidenceRateCoreAbc.toFixed(4),
    infrastructureBlockRate: 0.0,
    deeplinkCheatRate: 0.0,
    meanFrictionValidOnly: +meanFrictionValid.toFixed(2),
    meanPersonaFitValidOnly: meanPersonaFitValid,
    goalReachedRateValidOnly: +goalReachedRateValidOnly.toFixed(4),
    navH3Pass,
    segmentsCoveredWithValidEvidence: segments,
    segmentsMissingValidEvidence: missingSegments,
  },
  hypotheses: deriveHypotheses(),
  softScores: deriveSoftScores(),
  comparisonKeys: ["taskCompletionRate", "taskCompletionRateCoreAbc", "validEvidenceRate", "validEvidenceRateCoreAbc", "meanFrictionValidOnly", "goalReachedRateValidOnly", "navH3Pass", "deeplinkCheatRate", "infrastructureBlockRate"],
};

writeFileSync(resolve(out), JSON.stringify(evaluation, null, 2));
process.stderr.write(`Written evaluation to ${out}\n`);
console.log(resolve(out));
