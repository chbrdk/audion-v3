#!/usr/bin/env node
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const args = process.argv.slice(2);
let baseline, waves = [], out;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--baseline") baseline = args[++i];
  else if (args[i] === "--waves") { while (i + 1 < args.length && !args[i + 1].startsWith("--")) waves.push(args[++i]); }
  else if (args[i] === "--out") out = args[++i];
  else if (!args[i].startsWith("--")) waves.push(args[i]);
}
if (!baseline || !waves.length) { console.error("Usage: node compare-ebm-evaluations.mjs --baseline <path> --waves <path...> [--out <path>]"); process.exit(1); }

if (!out) out = `knowledge/ebm-comparison-${new Date().toISOString().slice(0, 10)}.json`;

const load = p => JSON.parse(readFileSync(resolve(p), "utf-8"));
const baselineData = load(baseline);
const wavesData = waves.map(load);

process.stderr.write(`Comparing baseline "${baselineData.waveId}" with ${wavesData.length} wave(s)\n`);

function mean(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }
function stddev(arr) { const m = mean(arr); return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length || 1)); }

const KPI_KEYS = ["taskCompletionRate", "validEvidenceRate", "meanFrictionValidOnly", "goalReachedRateValidOnly", "deeplinkCheatRate", "navH3Pass"];

const kpiTable = {};
for (const key of KPI_KEYS) {
  const bVal = baselineData.aggregate[key];
  const wVals = wavesData.map(w => w.aggregate[key]);
  const numVals = wVals.map(v => typeof v === "boolean" ? (v ? 1 : 0) : v);
  const bNum = typeof bVal === "boolean" ? (bVal ? 1 : 0) : bVal;
  kpiTable[key] = { baseline: bVal, waves: wVals, mean: +mean(numVals).toFixed(4), stddev: +stddev(numVals).toFixed(4), delta: +(mean(numVals) - bNum).toFixed(4) };
}

const hypothesisTable = {};
const hIds = (baselineData.hypotheses || []).map(h => h.id);
for (const hId of hIds) {
  const bH = baselineData.hypotheses.find(h => h.id === hId);
  const wHs = wavesData.map(w => (w.hypotheses || []).find(h => h.id === hId));
  const verdicts = wHs.map(h => h?.verdict);
  hypothesisTable[hId] = { baseline: { verdict: bH?.verdict, score: bH?.score }, waves: wHs.map(h => ({ verdict: h?.verdict, score: h?.score })), stable: verdicts.every(v => v === bH?.verdict) };
}

const softScoreTable = {};
const qKeys = Object.keys(baselineData.softScores || {}).filter(k => k.startsWith("Q"));
for (const qk of qKeys) {
  const bVal = baselineData.softScores[qk]?.value;
  const wVals = wavesData.map(w => w.softScores?.[qk]?.value);
  const numVals = wVals.filter(v => typeof v === "number");
  const bNum = typeof bVal === "number" ? bVal : null;
  softScoreTable[qk] = { baseline: bVal, waves: wVals, mean: numVals.length ? +mean(numVals).toFixed(2) : null, stddev: numVals.length ? +stddev(numVals).toFixed(2) : null, delta: numVals.length && bNum != null ? +(mean(numVals) - bNum).toFixed(2) : null };
}

const runStability = {};
const allRunIds = [...new Set([...baselineData.runs.map(r => r.runId), ...wavesData.flatMap(w => w.runs.map(r => r.runId))])];
for (const rid of allRunIds) {
  const allEvals = [baselineData, ...wavesData];
  const frictionScores = allEvals.map(e => e.runs.find(r => r.runId === rid)?.frictionScore).filter(v => v != null);
  const taskCompleted = allEvals.map(e => e.runs.find(r => r.runId === rid)?.taskCompleted).filter(v => v != null);
  runStability[rid] = { frictionScores, mean: +mean(frictionScores).toFixed(2), stddev: +stddev(frictionScores).toFixed(2), taskCompleted };
}

const comparison = {
  comparedAt: new Date().toISOString(),
  baselineWaveId: baselineData.waveId,
  waveIds: wavesData.map(w => w.waveId),
  kpiTable,
  hypothesisTable,
  softScoreTable,
  runStability,
};

writeFileSync(resolve(out), JSON.stringify(comparison, null, 2));
process.stderr.write(`Written comparison to ${out}\n`);
console.log(resolve(out));
