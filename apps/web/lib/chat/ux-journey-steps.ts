import type { ChatUxJourneyStep } from '@audion-v3/contracts'
import type { UxJourneyAgentStep } from '../ux-journey-agent-client'
import { paths } from '../paths'

/** Map agent-relative media paths onto the authenticated BFF proxy. */
export function rewriteAgentMediaUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null
  const raw = url.trim()
  if (raw.startsWith('data:') || raw.startsWith('http://') || raw.startsWith('https://')) {
    return raw
  }
  if (raw.startsWith('/api/')) return raw
  if (raw.startsWith('/run/')) return `/api/ux-journey-agent${raw}`
  return raw
}

function trimMetaField(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const t = value.trim()
  return t || null
}

/** Strip bot index markers so next_goal can backfill a weak thinkAloud.next. */
export function cleanNextGoalForPersona(goal: string | null | undefined): string | null {
  if (!goal?.trim()) return null
  const cleaned = goal
    .replace(/\s*\[\d+\]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[.\s]+|[.\s]+$/g, '')
  return cleaned || null
}

/** Truncated / unfinished persona "next" stubs like "Auf…" or single tokens. */
export function thinkAloudNextIsWeak(text: string | null | undefined): boolean {
  if (!text?.trim()) return true
  const s = text.trim()
  if (s.length < 28) return true
  if (s.endsWith('…') || s.endsWith('...')) return true
  if (!/\s/.test(s)) return true
  return false
}

function enrichThinkAloudNext(
  thinkAloud: NonNullable<ChatUxJourneyStep['thinkAloud']>,
  nextGoal: string | null,
): NonNullable<ChatUxJourneyStep['thinkAloud']> {
  const cleaned = cleanNextGoalForPersona(nextGoal)
  if (!cleaned) return thinkAloud
  const current = thinkAloud.next?.trim() || ''
  const currentCore = current.replace(/[.…]+$/u, '').trim()
  if (thinkAloudNextIsWeak(current)) {
    return { ...thinkAloud, next: cleaned }
  }
  if (
    currentCore &&
    cleaned.length > currentCore.length + 8 &&
    cleaned.toLowerCase().startsWith(currentCore.toLowerCase())
  ) {
    return { ...thinkAloud, next: cleaned }
  }
  return thinkAloud
}

function clampValence(n: number): -2 | -1 | 0 | 1 | 2 {
  if (n <= -2) return -2
  if (n === -1) return -1
  if (n === 0) return 0
  if (n === 1) return 1
  return 2
}

function feelFromObservations(
  observations: ChatUxJourneyStep['observations'],
): { label: string; valence: -2 | -1 | 0 | 1 | 2 } | null {
  if (!observations?.length) return null
  const first = observations[0]
  if (!first || typeof first.polarity !== 'number') return null
  const valence = clampValence(Math.trunc(first.polarity))
  const label = valence <= -1 ? 'irritiert' : valence >= 1 ? 'positiv' : 'neutral'
  return { label, valence }
}

function normalizeObservations(raw: unknown): ChatUxJourneyStep['observations'] {
  if (!Array.isArray(raw) || !raw.length) return null
  const out: NonNullable<ChatUxJourneyStep['observations']> = []
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue
    const row = entry as Record<string, unknown>
    const category = typeof row.category === 'string' ? row.category.trim() : ''
    const note = typeof row.note === 'string' ? row.note.trim() : ''
    const severity = row.severity
    if (!category || !note) continue
    if (severity !== 'low' && severity !== 'medium' && severity !== 'high') continue
    const polarity = typeof row.polarity === 'number' ? row.polarity : Number(row.polarity)
    if (!Number.isFinite(polarity)) continue
    out.push({
      category,
      polarity,
      severity,
      note,
      fix: typeof row.fix === 'string' && row.fix.trim() ? row.fix.trim() : null,
    })
  }
  return out.length ? out : null
}

function normalizeThinkAloud(raw: unknown): ChatUxJourneyStep['thinkAloud'] {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const pick = (k: string): string | null => trimMetaField(row[k])
  const feelRaw = row.feel
  let feel: NonNullable<ChatUxJourneyStep['thinkAloud']>['feel'] = null
  if (feelRaw && typeof feelRaw === 'object') {
    const f = feelRaw as Record<string, unknown>
    const label = typeof f.label === 'string' ? f.label.trim() : ''
    const valence = typeof f.valence === 'number' ? clampValence(Math.trunc(f.valence)) : null
    if (label && valence != null) feel = { label, valence }
  }
  const out = {
    seen: pick('seen'),
    think: pick('think'),
    priorKnow: pick('priorKnow'),
    learned: pick('learned'),
    next: pick('next'),
    why: pick('why'),
    feel,
  }
  if (
    !out.seen &&
    !out.think &&
    !out.priorKnow &&
    !out.learned &&
    !out.next &&
    !out.why &&
    !out.feel
  ) {
    return null
  }
  return out
}

/** Legacy runs: synthesize thinkAloud from reasoning + reasoningMeta. */
export function synthesizeThinkAloudFallback(step: {
  reasoning?: string | null
  reasoningMeta?: ChatUxJourneyStep['reasoningMeta']
  observations?: ChatUxJourneyStep['observations']
}): NonNullable<ChatUxJourneyStep['thinkAloud']> {
  const think = trimMetaField(step.reasoning)
  const learned = trimMetaField(step.reasoningMeta?.memory)
  const next = cleanNextGoalForPersona(step.reasoningMeta?.next_goal ?? null)
  const feel = feelFromObservations(step.observations ?? null)
  return {
    seen: null,
    think,
    priorKnow: null,
    learned,
    next,
    why: null,
    feel,
  }
}

export function toChatUxJourneySteps(steps: UxJourneyAgentStep[] | undefined | null): ChatUxJourneyStep[] {
  if (!Array.isArray(steps) || !steps.length) return []
  return steps.map((s) => {
    const rm = s.reasoningMeta
    const evaluation = trimMetaField(rm?.evaluation_previous_goal)
    const memory = trimMetaField(rm?.memory)
    const nextGoal = trimMetaField(rm?.next_goal)
    const reasoningMeta =
      evaluation || memory || nextGoal
        ? {
            evaluation_previous_goal: evaluation,
            memory,
            next_goal: nextGoal,
          }
        : null
    const observations = normalizeObservations(s.observations)
    let thinkAloud = normalizeThinkAloud((s as { thinkAloud?: unknown }).thinkAloud)
    if (!thinkAloud) {
      thinkAloud = synthesizeThinkAloudFallback({
        reasoning: s.reasoning,
        reasoningMeta,
        observations,
      })
    } else {
      thinkAloud = enrichThinkAloudNext(thinkAloud, nextGoal)
    }
    return {
      step: s.step,
      action: s.action,
      target: s.target,
      result: typeof s.result === 'string' ? s.result : undefined,
      reasoning: s.reasoning,
      reasoningMeta,
      thinkAloud,
      observations,
      screenshot: typeof (s as { screenshot?: string }).screenshot === 'string'
        ? (s as { screenshot?: string }).screenshot
        : null,
      screenshotUrl: rewriteAgentMediaUrl(s.screenshotUrl),
      timestamp: s.timestamp,
    }
  })
}

export function chatUxJourneyStepShotSrc(step: ChatUxJourneyStep): string | null {
  if (step.screenshot?.startsWith('data:')) return step.screenshot
  return rewriteAgentMediaUrl(step.screenshotUrl) ?? rewriteAgentMediaUrl(step.screenshot)
}

export function bffVideoUrlForJob(jobId: string, agentVideoUrl?: string | null): string {
  const rewritten = rewriteAgentMediaUrl(agentVideoUrl)
  if (rewritten) return rewritten
  return paths.routes.apiUxJourneyAgentVideo(jobId)
}

function actionLabel(action?: string): string {
  const a = (action || '').toLowerCase()
  if (a === 'navigate') return 'Navigate'
  if (a === 'click') return 'Click'
  if (a === 'scroll') return 'Scroll'
  if (a === 'input' || a === 'type' || a === 'send_keys') return 'Type'
  if (a === 'done') return 'Done'
  if (a) return a.charAt(0).toUpperCase() + a.slice(1)
  return 'Step'
}

/** Short chip / bubble label for a selected inspect step. */
export function chatUxJourneyStepLabel(step: ChatUxJourneyStep, index = 0): string {
  const n = step.step ?? index + 1
  return `Step ${String(n).padStart(2, '0')} · ${actionLabel(step.action)}`
}

/**
 * Enrich a user chat message with the selected inspect step so the persona
 * can answer in context of that moment.
 */
export function composeMessageWithUxStepContext(
  userMessage: string,
  step: ChatUxJourneyStep,
  index = 0,
): { display: string; api: string } {
  const message = userMessage.trim()
  const label = chatUxJourneyStepLabel(step, index)
  const n = step.step ?? index + 1
  const ta = step.thinkAloud ?? synthesizeThinkAloudFallback(step)
  const lines = [
    `The user is asking about UX journey step ${n} (${actionLabel(step.action)}).`,
    'Answer in first person as the persona who just took this step. Ground your reply in the step evidence below.',
    '',
    `Step: ${n}`,
    `Action: ${actionLabel(step.action)}`,
  ]
  if (step.target?.trim()) lines.push(`Target: ${step.target.trim()}`)
  if (ta?.seen?.trim()) lines.push(`Gesehenes: ${ta.seen.trim()}`)
  if (ta?.think?.trim()) lines.push(`Denken: ${ta.think.trim()}`)
  else if (step.reasoning?.trim()) lines.push(`Denken: ${step.reasoning.trim()}`)
  if (ta?.priorKnow?.trim()) lines.push(`Schon gewusst: ${ta.priorKnow.trim()}`)
  if (ta?.learned?.trim()) lines.push(`Neu gelernt: ${ta.learned.trim()}`)
  if (ta?.next?.trim()) lines.push(`Nächster Schritt: ${ta.next.trim()}`)
  if (ta?.why?.trim()) lines.push(`Warum: ${ta.why.trim()}`)
  if (ta?.feel?.label?.trim()) {
    lines.push(`Gefühl: ${ta.feel.label.trim()} (valence ${ta.feel.valence})`)
  }
  if (step.result?.trim()) lines.push(`Ergebnis: ${step.result.trim()}`)
  if (step.observations?.length) {
    lines.push(
      `Observations: ${step.observations.map((o) => `${o.category}/${o.polarity}: ${o.note}`).join(' · ')}`,
    )
  }
  lines.push('', `User question: ${message}`)

  return {
    display: `About ${label}\n${message}`,
    api: lines.join('\n'),
  }
}

/** Compact scorecard line for the inspect dock. */
export function formatScorecardSummary(
  scorecard: Record<string, unknown> | null | undefined,
): string | null {
  if (!scorecard || typeof scorecard !== 'object') return null
  const friction =
    typeof scorecard.frictionScore === 'number' ? scorecard.frictionScore : null
  const fit =
    typeof scorecard.personaFitScore === 'number' ? scorecard.personaFitScore : null
  const strengths = Array.isArray(scorecard.topStrengths)
    ? scorecard.topStrengths.filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
    : []
  const weaknesses = Array.isArray(scorecard.topWeaknesses)
    ? scorecard.topWeaknesses.filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
    : []
  const parts: string[] = []
  if (friction != null) parts.push(`Friction ${friction}/10`)
  if (fit != null) parts.push(`Persona fit ${fit}/10`)
  if (strengths[0]) parts.push(`+ ${strengths[0]}`)
  if (weaknesses[0]) parts.push(`− ${weaknesses[0]}`)
  return parts.length ? parts.join(' · ') : null
}

/** Split step-follow-up display content into meta label + question body. */
export function parseUxStepFollowUpDisplay(content: string): {
  meta: string | null
  body: string
} {
  const trimmed = content.trim()
  const match = trimmed.match(/^About (Step \d{2} · [^\n]+)\n([\s\S]*)$/)
  if (!match) return { meta: null, body: content }
  return { meta: match[1]!.trim(), body: match[2]!.trim() }
}
