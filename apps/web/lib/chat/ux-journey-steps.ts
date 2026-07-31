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
