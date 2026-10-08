import { afterEach, describe, expect, it } from 'vitest'
import {
  applyBehavioralPolicyToAgentContext,
  toAgentPersonaContextWithPolicy,
} from '../lib/behavior/browse-adapter'
import {
  loadOrInitChatBehavioralSession,
  persistChatBehavioralSession,
  applyChatTurnBehavioralTick,
  resetChatBehavioralSessions,
} from '../lib/behavior/chat-session'
import { compileBehavioralPolicy } from '../lib/behavior/compile-behavioral-policy'
import { resetPersonaAffectMirror, readPersonaAffect } from '../lib/behavior/persona-affect-mirror'
import { compilePolicyForPersona } from '../lib/behavior/resolve-persona-policy'
import {
  deriveTargetGroupPriorsFromPersonas,
  resolveTargetGroupPriors,
  segmentCuesFromTargetGroup,
} from '../lib/behavior/tg-priors'
import { resetBehavioralGoldStore, listBehavioralGoldObservations } from '../lib/behavior/gold-store'
import {
  prepareVideoCallBehavioralContext,
  resetVideoBehavioralSessions,
} from '../lib/behavior/video-session'
import { toAgentPersonaContext } from '../lib/chat/persona-agent-context'
import {
  parseChatMessagesColumn,
  serializeChatMessagesColumn,
} from '../lib/chat/messages-column'
import { resetChatStore, storeChatBeginUserTurn, storeChatConversationDetail } from '../lib/fixtures/chat-store'
import { DEMO_PERSONAS } from '../lib/fixtures/personas'
import { resetPersonaStore } from '../lib/fixtures/persona-store'
import {
  resetTargetGroupStore,
  storePatchTargetGroup,
  storeTargetGroupDetail,
} from '../lib/fixtures/target-group-store'

afterEach(() => {
  resetChatBehavioralSessions()
  resetPersonaAffectMirror()
  resetVideoBehavioralSessions()
  resetBehavioralGoldStore()
  resetChatStore()
  resetPersonaStore()
  resetTargetGroupStore()
})

describe('Phase 3b durable chat session', () => {
  it('persists behavioralSession in the messages jsonb envelope', async () => {
    const turn = await storeChatBeginUserTurn({
      personaId: 'persona-alex-morgan',
      message: 'hello',
    })
    if ('error' in turn) throw new Error(turn.error)
    const persona = structuredClone(DEMO_PERSONAS.find((p) => p.id === 'persona-alex-morgan')!)
    const policy = compileBehavioralPolicy({ persona })
    let state = await loadOrInitChatBehavioralSession(turn.conversationId, policy, persona.id)
    state = applyChatTurnBehavioralTick(
      policy,
      state,
      'This buzzword-heavy cookie wall is exhausting scattered research notes.',
    )
    await persistChatBehavioralSession(turn.conversationId, state, persona.id, policy)

    const detail = await storeChatConversationDetail(turn.conversationId)
    expect(detail?.behavioralSession?.frustrationLoad).toBeGreaterThan(0)
    expect(listBehavioralGoldObservations(policy.policyId).length).toBeGreaterThan(0)
    expect(readPersonaAffect(persona.id)?.frustrationLoad).toBe(
      detail?.behavioralSession?.frustrationLoad,
    )

    const column = serializeChatMessagesColumn(
      detail!.messages,
      detail!.inspect ?? null,
      detail!.behavioralSession ?? null,
    )
    const parsed = parseChatMessagesColumn(column)
    expect(parsed.behavioralSession?.policyId).toBe(policy.policyId)
  })
})

describe('Phase 5 TG priors', () => {
  it('derives segment centroid and blends into persona policy', async () => {
    await storePatchTargetGroup('tg-digital-product-leads', {
      name: 'Digital Product Leads',
      segment: 'B2B SaaS · Decision makers under time pressure',
      behavioralPriors: {
        blendWeight: 0.5,
        dimensions: { timePressure: 0.9 },
        sharedStressTriggers: ['Deck theater'],
      },
    })
    const tg = await storeTargetGroupDetail('tg-digital-product-leads')
    expect(tg?.behavioralPriors?.dimensions?.timePressure).toBe(0.9)
    expect(segmentCuesFromTargetGroup(tg!).some((c) => /impatient/i.test(c))).toBe(true)

    const alex = DEMO_PERSONAS.find((p) => p.id === 'persona-alex-morgan')!
    const samira = DEMO_PERSONAS.find((p) => p.id === 'persona-samira-khan')!
    const derived = deriveTargetGroupPriorsFromPersonas([alex, samira])
    expect(derived?.dimensions?.detailOrientation).toBeTypeOf('number')

    const priors = resolveTargetGroupPriors(tg!, [alex, samira])
    const withTg = compileBehavioralPolicy({
      persona: {
        ...alex,
        journeyBehavior: { dimensionOverrides: null },
        traits: {},
      },
      targetGroupId: tg!.id,
      tgPriors: priors,
    })
    expect(withTg.citations.timePressure?.source).toBe('tg_prior')
    expect(withTg.dimensions.timePressure).toBeGreaterThan(0.6)

    const viaResolve = await compilePolicyForPersona('persona-alex-morgan')
    expect(viaResolve?.targetGroupId).toBe('tg-digital-product-leads')
  })
})

describe('Phase 1b browse adapter', () => {
  it('overlays policy dims and budgets onto agent context', () => {
    const persona = DEMO_PERSONAS.find((p) => p.id === 'persona-alex-morgan')!
    const policy = compileBehavioralPolicy({
      persona: {
        ...persona,
        journeyBehavior: {
          dimensionOverrides: { timePressure: 0.88, exploration: 0.2 },
        },
      },
    })
    const base = toAgentPersonaContext(persona, { locale: 'de' })
    expect(base && 'name' in base).toBe(true)
    if (!base || !('name' in base)) return
    const next = applyBehavioralPolicyToAgentContext(base, policy)
    expect(next.dimensionOverrides?.time_pressure).toBe(0.88)
    expect(next.extraInstructions).toMatch(/tryBeforeAbandon=/)
    expect(next.extraInstructions).toMatch(/policyId=/)

    const wrapped = toAgentPersonaContextWithPolicy(persona, { policy, locale: 'de' })
    expect(wrapped && 'dimensionOverrides' in wrapped && wrapped.dimensionOverrides?.time_pressure).toBe(
      0.88,
    )
  })
})

describe('Video session bridge from chat affect', () => {
  it('seeds video context from mirrored chat frustration', async () => {
    const persona = structuredClone(DEMO_PERSONAS.find((p) => p.id === 'persona-alex-morgan')!)
    const policy = compileBehavioralPolicy({
      persona: {
        ...persona,
        journeyBehavior: {
          dimensionOverrides: { timePressure: 0.9 },
        },
        stressTriggers: ['Cookie walls'],
      },
    })
    const turn = await storeChatBeginUserTurn({
      personaId: persona.id,
      message: 'cookie walls again',
    })
    if ('error' in turn) throw new Error(turn.error)
    let state = await loadOrInitChatBehavioralSession(turn.conversationId, policy, persona.id)
    state = applyChatTurnBehavioralTick(policy, state, 'More cookie walls — prove it.')
    await persistChatBehavioralSession(turn.conversationId, state, persona.id)

    const prepared = await prepareVideoCallBehavioralContext(persona)
    expect(prepared.policy).toBeTruthy()
    expect(prepared.session?.frustrationLoad).toBeGreaterThan(0)
    expect(prepared.conversationalContext).toMatch(/frustration|short|hesitat|tired|skeptic|character/i)
    expect(prepared.spokenRulesExtra).toMatch(/Spoken behavior/)
  })
})
