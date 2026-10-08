/**
 * BehavioralPolicy → Tavus/Bey spoken PAL envelope.
 * Spec: specs/domain/behavioral-controller.md Phase 4
 */

import type { BehavioralPolicy, PersonaDetail } from '@audion-v3/contracts'
import { compileBehavioralPolicy } from './compile-behavioral-policy'
import { voiceLaneFromPolicy } from './chat-adapter'

export const BEHAVIORAL_VIDEO_RULES_HEADING = 'Spoken behavior (compiled):'

/** True when the object is rich enough to compile (full magazine persona). */
export function canCompileVideoPolicy(
  persona: Partial<PersonaDetail> & { name: string },
): persona is PersonaDetail {
  return (
    typeof persona.id === 'string' &&
    persona.id.length > 0 &&
    Array.isArray(persona.goals) &&
    Array.isArray(persona.frustrations) &&
    typeof persona.traits === 'object' &&
    persona.traits !== null
  )
}

export function compileVideoPolicy(persona: PersonaDetail): BehavioralPolicy {
  return compileBehavioralPolicy({ persona })
}

/**
 * Short spoken rules from policy — no raw knob dump, no markdown lists out loud.
 */
export function buildVideoBehavioralRules(policy: BehavioralPolicy): string {
  const d = policy.dimensions
  const lane = voiceLaneFromPolicy(policy)
  const pace =
    d.timePressure >= 0.75
      ? 'Speak briefly. One thought, then stop. Do not monologue.'
      : d.timePressure <= 0.35
        ? 'You may take a short beat to think, then answer in a few short sentences.'
        : 'Keep turns short: one thought, then pause.'

  const interrupt =
    d.interruptibility >= 0.66
      ? 'If the other person jumps in, yield quickly.'
      : 'Finish your short thought before yielding.'

  const hedge =
    d.hedgeRate >= 0.66
      ? 'It is OK to sound unsure when you are.'
      : d.hedgeRate <= 0.34
        ? 'Sound decisive when you have an opinion.'
        : 'Balance confidence with honesty.'

  const warmth =
    d.warmth >= 0.66
      ? 'A little warmth is fine; stay natural.'
      : d.warmth <= 0.34
        ? 'Stay reserved; skip cheerleading.'
        : 'Stay conversational, not corporate.'

  const repair =
    d.repairWillingness >= 0.6
      ? 'If you missed something, say so and ask one short clarifying question.'
      : 'If confused, say so in character rather than interviewing them.'

  const stress =
    policy.qualitative.stressTriggers.length > 0
      ? `Things that get under your skin: ${policy.qualitative.stressTriggers.slice(0, 3).join('; ')}.`
      : null

  return [
    BEHAVIORAL_VIDEO_RULES_HEADING,
    `Voice lane: ${lane}.`,
    pace,
    interrupt,
    hedge,
    warmth,
    repair,
    stress,
    'No markdown, no bullet lists out loud, no reading scores.',
  ]
    .filter(Boolean)
    .join('\n')
}

/** Session context line — turn-taking hint for the live call. */
export function videoConversationalContextHint(policy: BehavioralPolicy): string {
  const d = policy.dimensions
  if (d.interruptibility >= 0.7 && d.timePressure >= 0.7) {
    return 'Participant is time-pressed: expect short answers and quick yield on barge-in.'
  }
  if (d.timePressure <= 0.35) {
    return 'Participant is patient: allow brief thinking pauses; still keep spoken turns short.'
  }
  if (d.trustSkepticism >= 0.7) {
    return 'Participant is skeptical: may challenge claims; stay in character.'
  }
  return 'Stay in character; short spoken turns.'
}
