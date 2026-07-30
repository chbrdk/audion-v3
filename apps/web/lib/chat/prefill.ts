/** Chat deep-link / prefill helpers — keep URLs in paths; draft composition here. */

export type ChatPrefillContext = {
  prompt: string
  personaId?: string | null
  studyId?: string | null
  waveId?: string | null
  projectId?: string | null
  studyName?: string | null
  waveKey?: string | null
}

/** Composer draft: optional study/wave header + F-question prompt. */
export function buildChatPrefillDraft(ctx: ChatPrefillContext): string {
  const prompt = ctx.prompt.trim()
  const bits = [
    ctx.studyName?.trim() ? `Study: ${ctx.studyName.trim()}` : null,
    ctx.waveKey?.trim() ? `Wave: ${ctx.waveKey.trim()}` : null,
  ].filter(Boolean)
  if (!bits.length) return prompt
  return [`[UX Study · ${bits.join(' · ')}]`, '', prompt].join('\n')
}

/** Query contract for `/chat` deep-links from Studies / elsewhere. */
export function buildChatHref(ctx: ChatPrefillContext): string {
  const params = new URLSearchParams()
  if (ctx.prompt.trim()) params.set('prompt', ctx.prompt.trim())
  if (ctx.personaId?.trim()) params.set('personaId', ctx.personaId.trim())
  if (ctx.studyId?.trim()) params.set('studyId', ctx.studyId.trim())
  if (ctx.waveId?.trim()) params.set('waveId', ctx.waveId.trim())
  if (ctx.projectId?.trim()) params.set('projectId', ctx.projectId.trim())
  if (ctx.studyName?.trim()) params.set('studyName', ctx.studyName.trim())
  if (ctx.waveKey?.trim()) params.set('waveKey', ctx.waveKey.trim())
  const qs = params.toString()
  return qs ? `/chat?${qs}` : '/chat'
}

/** Prefer validEvidence run persona, else first run with personaId. */
export function pickWaveChatPersonaId(
  runs: Array<{ personaId: string | null; validEvidence: boolean | null }>,
): string | null {
  const valid = runs.find((r) => r.validEvidence === true && r.personaId)
  if (valid?.personaId) return valid.personaId
  return runs.find((r) => r.personaId)?.personaId ?? null
}
