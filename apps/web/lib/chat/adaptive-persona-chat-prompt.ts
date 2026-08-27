/**
 * Deterministic adaptive persona chat system prompt from PersonaDetail.
 * Spec: specs/domain/chat-workspace.md · knowledge/adaptive-persona-chat-2026-08-27.md
 */

import type {
  PersonaCommunicationStyle,
  PersonaDetail,
  PersonaSection,
} from '@audion-v3/contracts'

export const ADAPTIVE_CHAT_RULES_HEADING = '## Chat rules'
export const ADAPTIVE_CUSTOM_VOICE_HEADING = '## Custom voice instructions'

const LIST_CAP = 8
const STYLE_VOCAB_CAP = 10
const PRIOR_KNOWLEDGE_CAP = 4
const PRIOR_KNOWLEDGE_CONTENT_LIMIT = 400
const SECTION_BODY_LIMIT = 320
const EXTRA_INSTRUCTIONS_LIMIT = 1000
const BIO_LIMIT = 420
const CLIP_ITEM = 160
const PROMPT_MAX_CHARS = 12000

const SECTION_PRIORITY = /^(mindset|working with)/i

export type AdaptivePersonaChatPromptOpts = {
  /** Admin overlay — does not replace the adaptive magazine profile. */
  customVoice?: string | null
  locale?: string
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n))
}

function clip(text: string, max: number): string {
  const trimmed = text.trim()
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, Math.max(0, max - 1)).trimEnd()}…`
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function bulletLines(items: Array<string | null | undefined>, max = LIST_CAP): string[] {
  const out: string[] = []
  for (const item of items) {
    const value = item?.trim()
    if (!value) continue
    out.push(`- ${clip(value, CLIP_ITEM)}`)
    if (out.length >= max) break
  }
  return out
}

function bulletBlock(title: string, items: Array<string | null | undefined>, max = LIST_CAP): string {
  const lines = bulletLines(items, max)
  if (!lines.length) return ''
  return `${title}\n${lines.join('\n')}`
}

/** High / low trait → how to answer in chat. */
function traitBehaviorHint(name: string, score: number): string {
  const key = name.toLowerCase()
  const high = score >= 0.66
  const low = score <= 0.34
  if (!high && !low) return 'moderate — stay balanced; do not overplay this trait'

  const table: Array<{ match: RegExp; high: string; low: string }> = [
    {
      match: /open|curious|explor/,
      high: 'volunteer options and alternatives; curious questions OK',
      low: 'stick to the asked topic; fewer tangents',
    },
    {
      match: /conscient|detail|thorough|precision/,
      high: 'be precise; name caveats; prefer concrete steps',
      low: 'skip pedantry; give the gist first',
    },
    {
      match: /extra|sociab|outgoing/,
      high: 'warm, conversational; light rapport OK',
      low: 'reserved; facts over small talk',
    },
    {
      match: /agree|empath|warm/,
      high: 'acknowledge feelings; collaborative tone',
      low: 'blunt and direct; less softener language',
    },
    {
      match: /neuro|anx|stress|worry/,
      high: 'voice doubts; flag risks; do not fake calm certainty',
      low: 'steady confidence; minimize drama',
    },
    {
      match: /skept|trust|critic/,
      high: 'challenge claims; ask for proof',
      low: 'more accepting; less interrogation',
    },
    {
      match: /impat|time|urgent|speed/,
      high: 'lead with the answer; cut fluff',
      low: 'allow a short setup before the point',
    },
    {
      match: /tech|digital|literacy/,
      high: 'comfortable with product/tech jargon when useful',
      low: 'plain language; avoid jargon',
    },
  ]

  for (const row of table) {
    if (row.match.test(key)) return high ? row.high : row.low
  }
  return high
    ? 'lean into this trait in word choice and priorities'
    : 'downplay this trait; do not contradict a low score'
}

function traitBlock(traits: Record<string, number>): string {
  const rows = Object.entries(traits)
    .filter(([k]) => k.trim())
    .map(([k, v]) => {
      const score = clamp01(typeof v === 'number' && Number.isFinite(v) ? v : 0)
      return `- ${k.trim()}: ${score.toFixed(2)} → ${traitBehaviorHint(k, score)}`
    })
  if (!rows.length) return ''
  return `## Personality traits (0–1)\n${rows.join('\n')}`
}

function styleRules(style: PersonaCommunicationStyle | null | undefined): string {
  if (!style) return ''
  const bits: string[] = []
  if (style.sentenceStructure?.trim()) {
    bits.push(`- Sentence structure: ${clip(style.sentenceStructure, 180)}`)
  }
  if (style.vocabulary?.length) {
    const words = style.vocabulary
      .map((w) => w.trim())
      .filter(Boolean)
      .slice(0, STYLE_VOCAB_CAP)
    if (words.length) bits.push(`- Signature vocabulary: ${words.join(', ')}`)
  }
  if (typeof style.skepticismLevel === 'number' && Number.isFinite(style.skepticismLevel)) {
    const s = clamp01(style.skepticismLevel)
    let rule = 'balanced skepticism'
    if (s >= 0.66) rule = 'high skepticism — question claims, ask for evidence'
    else if (s <= 0.34) rule = 'low skepticism — more trusting, fewer challenges'
    bits.push(`- Skepticism ${s.toFixed(2)}: ${rule}`)
  }
  if (!bits.length) return ''
  return `## How you talk\n${bits.join('\n')}`
}

function sectionBlock(sections: PersonaSection[]): string {
  const prioritized = [...sections].sort((a, b) => {
    const ap = SECTION_PRIORITY.test((a.title || '').trim()) ? 0 : 1
    const bp = SECTION_PRIORITY.test((b.title || '').trim()) ? 0 : 1
    return ap - bp
  })
  const parts = prioritized
    .map((s) => {
      const title = (s.title || '').trim()
      const body = (s.body || '').trim()
      if (!title || !body) return null
      return `### ${title}\n${clip(body, SECTION_BODY_LIMIT)}`
    })
    .filter((p): p is string => Boolean(p))
    .slice(0, 6)
  if (!parts.length) return ''
  return `## Magazine sections\n${parts.join('\n\n')}`.slice(0, EXTRA_INSTRUCTIONS_LIMIT)
}

function knowledgeBlock(persona: PersonaDetail): string {
  const entries = (persona.knowledgeEntries ?? [])
    .map((e) => {
      const title = (e.title || '').trim()
      const content = stripHtml(e.content || '').slice(0, PRIOR_KNOWLEDGE_CONTENT_LIMIT)
      if (!title || !content) return null
      return `- ${title}: ${content}`
    })
    .filter((x): x is string => Boolean(x))
    .slice(0, PRIOR_KNOWLEDGE_CAP)
  if (!entries.length) return ''
  return `## Prior knowledge (persona)\n${entries.join('\n')}`
}

function chatRulesBlock(): string {
  return [
    ADAPTIVE_CHAT_RULES_HEADING,
    '- You ARE this persona — first person only. Never speak as an AI describing them.',
    '- Keep turns short: usually 1–3 short paragraphs, about 80–120 words unless the user asks for depth.',
    '- Sound like a real person in a research chat — not a briefing, pitch deck, or essay.',
    '- Prefer concrete opinions and examples from your goals, pains, and traits.',
    '- Use markdown sparingly (a short list only when it clarifies).',
    '- When unsure, say so in character rather than inventing facts.',
  ].join('\n')
}

/**
 * Inserts custom voice before chat rules (same order as full builder).
 * Used by Settings live preview when the voice draft is dirty.
 */
export function previewAdaptivePromptWithVoice(
  adaptiveProfilePrompt: string,
  customVoice: string | null | undefined,
): string {
  const voice = (customVoice || '').trim()
  if (!voice) return adaptiveProfilePrompt
  const block = `${ADAPTIVE_CUSTOM_VOICE_HEADING}\n${clip(voice, 2000)}\n\n`
  const idx = adaptiveProfilePrompt.indexOf(ADAPTIVE_CHAT_RULES_HEADING)
  if (idx === -1) return clip(`${adaptiveProfilePrompt}\n\n${block}`.trim(), PROMPT_MAX_CHARS)
  return clip(
    `${adaptiveProfilePrompt.slice(0, idx)}${block}${adaptiveProfilePrompt.slice(idx)}`.trim(),
    PROMPT_MAX_CHARS,
  )
}

/** Full adaptive system prompt for native persona chat. */
export function buildAdaptivePersonaChatSystemPrompt(
  persona: PersonaDetail,
  opts?: AdaptivePersonaChatPromptOpts,
): string {
  const name = persona.name.trim() || 'this persona'
  const role = (persona.role || persona.archetype || 'research participant').trim()

  const identityBits = [
    persona.age?.trim() ? `Age: ${persona.age.trim()}` : null,
    persona.location?.trim() ? `Location: ${persona.location.trim()}` : null,
    persona.gender?.trim() ? `Gender: ${persona.gender.trim()}` : null,
    persona.archetype?.trim() ? `Archetype: ${persona.archetype.trim()}` : null,
    persona.emotionalBaseline?.trim()
      ? `Emotional baseline: ${persona.emotionalBaseline.trim()}`
      : null,
    persona.attentionSpan?.trim() ? `Attention: ${persona.attentionSpan.trim()}` : null,
    typeof persona.confidence === 'number' && Number.isFinite(persona.confidence)
      ? `Confidence: ${clamp01(persona.confidence).toFixed(2)}`
      : null,
    typeof persona.techLiteracy === 'number' && Number.isFinite(persona.techLiteracy)
      ? `Tech literacy: ${clamp01(persona.techLiteracy).toFixed(2)}`
      : null,
  ].filter(Boolean)

  const jb = persona.journeyBehavior
  const customVoice = (opts?.customVoice || '').trim()

  const sections = [
    `You ARE ${name}, ${role}. Stay in first person as this person for the whole chat. You are not an AI describing them.`,
    persona.bio?.trim() ? `Bio: ${clip(persona.bio, BIO_LIMIT)}` : '',
    identityBits.length ? `Identity\n${identityBits.map((b) => `- ${b}`).join('\n')}` : '',
    traitBlock(persona.traits ?? {}),
    styleRules(persona.communicationStyle),
    bulletBlock(
      '## Goals',
      persona.goals.map((g) => g.label),
    ),
    bulletBlock(
      '## Frustrations / pain points',
      persona.frustrations.map((f) => f.label),
    ),
    bulletBlock(
      '## Motivations',
      persona.motivations?.map((m) => m.label) ?? [],
    ),
    bulletBlock('## Values', persona.values),
    bulletBlock('## Interests', persona.interests),
    bulletBlock('## Stress triggers', persona.stressTriggers, 4),
    bulletBlock('## Channels', persona.channels, 6),
    bulletBlock('## Do (journey behaviour)', jb?.dos ?? [], 8),
    bulletBlock("## Don't (journey behaviour)", jb?.donts ?? [], 8),
    bulletBlock('## Heuristics', jb?.heuristics ?? [], 8),
    jb?.extraInstructions?.trim()
      ? `## Extra journey instructions\n${clip(jb.extraInstructions, 280)}`
      : '',
    sectionBlock(persona.sections ?? []),
    knowledgeBlock(persona),
    customVoice ? `${ADAPTIVE_CUSTOM_VOICE_HEADING}\n${clip(customVoice, 2000)}` : '',
    opts?.locale?.trim() ? `Respond in a way natural for locale hint: ${opts.locale.trim()}.` : '',
    chatRulesBlock(),
  ].filter(Boolean)

  return clip(sections.join('\n\n'), PROMPT_MAX_CHARS)
}
