/**
 * BehavioralPolicy → UX Journey Agent PersonaContext.
 * Spec: behavioral-controller.md Phase 1b
 */

import type { BehavioralPolicy, PersonaDetail } from '@audion-v3/contracts'
import type { AgentPersonaContext } from '../chat/persona-agent-context'
import { toAgentPersonaContext } from '../chat/persona-agent-context'
import { policyToJourneyDimensionOverrides } from './compile-behavioral-policy'

/**
 * Overlay compiled policy onto an agent context (dims, dos/donts, heuristics, budgets as extra).
 */
export function applyBehavioralPolicyToAgentContext(
  base: AgentPersonaContext,
  policy: BehavioralPolicy,
): AgentPersonaContext {
  const dims = policyToJourneyDimensionOverrides(policy)
  const budgetNote = [
    `Behavioral budgets: dwell ${policy.budgets.dwellSeconds.min}–${policy.budgets.dwellSeconds.max}s;`,
    `tryBeforeAbandon=${policy.budgets.tryBeforeAbandon};`,
    `workingMemorySlots=${policy.budgets.workingMemorySlots};`,
    `policyId=${policy.policyId}.`,
  ].join(' ')

  const extra = [base.extraInstructions, budgetNote].filter(Boolean).join('\n\n')

  return {
    ...base,
    dimensionOverrides: dims,
    dos: policy.qualitative.dos.length ? policy.qualitative.dos : base.dos,
    donts: policy.qualitative.donts.length ? policy.qualitative.donts : base.donts,
    heuristics: policy.qualitative.heuristics.length
      ? policy.qualitative.heuristics
      : base.heuristics,
    extraInstructions: extra.slice(0, 1200) || undefined,
    profile: {
      ...base.profile,
      ...(policy.qualitative.emotionalBaseline
        ? { emotionalBaseline: policy.qualitative.emotionalBaseline }
        : {}),
      ...(policy.qualitative.stressTriggers.length
        ? { stressTriggers: policy.qualitative.stressTriggers }
        : {}),
      techLiteracy: policy.dimensions.techLiteracy,
      confidence: policy.dimensions.confidence,
    },
  }
}

/** Magazine persona → agent context with compiled policy (optional precomputed). */
export function toAgentPersonaContextWithPolicy(
  persona: PersonaDetail,
  opts?: {
    locale?: string
    systemPrompt?: string | null
    policy?: BehavioralPolicy | null
  },
): AgentPersonaContext | { id: string } | null {
  const base = toAgentPersonaContext(persona, {
    locale: opts?.locale,
    systemPrompt: opts?.systemPrompt,
  })
  if (!base || !('name' in base)) return base
  if (!opts?.policy) return base
  return applyBehavioralPolicyToAgentContext(base, opts.policy)
}
