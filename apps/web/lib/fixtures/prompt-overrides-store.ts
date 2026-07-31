/**
 * In-memory global assist template overrides (fixtures until product Postgres).
 * Spec: specs/domain/prompt-templating.md · specs/api/settings-prompts.md
 */

export type AssistTemplateOverridePayload = {
  system?: string | null
  user?: string | null
  prompt?: string | null
  updatedAt: string
}

type Store = {
  byId: Map<string, AssistTemplateOverridePayload>
}

const g = globalThis as unknown as { __audionPromptOverridesStore?: Store }

function store(): Store {
  if (!g.__audionPromptOverridesStore) {
    g.__audionPromptOverridesStore = { byId: new Map() }
  }
  return g.__audionPromptOverridesStore
}

export function resetPromptOverridesStore(): void {
  store().byId.clear()
}

export function getPromptOverride(templateId: string): AssistTemplateOverridePayload | null {
  return store().byId.get(templateId) ?? null
}

export function listPromptOverrideIds(): string[] {
  return [...store().byId.keys()]
}

export function upsertPromptOverride(
  templateId: string,
  patch: { system?: string | null; user?: string | null; prompt?: string | null },
): AssistTemplateOverridePayload {
  const prev = store().byId.get(templateId)
  const next: AssistTemplateOverridePayload = {
    system: patch.system !== undefined ? patch.system : (prev?.system ?? null),
    user: patch.user !== undefined ? patch.user : (prev?.user ?? null),
    prompt: patch.prompt !== undefined ? patch.prompt : (prev?.prompt ?? null),
    updatedAt: new Date().toISOString(),
  }
  store().byId.set(templateId, next)
  return next
}

export function deletePromptOverride(templateId: string): boolean {
  return store().byId.delete(templateId)
}
