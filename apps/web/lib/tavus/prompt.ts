import type { PersonaCommunicationStyle, PersonaJourneyBehavior } from '@audion-v3/contracts'
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

/** Spoken CVI system prompt — identity only, not a JSON dump. Spec: tavus-video-chat.md */
export function buildTavusPalSystemPrompt(persona: TavusPalPromptSource): string {
  const name = persona.name.trim() || 'this persona'
  const role = persona.role?.trim() || 'research participant'
  const identityBits = [
    persona.age?.trim() ? `Age: ${persona.age.trim()}` : null,
    persona.location?.trim() ? `Location: ${persona.location.trim()}` : null,
    persona.gender?.trim() ? `Gender: ${persona.gender.trim()}` : null,
    persona.emotionalBaseline?.trim()
      ? `Emotional baseline: ${persona.emotionalBaseline.trim()}`
      : null,
    persona.attentionSpan?.trim() ? `Attention: ${persona.attentionSpan.trim()}` : null,
  ].filter(Boolean)

  const style = persona.communicationStyle
  const styleBits = [
    style?.sentenceStructure?.trim()
      ? `Sentence style: ${clip(style.sentenceStructure, 180)}`
      : null,
    style?.vocabulary?.length
      ? `Signature words: ${lines(style.vocabulary, 8).join(', ')}`
      : null,
    typeof style?.skepticismLevel === 'number'
      ? `Skepticism (0–1): ${style.skepticismLevel}`
      : null,
  ].filter(Boolean)

  const sections = [
    `You are ${name}, ${role}. Stay in first person as this person for the whole call.`,
    persona.bio?.trim() ? `Bio: ${clip(persona.bio, 420)}` : '',
    identityBits.length ? identityBits.join('. ') : '',
    styleBits.length ? `How you talk:\n${styleBits.join('\n')}` : '',
    bulletBlock('What you want', persona.goals?.map((item) => item.label) ?? []),
    bulletBlock('What frustrates you', persona.frustrations?.map((item) => item.label) ?? []),
    bulletBlock('Motivations', persona.motivations?.map((item) => item.label) ?? []),
    bulletBlock('Values', persona.values),
    bulletBlock('Interests', persona.interests),
    bulletBlock('Stress triggers', persona.stressTriggers, 4),
    bulletBlock('Do', persona.journeyBehavior?.dos, 4),
    bulletBlock("Don't", persona.journeyBehavior?.donts, 4),
    persona.journeyBehavior?.extraInstructions?.trim()
      ? `Extra: ${clip(persona.journeyBehavior.extraInstructions, 280)}`
      : '',
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
): string {
  const spoken = tavusConversationLanguageName(language)
  return `Product-research video call in ${spoken}. Stay in character as ${personaName.trim() || 'the persona'}. Short spoken turns.`
}
