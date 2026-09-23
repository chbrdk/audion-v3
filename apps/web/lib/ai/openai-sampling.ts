/**
 * OpenAI chat sampling knobs — some models only allow the API default.
 * @see knowledge/openai-model-gpt-6-luna-2026-09-23.md
 */

/** True when the Completions API accepts a non-default `temperature`. */
export function openAiModelAllowsCustomTemperature(model: string): boolean {
  const m = model.trim().toLowerCase()
  if (!m) return true
  // GPT-6 Luna: "Only the default (1) value is supported."
  if (m.includes('gpt-6-luna')) return false
  // Reasoning / GPT-5 family: fixed sampling (omit temperature).
  if (/\bgpt-5/.test(m)) return false
  if (/(^|[^a-z])o[1-4]([^0-9]|$)/.test(m)) return false
  return true
}

/** Spread into `chat.completions.create` — empty when the model rejects custom temp. */
export function withOpenAiChatTemperature(
  preferred: number,
  model: string,
): { temperature?: number } {
  if (!openAiModelAllowsCustomTemperature(model)) return {}
  return { temperature: preferred }
}
