/**
 * Compile BehavioralPolicy for a persona with optional TG priors.
 */

import type { BehavioralPolicy, PersonaDetail } from '@audion-v3/contracts'
import { compileBehavioralPolicy } from './compile-behavioral-policy'
import { resolveTargetGroupPriors } from './tg-priors'
import { storePersonaDetail } from '../fixtures/persona-store'
import { storeTargetGroupForPersona } from '../fixtures/target-group-store'

export async function compilePolicyForPersona(
  personaOrId: PersonaDetail | string,
): Promise<BehavioralPolicy | null> {
  const persona =
    typeof personaOrId === 'string'
      ? await storePersonaDetail(personaOrId)
      : personaOrId
  if (!persona) return null

  const tg = await storeTargetGroupForPersona(persona.id)
  let linked: PersonaDetail[] | undefined
  if (tg?.linkedPersonas?.length && !tg.behavioralPriors?.dimensions) {
    const details = await Promise.all(
      tg.linkedPersonas.slice(0, 8).map((p) => storePersonaDetail(p.id)),
    )
    linked = details.filter((p): p is PersonaDetail => Boolean(p))
  }
  const tgPriors = resolveTargetGroupPriors(tg, linked)
  return compileBehavioralPolicy({
    persona,
    targetGroupId: tg?.id ?? null,
    tgPriors,
  })
}
