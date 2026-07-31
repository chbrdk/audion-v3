/**
 * Native AiAssist — template → OpenAI completion → parsed suggestions/JSON.
 */

import type { AiSuggestionItem } from '@audion-v3/contracts'
import {
  getAssistTemplate,
  isAssistTemplateId,
  renderTemplate,
  type AssistTemplateId,
} from './prompts/templates'
import {
  createOpenAiClient,
  getAiOpenAiModel,
  toAiNativeError,
  type AiNativeError,
} from './client'

export type AssistResult =
  | { ok: true; text: string; json: unknown; suggestions: AiSuggestionItem[] }
  | AiNativeError

function extractJson(raw: string): unknown {
  const trimmed = raw.trim()
  try {
    return JSON.parse(trimmed)
  } catch {
    const start = trimmed.indexOf('{')
    const end = trimmed.lastIndexOf('}')
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1))
      } catch {
        /* fall through */
      }
    }
  }
  return null
}

function itemsFromJson(json: unknown): unknown[] {
  if (!json || typeof json !== 'object') {
    return Array.isArray(json) ? json : []
  }
  const rec = json as Record<string, unknown>
  for (const key of [
    'items',
    'suggestions',
    'moments',
    'traits',
    'vocabulary',
    'sentence_structure',
  ]) {
    if (Array.isArray(rec[key])) return rec[key] as unknown[]
  }
  return Array.isArray(json) ? json : []
}

function suggestionsFromJson(json: unknown, prefix: string): AiSuggestionItem[] {
  const items = itemsFromJson(json)
  return items.map((item, index) => {
    if (typeof item === 'string') {
      return { id: `${prefix}-${index + 1}`, title: item }
    }
    if (item && typeof item === 'object') {
      const row = item as Record<string, unknown>
      const title =
        (typeof row.title === 'string' && row.title) ||
        (typeof row.name === 'string' && row.name) ||
        (typeof row.word === 'string' && row.word) ||
        (typeof row.label === 'string' && row.label) ||
        (typeof row.content === 'string' && row.content.slice(0, 80)) ||
        `Item ${index + 1}`
      return {
        id: typeof row.id === 'string' ? row.id : `${prefix}-${index + 1}`,
        title,
        subtitle:
          (typeof row.subtitle === 'string' && row.subtitle) ||
          (typeof row.role === 'string' && row.role) ||
          (typeof row.element_type === 'string' && row.element_type) ||
          null,
        description:
          (typeof row.description === 'string' && row.description) ||
          (typeof row.content === 'string' && row.content) ||
          (typeof row.detail === 'string' && row.detail) ||
          null,
      }
    }
    return { id: `${prefix}-${index + 1}`, title: String(item) }
  })
}

export async function runAssist(
  templateId: AssistTemplateId,
  vars: Record<string, string>,
  override?: { system?: string | null; prompt?: string | null },
): Promise<AssistResult> {
  if (!isAssistTemplateId(templateId)) {
    return { error: 'Unknown assist template', status: 400, detail: templateId }
  }
  const base = getAssistTemplate(templateId)
  const template = {
    ...base,
    system: override?.system?.trim() ? override.system : base.system,
    prompt: override?.prompt?.trim()
      ? override.prompt
      : base.prompt,
    user: override?.prompt?.trim() ? '' : base.user,
  }
  try {
    const client = createOpenAiClient()
    const { system, user } = renderTemplate(template, vars)
    const completion = await client.chat.completions.create({
      model: getAiOpenAiModel(),
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      ...(template.json ? { response_format: { type: 'json_object' as const } } : {}),
      temperature: 0.7,
    })
    const text = completion.choices[0]?.message?.content?.trim() || ''
    const json = template.json ? extractJson(text) : null
    return {
      ok: true,
      text,
      json,
      suggestions: suggestionsFromJson(json ?? text, templateId.replace(/\W+/g, '-')),
    }
  } catch (error) {
    return toAiNativeError(error, 'Assist generation failed')
  }
}

export async function runAssistJson<T = unknown>(
  templateId: AssistTemplateId,
  vars: Record<string, string>,
): Promise<{ ok: true; data: T; text: string } | AiNativeError> {
  const result = await runAssist(templateId, vars)
  if ('error' in result) return result
  if (result.json == null) {
    return { error: 'Assist returned non-JSON', status: 502, detail: result.text.slice(0, 240) }
  }
  return { ok: true, data: result.json as T, text: result.text }
}
