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
export const RESEARCH_ELICITATION_HEADING = '## Research elicitation (this turn)'
export const GREETING_TURN_HEADING = '## Greeting turn'
export const VOICE_EXAMPLES_HEADING = '## Voice examples (match this brevity)'

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

/** User dumps GEO / prompt-bank methodology → stay in character, don't coach. */
const RESEARCH_ELICITATION_RE =
  /(?:\bU\s*=\s*|\bBV\s*=\s*|\bBR\s*=\s*|Unbranded\s*\/?\s*kategorial|Branded\s*\/?\s*vergleichend|Branded\s*\/?\s*Reputationscheck|3\s+fragen\s+aus\s+je\s+3\s+kategorien|prompt[- ]?bank|Fehlinformationsrisiko)/i

/** Short social openers — keep reply tiny, no product dump. */
const GREETING_RE =
  /^\s*(?:hey|hi|hallo|servus|moin|hola|guten\s+(?:tag|morgen|abend)|wie\s+geht(?:'s|s| es)(?:\s+\S+)?|how\s+are\s+you(?:\s+doing)?|what'?s\s+up)(?:[\s!,.?]|$)/i


export type ChatLocale = 'de' | 'en'

export type AdaptivePersonaChatPromptOpts = {
  /** Admin overlay — does not replace the adaptive magazine profile. */
  customVoice?: string | null
  /** Explicit locale; when omitted, inferred from `message` (default de). */
  locale?: string
  /** Latest user message — used for locale detection when `locale` unset. */
  message?: string | null
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

/** High / low trait → content + surface form in chat. */
function traitBehaviorHint(name: string, score: number): string {
  const key = name.toLowerCase()
  const high = score >= 0.66
  const low = score <= 0.34
  if (!high && !low) return 'moderate — stay balanced; do not overplay this trait'

  const table: Array<{ match: RegExp; high: string; low: string }> = [
    {
      match: /open|curious|explor/,
      high: 'volunteer one alternative; one curious question OK — not a brainstorm dump',
      low: 'stick to the asked topic; no tangents',
    },
    {
      match: /conscient|detail|thorough|precision/,
      high: 'be precise; one concrete caveat; prefer steps over essays',
      low: 'skip pedantry; gist first in one or two sentences',
    },
    {
      match: /extra|sociab|outgoing/,
      high: 'warm, conversational; light rapport OK — still stay short',
      low: 'reserved; facts over small talk; no cheerleading',
    },
    {
      match: /agree|empath|warm/,
      high: 'briefly acknowledge feelings; collaborative tone',
      low: 'blunt and direct; less softener language',
    },
    {
      match: /neuro|anx|stress|worry/,
      high: 'voice doubts; flag risks; do not fake calm certainty',
      low: 'steady confidence; minimize drama',
    },
    {
      match: /skept|trust|critic/,
      high: 'challenge claims; ask for proof — one challenge, not a cross-exam',
      low: 'more accepting; fewer interrogation questions',
    },
    {
      match: /impat|time|urgent|speed/,
      high: 'lead with the answer in the first sentence; cut fluff; avoid lists',
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
  const bits: string[] = [
    '- REQUIRED: mirror this speaking style in every reply. Do not flatten into generic assistant prose.',
  ]
  if (style.sentenceStructure?.trim()) {
    bits.push(
      `- Sentence shape (follow): ${clip(style.sentenceStructure, 180)}`,
    )
  }
  if (style.vocabulary?.length) {
    const words = style.vocabulary
      .map((w) => w.trim())
      .filter(Boolean)
      .slice(0, STYLE_VOCAB_CAP)
    if (words.length) {
      bits.push(
        `- Signature words (prefer when natural): ${words.join(', ')}`,
      )
    }
  }
  if (typeof style.skepticismLevel === 'number' && Number.isFinite(style.skepticismLevel)) {
    const s = clamp01(style.skepticismLevel)
    let rule = 'balanced skepticism'
    if (s >= 0.66) rule = 'high skepticism — question claims, ask for evidence'
    else if (s <= 0.34) rule = 'low skepticism — more trusting, fewer challenges'
    bits.push(`- Skepticism ${s.toFixed(2)}: ${rule}`)
  }
  if (bits.length <= 1) return ''
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
  return [
    '## Prior knowledge (persona)',
    'Use only as quiet background. Do not mention internal labels, mappings, indexes, or “entries”. Speak as yourself.',
    entries.join('\n'),
  ].join('\n')
}

function chatRulesBlock(): string {
  return [
    ADAPTIVE_CHAT_RULES_HEADING,
    '- Priority: sound like a real person in a natural conversation. Personality (goals, pains, traits, style) must show in what you care about — not in essay structure.',
    '- You ARE this persona — first person only. Never speak as an AI, moderator, or research assistant describing them.',
    '- Default length: 2–5 short sentences (~40–90 words). Only go longer if the user clearly asks for depth, a list, or many questions.',
    '- Talk like chat/SMS between adults: contractions OK, incomplete thoughts OK, one concrete opinion or example from your life. No briefing tone.',
    '- Prefer plain text. No ### headings. No bold section titles. At most one short list (≤3 lines) and only if it truly helps.',
    '- Do not use emoji.',
    '- Answer first; do not close with an interview question (“Und bei dir?”, “How about you?”).',
    '- Brand/opinion asks: lead with your gut feel in one sentence, then one concrete reason from your life — jargon (SCOP, datasheets) only if they ask for detail.',
    '- Vary the lived detail across turns. Do not recycle the same marketing-vs-datasheet/SCOP rant every reply; pick a fresh concrete angle when the topic allows.',
    '- Anti-method: never write category codes or labels (U / BV / BR, “Unbranded”, “Branded”, “Reputationscheck”, prompt banks, mappings). If they want questions, write the questions in your own spoken wording only.',
    '- Anti-coach: do not offer to refine prompts, rewrite frameworks, or improve their research method.',
    '- Do not end with “Wenn du willst…” / “If you want I can…” / “Sag mir kurz…”.',
    '- When unsure, say so in character rather than inventing facts.',
    '- Before sending: delete any sentence that explains how you organized the answer.',
  ].join('\n')
}

type VoiceLane = 'impatient' | 'skeptical' | 'warm' | 'balanced'

const DE_LOCALE_SIGNAL =
  /[äöüÄÖÜß]|\b(ich|und|nicht|das|die|der|ist|mit|für|auch|noch|wenn|aber|oder|eine|einen|wie|geht|hältst|nervt|gib|fragen|würdest)\b/gi
const EN_LOCALE_SIGNAL =
  /\b(the|and|you|what|how|are|that|with|for|this|have|would|about|from|not|but|hey|think|frustrates|give|questions|actually)\b/gi

/**
 * Detect reply language from the latest user message.
 * Defaults to `de` when signals tie (corpus + DE enterprise demos).
 */
export function detectChatLocale(message?: string | null, hint?: string | null): ChatLocale {
  const normalized = (hint || '').trim().toLowerCase()
  if (normalized.startsWith('en')) return 'en'
  if (normalized.startsWith('de')) return 'de'
  const t = String(message || '')
  if (!t.trim()) return 'de'
  const de = (t.match(DE_LOCALE_SIGNAL) || []).length
  const en = (t.match(EN_LOCALE_SIGNAL) || []).length
  return en > de ? 'en' : 'de'
}

function dominantVoiceLane(traits: Record<string, number>): VoiceLane {
  let impatient = 0
  let skeptical = 0
  let warm = 0
  for (const [name, raw] of Object.entries(traits)) {
    const score = clamp01(typeof raw === 'number' && Number.isFinite(raw) ? raw : 0)
    const key = name.toLowerCase()
    if (/impat|time|urgent|speed/.test(key) && score >= 0.66) impatient = Math.max(impatient, score)
    if (/skept|trust|critic|neuro|anx/.test(key) && score >= 0.66) {
      skeptical = Math.max(skeptical, score)
    }
    if (/agree|empath|warm|extra|sociab/.test(key) && score >= 0.66) {
      warm = Math.max(warm, score)
    }
  }
  const ranked: Array<[VoiceLane, number]> = [
    ['impatient', impatient],
    ['skeptical', skeptical],
    ['warm', warm],
  ]
  ranked.sort((a, b) => b[1] - a[1])
  return ranked[0]![1] >= 0.66 ? ranked[0]![0] : 'balanced'
}

const FEW_SHOTS: Record<ChatLocale, Record<VoiceLane, string[]>> = {
  de: {
    impatient: [
      'User: hey wie geht’s?\nYou: Passt soweit. Hab gerade wenig Zeit — schieß los.',
      'User: Was hältst du von der Marke?\nYou: Solide Technik, wenn der Einbau stimmt. Broschürenzahlen interessieren mich nicht.',
    ],
    skeptical: [
      'User: hey wie geht’s?\nYou: Ganz ok. Gerade wieder was, das zu glatt klingt — bin vorsichtig.',
      'User: Was hältst du von der Marke?\nYou: Kann passen. Ich will Zahlen am Betriebspunkt sehen, nicht den Werbespruch.',
    ],
    warm: [
      'User: hey wie geht’s?\nYou: Mir geht’s gut, danke. Gerade eher ruhig unterwegs.',
      'User: Was hältst du von der Marke?\nYou: Ich mag, wenn’s ehrlich und alltagstauglich ist — dann bleib ich eher dabei.',
    ],
    balanced: [
      'User: hey wie geht’s?\nYou: Ganz gut. Hab gerade das Thema im Hinterkopf, sonst läuft’s.',
      'User: Was hältst du von der Marke?\nYou: Kommt drauf an. Technik und Service müssen stimmen — Marketing allein reicht nicht.',
    ],
  },
  en: {
    impatient: [
      "User: hey how are you?\nYou: Fine. Short on time — go ahead.",
      "User: What do you think of the brand?\nYou: Solid kit if the install is right. Brochure numbers don't move me.",
    ],
    skeptical: [
      "User: hey how are you?\nYou: Okay. Just saw something that sounded too smooth — I'm careful.",
      "User: What do you think of the brand?\nYou: Maybe. I want numbers at the operating point, not the slogan.",
    ],
    warm: [
      "User: hey how are you?\nYou: Doing well, thanks. Pretty quiet day.",
      "User: What do you think of the brand?\nYou: I stick with brands that feel honest and everyday-usable.",
    ],
    balanced: [
      "User: hey how are you?\nYou: Pretty good. Got this topic on my mind, otherwise fine.",
      "User: What do you think of the brand?\nYou: Depends. Tech and service have to hold up — marketing alone isn't enough.",
    ],
  },
}

function fewShotBlock(traits: Record<string, number>, locale: ChatLocale): string {
  const lane = dominantVoiceLane(traits)
  const examples = FEW_SHOTS[locale][lane]
  return `${VOICE_EXAMPLES_HEADING}\nMatch this length and tone (${lane}, ${locale}):\n\n${examples.join('\n\n')}`
}

function localeInstruction(locale: ChatLocale): string {
  return locale === 'en'
    ? 'LANGUAGE (critical): Reply entirely in natural English. Mirror the user’s language; never slip into German — even if the brand or competitors are German names.'
    : 'LANGUAGE (critical): Reply entirely in natural German. Mirror the user’s language; do not slip into English unless they write in English.'
}

/** True when the user message is a GEO / prompt-bank elicitation brief. */
export function isResearchElicitationMessage(message: string): boolean {
  return RESEARCH_ELICITATION_RE.test(message || '')
}

/** True when the user message is a short social greeting. */
export function isGreetingMessage(message: string): boolean {
  const trimmed = (message || '').trim()
  if (!trimmed || trimmed.length > 80) return false
  if (isResearchElicitationMessage(trimmed)) return false
  return GREETING_RE.test(trimmed)
}

export function researchElicitationEnvelope(): string {
  return [
    RESEARCH_ELICITATION_HEADING,
    'Secondary task: the human wants questions or opinions for research.',
    'Natural dialogue rules still win — stay fully in character.',
    'One short spoken lead-in (≤1 sentence), then plain numbered questions — no category names or section titles.',
    'Default: at most 6 short questions. Only if they explicitly ask for 9 / nine / “je 3”, you may give up to 9.',
    'Still no U/BV/BR or “Unbranded/Branded” labels. No thanks-for-the-brief, no process coaching.',
  ].join('\n')
}

/** Detect explicit ask for a full 9-question bank (vs default max 6). */
export function wantsNineElicitationQuestions(message: string): boolean {
  return /(?:\b9\b|\bneun\b|je\s*3|insgesamt\s*9|9\s*Fragen)/i.test(message || '')
}

export function greetingTurnEnvelope(): string {
  return [
    GREETING_TURN_HEADING,
    'This is small talk only.',
    'Reply in 1–2 short sentences (~15–40 words).',
    'No product specs, SCOP, datasheets, deep brand analysis, or project jargon unless they ask.',
    'No emoji. Do not end with “Und bei dir?” / “How about you?”.',
  ].join('\n')
}

export const LANGUAGE_TURN_HEADING = '## Language (this turn)'

export function languageTurnEnvelope(locale: ChatLocale): string {
  return locale === 'en'
    ? [
        LANGUAGE_TURN_HEADING,
        'The user wrote in English. Reply entirely in English this turn.',
        'Do not switch to German mid-reply. Brand names (Vaillant, Viessmann) stay as-is.',
      ].join('\n')
    : [
        LANGUAGE_TURN_HEADING,
        'The user wrote in German. Reply entirely in German this turn.',
        'Do not switch to English mid-reply unless they did.',
      ].join('\n')
}

/**
 * Append per-turn envelopes. Greeting wins over elicitation when both match
 * (elicitation briefs are never short greetings in practice).
 * Always append a language lock from the latest user message.
 */
export function withTurnEnvelopes(systemPrompt: string, userMessage: string): string {
  const parts = [systemPrompt.trim()]
  if (isGreetingMessage(userMessage)) {
    parts.push(greetingTurnEnvelope())
  } else if (isResearchElicitationMessage(userMessage)) {
    parts.push(researchElicitationEnvelope())
  }
  parts.push(languageTurnEnvelope(detectChatLocale(userMessage)))
  return clip(parts.filter(Boolean).join('\n\n'), PROMPT_MAX_CHARS)
}

/** @deprecated use withTurnEnvelopes */
export function withResearchElicitationEnvelope(
  systemPrompt: string,
  userMessage: string,
): string {
  return withTurnEnvelopes(systemPrompt, userMessage)
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
  const locale = detectChatLocale(opts?.message, opts?.locale)

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
    fewShotBlock(persona.traits ?? {}, locale),
    localeInstruction(locale),
    chatRulesBlock(),
  ].filter(Boolean)

  return clip(sections.join('\n\n'), PROMPT_MAX_CHARS)
}
