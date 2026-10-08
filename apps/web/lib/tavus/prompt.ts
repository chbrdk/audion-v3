import type {
  PersonaCommunicationStyle,
  PersonaDetail,
  PersonaJourneyBehavior,
} from '@audion-v3/contracts'
import {
  buildVideoBehavioralRules,
  canCompileVideoPolicy,
  compileVideoPolicy,
  videoConversationalContextHint,
} from '../behavior/video-adapter'
import { paths } from '../paths'
import {
  resolveTavusLanguage,
  tavusConversationLanguageName,
  tavusSpokenLanguageRule,
  type TavusLanguageSource,
} from './language'

export type TavusPalPromptSource = TavusLanguageSource & {
  name: string
  role?: string | null
  age?: string | null
  gender?: string | null
  emotionalBaseline?: string | null
  attentionSpan?: string | null
  interests?: string[]
  values?: string[]
  goals?: Array<{ label: string }>
  frustrations?: Array<{ label: string }>
  motivations?: Array<{ label: string }>
  stressTriggers?: string[]
  communicationStyle?: PersonaCommunicationStyle | null
  journeyBehavior?: PersonaJourneyBehavior | null
  /** Magazine id — when set with traits/goals arrays, enables BehavioralPolicy compile. */
  id?: string
  traits?: Record<string, number>
  confidence?: number | null
  techLiteracy?: number | null
  knowledgeEntries?: PersonaDetail['knowledgeEntries']
  sections?: PersonaDetail['sections']
  channels?: string[]
  socialMediaUsage?: string[]
  colorPalette?: string[]
  status?: PersonaDetail['status']
  avatarUrl?: string | null
  projectId?: string | null
  archetype?: string | null
  updatedAt?: string | null
  bio?: string | null
  location?: string | null
  mediaAffinity?: number | null
  visuals?: PersonaDetail['visuals']
  profileDe?: PersonaDetail['profileDe']
  headlineDe?: string | null
  documents?: PersonaDetail['documents']
  tavusReplicaId?: string | null
  tavusPersonaId?: string | null
  tavusLanguage?: PersonaDetail['tavusLanguage']
  videoCallProvider?: PersonaDetail['videoCallProvider']
  beyAvatarId?: string | null
  beyAgentId?: string | null
}

function clip(text: string, max: number): string {
  const trimmed = text.trim()
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, Math.max(0, max - 1)).trimEnd()}…`
}

function lines(items: Array<string | null | undefined> | null | undefined, max = 5): string[] {
  const out: string[] = []
  for (const item of items ?? []) {
    const value = item?.trim()
    if (!value) continue
    out.push(clip(value, 160))
    if (out.length >= max) break
  }
  return out
}

function bulletBlock(
  title: string,
  items?: Array<string | null | undefined> | null,
  max = 5,
): string {
  const values = lines(items, max)
  if (!values.length) return ''
  return `${title}\n${values.map((value) => `- ${value}`).join('\n')}`
}

function tryPolicy(persona: TavusPalPromptSource) {
  if (!canCompileVideoPolicy(persona as PersonaDetail)) return null
  return compileVideoPolicy(persona as PersonaDetail)
}

/** Spoken CVI system prompt — identity + compiled behavior. Spec: tavus-video-chat.md */
export function buildTavusPalSystemPrompt(persona: TavusPalPromptSource): string {
  const name = persona.name.trim() || 'this persona'
  const role = persona.role?.trim() || 'research participant'
  const policy = tryPolicy(persona)

  const baseline =
    policy?.qualitative.emotionalBaseline?.trim() || persona.emotionalBaseline?.trim()
  const identityBits = [
    persona.age?.trim() ? `Age: ${persona.age.trim()}` : null,
    persona.location?.trim() ? `Location: ${persona.location.trim()}` : null,
    persona.gender?.trim() ? `Gender: ${persona.gender.trim()}` : null,
    baseline ? `Emotional baseline: ${baseline}` : null,
    persona.attentionSpan?.trim() ? `Attention: ${persona.attentionSpan.trim()}` : null,
  ].filter(Boolean)

  const style = persona.communicationStyle
  const vocab = policy?.qualitative.vocabulary?.length
    ? policy.qualitative.vocabulary
    : style?.vocabulary
  const sentence =
    policy?.qualitative.sentenceStructure?.trim() || style?.sentenceStructure?.trim()
  const styleBits = [
    sentence ? `Sentence style: ${clip(sentence, 180)}` : null,
    vocab?.length ? `Signature words: ${lines(vocab, 8).join(', ')}` : null,
    typeof style?.skepticismLevel === 'number'
      ? `Skepticism (0–1): ${style.skepticismLevel}`
      : policy
        ? `Skepticism (0–1): ${policy.dimensions.trustSkepticism.toFixed(2)}`
        : null,
  ].filter(Boolean)

  const goals =
    policy?.qualitative.goalsActive ?? persona.goals?.map((item) => item.label) ?? []
  const frustrations =
    policy?.qualitative.avoidances ?? persona.frustrations?.map((item) => item.label) ?? []
  const motivations =
    policy?.qualitative.motivations.map((m) => m.label) ??
    persona.motivations?.map((item) => item.label) ??
    []
  const stress = policy?.qualitative.stressTriggers ?? persona.stressTriggers ?? []
  const dos = policy?.qualitative.dos ?? persona.journeyBehavior?.dos
  const donts = policy?.qualitative.donts ?? persona.journeyBehavior?.donts

  const sections = [
    `You are ${name}, ${role}. Stay in first person as this person for the whole call.`,
    persona.bio?.trim() ? `Bio: ${clip(persona.bio, 420)}` : '',
    identityBits.length ? identityBits.join('. ') : '',
    styleBits.length ? `How you talk:\n${styleBits.join('\n')}` : '',
    bulletBlock('What you want', goals),
    bulletBlock('What frustrates you', frustrations),
    bulletBlock('Motivations', motivations),
    bulletBlock('Values', persona.values),
    bulletBlock('Interests', persona.interests),
    bulletBlock('Stress triggers', stress, 4),
    bulletBlock('Do', dos, 4),
    bulletBlock("Don't", donts, 4),
    persona.journeyBehavior?.extraInstructions?.trim()
      ? `Extra: ${clip(persona.journeyBehavior.extraInstructions, 280)}`
      : '',
    policy ? buildVideoBehavioralRules(policy) : '',
    [
      'Spoken video rules:',
      '- Short turns. One thought, then pause. One question at a time.',
      '- Sound like a real person, not a briefing. No markdown, no lists out loud.',
      tavusSpokenLanguageRule(resolveTavusLanguage(persona)),
      '- You are this persona in a product-research conversation. Do not mention Audion, Tavus, or being an AI unless asked.',
      '- When unsure, say so in character rather than inventing facts.',
    ].join('\n'),
  ].filter(Boolean)

  return clip(sections.join('\n\n'), paths.tavusPalSystemPromptMaxChars)
}

export function tavusPalName(personaName: string): string {
  return `${paths.tavusConversationNamePrefix}${personaName.trim() || 'Persona'}`
}

export function tavusSessionConversationalContext(
  personaName: string,
  language = resolveTavusLanguage({}),
  policyHint?: string | null,
): string {
  const spoken = tavusConversationLanguageName(language)
  const hint = policyHint?.trim() || 'Stay in character; short spoken turns.'
  return `Product-research video call in ${spoken}. Stay in character as ${personaName.trim() || 'the persona'}. ${hint}`
}

/** Prefer compiled policy hint when magazine persona is available. */
export function tavusSessionConversationalContextForPersona(
  persona: TavusPalPromptSource,
  language = resolveTavusLanguage(persona),
): string {
  const policy = tryPolicy(persona)
  return tavusSessionConversationalContext(
    persona.name,
    language,
    policy ? videoConversationalContextHint(policy) : null,
  )
}
