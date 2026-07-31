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

export function toChatUxJourneySteps(steps: UxJourneyAgentStep[] | undefined | null): ChatUxJourneyStep[] {
  if (!Array.isArray(steps) || !steps.length) return []
  return steps.map((s) => ({
    step: s.step,
    action: s.action,
    target: s.target,
    result: typeof s.result === 'string' ? s.result : undefined,
    reasoning: s.reasoning,
    screenshot: typeof (s as { screenshot?: string }).screenshot === 'string'
      ? (s as { screenshot?: string }).screenshot
      : null,
    screenshotUrl: rewriteAgentMediaUrl(s.screenshotUrl),
    timestamp: s.timestamp,
  }))
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
