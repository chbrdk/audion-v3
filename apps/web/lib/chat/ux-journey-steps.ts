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
    return {
      step: s.step,
      action: s.action,
      target: s.target,
      result: typeof s.result === 'string' ? s.result : undefined,
      reasoning: s.reasoning,
      reasoningMeta,
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
 *
 * `display` keeps a parseable first line (`About Step NN · Action`) for the bubble meta.
 */
export function composeMessageWithUxStepContext(
  userMessage: string,
  step: ChatUxJourneyStep,
  index = 0,
): { display: string; api: string } {
  const message = userMessage.trim()
  const label = chatUxJourneyStepLabel(step, index)
  const n = step.step ?? index + 1
  const lines = [
    `The user is asking about UX journey step ${n} (${actionLabel(step.action)}).`,
    'Answer in first person as the persona who just took this step. Ground your reply in the step evidence below.',
    '',
    `Step: ${n}`,
    `Action: ${actionLabel(step.action)}`,
  ]
  if (step.target?.trim()) lines.push(`Target: ${step.target.trim()}`)
  if (step.reasoning?.trim()) lines.push(`Denken: ${step.reasoning.trim()}`)
  if (step.reasoningMeta?.evaluation_previous_goal?.trim()) {
    lines.push(`Gesehenes: ${step.reasoningMeta.evaluation_previous_goal.trim()}`)
  }
  if (step.reasoningMeta?.memory?.trim()) {
    lines.push(`Wissen: ${step.reasoningMeta.memory.trim()}`)
  }
  if (step.reasoningMeta?.next_goal?.trim()) {
    lines.push(`Nächster Schritt: ${step.reasoningMeta.next_goal.trim()}`)
  }
  if (step.result?.trim()) lines.push(`Ergebnis: ${step.result.trim()}`)
  lines.push('', `User question: ${message}`)

  return {
    display: `About ${label}\n${message}`,
    api: lines.join('\n'),
  }
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
