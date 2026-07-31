/**
 * Client-safe UX wave report markdown (no server/DB imports).
 */
import type { SoftScoreEntry, UxWaveDetail } from '@audion-v3/contracts'

export function buildWaveReportMarkdown(wave: UxWaveDetail, studyName: string): string {
  const lines = [
    `# UX Wave Report: ${wave.waveKey}`,
    ``,
    `Study: ${studyName}`,
    `Status: ${wave.status}`,
    `Runs: ${wave.runCount} · validEvidence: ${wave.validEvidenceCount}`,
    ``,
  ]
  if (wave.reportMarkdown?.trim()) {
    lines.push(`## Report`, ``, wave.reportMarkdown.trim(), ``)
  }
  if (wave.evaluation) {
    const a = wave.evaluation.aggregate
    lines.push(
      `## Aggregate`,
      ``,
      `- Task completion: ${(a.taskCompletionRate * 100).toFixed(1)}%`,
      `- Valid evidence: ${(a.validEvidenceRate * 100).toFixed(1)}%`,
      `- Mean friction (valid): ${a.meanFrictionValidOnly ?? '—'}`,
      ``,
      `## Hypotheses`,
      ``,
    )
    for (const h of wave.evaluation.hypotheses) {
      lines.push(`- **${h.id}** (${h.verdict}, conf ${h.confidence}): ${h.statement}`)
    }
    lines.push(``, `## Soft-Q`, ``)
    for (const [key, entry] of Object.entries(wave.evaluation.softScores)) {
      if (key === 'basis' || !entry || typeof entry !== 'object') continue
      const e = entry as SoftScoreEntry
      lines.push(`- **${key}**: ${e.value ?? '—'} (conf ${e.confidence}) — ${e.rationale}`)
    }
  }
  lines.push(``, `## Runs`, ``)
  for (const r of wave.runs) {
    lines.push(
      `### ${r.runKey}`,
      `- Segment: ${r.segment ?? '—'} · validEvidence: ${String(r.validEvidence)}`,
      `- Friction: ${r.frictionScore ?? '—'} · Finding: ${r.finding ?? '—'}`,
      ``,
    )
  }
  return lines.join('\n')
}
