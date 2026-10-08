/**
 * Video call behavioral session — seeds from chat affect mirror, enriches context.
 * Spec: behavioral-controller.md Phase 3b / 4
 */

import type { BehavioralPolicy, BehavioralSessionState, PersonaDetail } from '@audion-v3/contracts'
import { buildVideoBehavioralRules, videoConversationalContextHint } from './video-adapter'
import {
  initBehavioralSessionState,
  tickFrustration,
} from './compile-behavioral-policy'
import { mirrorPersonaAffect, readPersonaAffect } from './persona-affect-mirror'
import { observationFromSession } from './gold-scoreboard'
import { recordBehavioralGoldObservation } from './gold-store'
import { compilePolicyForPersona } from './resolve-persona-policy'
import { tavusSessionConversationalContext } from '../tavus/prompt'
import { resolveTavusLanguage, type TavusLanguageSource } from '../tavus/language'

type Store = {
  bySessionKey: Map<string, BehavioralSessionState>
}

const g = globalThis as unknown as { __audionVideoBehavioralSessions?: Store }

function store(): Store {
  if (!g.__audionVideoBehavioralSessions) {
    g.__audionVideoBehavioralSessions = { bySessionKey: new Map() }
  }
  return g.__audionVideoBehavioralSessions
}

export function resetVideoBehavioralSessions(): void {
  store().bySessionKey.clear()
}

export function videoSessionKey(personaId: string, conversationId?: string | null): string {
  const c = conversationId?.trim()
  return c ? `video:${c}` : `video-persona:${personaId.trim()}`
}

export function getOrInitVideoBehavioralSession(
  sessionKey: string,
  policy: BehavioralPolicy,
  personaId: string,
): BehavioralSessionState {
  const existing = store().bySessionKey.get(sessionKey)
  if (existing && existing.policyId === policy.policyId) return existing

  const mirrored = readPersonaAffect(personaId)
  if (mirrored && mirrored.policyId === policy.policyId) {
    const seeded: BehavioralSessionState = {
      ...mirrored,
      surface: 'video',
      lookBeforeActSatisfied: true,
      stance: mirrored.stance === 'abandon' ? 'hesitate' : mirrored.stance,
    }
    store().bySessionKey.set(sessionKey, seeded)
    return seeded
  }

  const fresh = initBehavioralSessionState(policy, 'video')
  fresh.stance = 'proceed'
  store().bySessionKey.set(sessionKey, fresh)
  return fresh
}

export function saveVideoBehavioralSession(
  sessionKey: string,
  state: BehavioralSessionState,
  personaId: string,
): void {
  store().bySessionKey.set(sessionKey, state)
  mirrorPersonaAffect(personaId, state)
}

/** Mild open-call tick so video doesn't start colder than chat left off. */
export function warmVideoSessionForCall(
  policy: BehavioralPolicy,
  state: BehavioralSessionState,
): BehavioralSessionState {
  // Small fatigue bump for "camera is on" social load; not a stress hit.
  return tickFrustration(policy, state, 0.08)
}

export function buildVideoLiveContext(
  policy: BehavioralPolicy,
  state: BehavioralSessionState,
  personaName: string,
  languageSource: TavusLanguageSource,
): string {
  const baseHint = videoConversationalContextHint(policy)
  const mood =
    state.frustrationLoad >= 0.55
      ? 'Participant carries residual frustration from prior chat — keep turns short and empathetic.'
      : state.fatigue >= 0.45
        ? 'Participant may be tired — prefer brief answers.'
        : null
  const stanceHint =
    state.stance === 'hesitate'
      ? 'May hesitate; allow a thinking pause.'
      : state.stance === 'abandon'
        ? 'Close to checking out; do not push long explanations.'
        : null
  const hint = [baseHint, mood, stanceHint].filter(Boolean).join(' ')
  return tavusSessionConversationalContext(
    personaName,
    resolveTavusLanguage(languageSource),
    hint,
  )
}

/** Full magazine → policy + session + conversational context for Tavus/Bey start. */
export async function prepareVideoCallBehavioralContext(
  persona: PersonaDetail,
  conversationId?: string | null,
): Promise<{
  policy: BehavioralPolicy | null
  session: BehavioralSessionState | null
  conversationalContext: string
  spokenRulesExtra: string | null
}> {
  const policy = await compilePolicyForPersona(persona)
  const language = resolveTavusLanguage(persona)
  if (!policy) {
    return {
      policy: null,
      session: null,
      conversationalContext: tavusSessionConversationalContext(persona.name, language),
      spokenRulesExtra: null,
    }
  }
  const key = videoSessionKey(persona.id, conversationId)
  let session = getOrInitVideoBehavioralSession(key, policy, persona.id)
  session = warmVideoSessionForCall(policy, session)
  saveVideoBehavioralSession(key, session, persona.id)
  recordBehavioralGoldObservation(
    observationFromSession({
      policy,
      state: session,
      personaId: persona.id,
      conversationId: conversationId ?? null,
      surface: 'video',
    }),
  )
  return {
    policy,
    session,
    conversationalContext: buildVideoLiveContext(policy, session, persona.name, persona),
    spokenRulesExtra: buildVideoBehavioralRules(policy),
  }
}
