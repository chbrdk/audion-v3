/**
 * Hybrid protocol: start a short journey-agent job for one flow node.
 * @see specs/domain/ux-test-flow-model.md — Hybrid session
 */

import type {
  UxFlowHybridSegmentPayload,
  UxFlowHybridSegmentResult,
  UxTestFlow,
} from '@audion-v3/contracts'
import { compileHybridSegmentTask } from './ux-flow-replan'
import { isUxJourneyAgentConfigured, uxJourneyAgentStart } from './ux-journey-agent-client'
import { resolveScenarioPackUrl } from './scenario-packs'
import { validateUxTestFlow } from './ux-test-flows'
import { paths } from './paths'

const AGENT_RUNNABLE = new Set(['action', 'observe', 'prompt', 'message'])

export function isHybridAgentRunnableNode(flow: UxTestFlow, nodeId: string): boolean {
  const node = (flow.nodes ?? []).find((n) => n.id === nodeId)
  if (!node) return false
  if (!AGENT_RUNNABLE.has(node.kind)) return false
  return Boolean(node.text?.trim() || node.label?.trim())
}

export async function startHybridFlowSegment(
  payload: UxFlowHybridSegmentPayload,
): Promise<UxFlowHybridSegmentResult> {
  const flow = payload.flow
  if (!flow || typeof flow !== 'object') {
    throw new Error('flow is required')
  }
  const nodeId = payload.nodeId?.trim()
  if (!nodeId) throw new Error('nodeId is required')

  const validation = validateUxTestFlow({ ...flow, compileReady: true })
  if (!validation.ok) {
    throw new Error(validation.errors.join(' '))
  }
  if (!isHybridAgentRunnableNode(flow, nodeId)) {
    throw new Error(`Node ${nodeId} is not agent-runnable in hybrid protocol`)
  }
  const task = compileHybridSegmentTask(flow, nodeId)
  if (!task) throw new Error('Could not compile hybrid segment task')

  const start = (flow.nodes ?? []).find((n) => n.kind === 'start')
  const urlKey = start?.urlKey?.trim() || paths.labTemplateFindabilityStartUrlKey
  const url = resolveScenarioPackUrl(urlKey)

  if (!isUxJourneyAgentConfigured()) {
    throw new Error('UX_JOURNEY_AGENT_URL is not configured')
  }

  const maxSteps =
    typeof payload.maxSteps === 'number' && payload.maxSteps > 0
      ? Math.min(20, Math.floor(payload.maxSteps))
      : 6

  const { jobId } = await uxJourneyAgentStart({
    url,
    task,
    maxSteps,
    flowGraph: null,
  })

  return { jobId, url, task, nodeId }
}
