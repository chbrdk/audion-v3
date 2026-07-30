/**
 * Native AiAssist — template → OpenAI completion → parsed suggestions/JSON.
 */

import type { AiSuggestionItem } from '@audion-v3/contracts'
import {
  ASSIST_TEMPLATES,
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

function suggestionsFromJson(json: unknown, prefix: string): AiSuggestionItem[] {
  if (!json || typeof json !== 'object') return []
  const rec = json as Record<string, unknown>
  const items = Array.isArray(rec.items)
    ? rec.items
    : Array.isArray(rec.suggestions)
      ? rec.suggestions
      : Array.isArray(json)
        ? json
        : []
  return items.map((item, index) => {
    if (typeof item === 'string') {
      return { id: `${prefix}-${index + 1}`, title: item }
    }
    if (item && typeof item === 'object') {
      const row = item as Record<string, unknown>
      const title =
        (typeof row.title === 'string' && row.title) ||
        (typeof row.name === 'string' && row.name) ||
        (typeof row.label === 'string' && row.label) ||
        `Item ${index + 1}`
      return {
        id: typeof row.id === 'string' ? row.id : `${prefix}-${index + 1}`,
        title,
        subtitle:
          (typeof row.subtitle === 'string' && row.subtitle) ||
          (typeof row.role === 'string' && row.role) ||
          null,
        description:
          (typeof row.description === 'string' && row.description) ||
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
): Promise<AssistResult> {
  const template = ASSIST_TEMPLATES[templateId]
  if (!template) {
    return { error: 'Unknown assist template', status: 400, detail: templateId }
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
