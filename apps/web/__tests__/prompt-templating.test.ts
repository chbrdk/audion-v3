import { afterEach, describe, expect, it } from 'vitest'
import {
  getAssistTemplate,
  renderTemplate,
  ASSIST_TEMPLATES,
} from '../lib/ai/prompts/templates'
import {
  appendLocaleOutputGuard,
  finalizeAssistVars,
  substituteVars,
} from '../lib/ai/prompts/render'
import {
  deletePromptOverride,
  resetPromptOverridesStore,
  upsertPromptOverride,
} from '../lib/fixtures/prompt-overrides-store'
import {
  listAssistTemplates,
  resetAssistTemplate,
  updateAssistTemplate,
} from '../lib/settings-admin'

describe('assist prompt render', () => {
  it('substitutes ${var} and {{var}}', () => {
    const out = substituteVars('Hello ${persona_name} / {{locale}}', {
      persona_name: 'Alex',
      locale: 'en',
    })
    expect(out).toContain('Alex')
    expect(out).toContain('en')
  })

  it('finalizes locale aliases', () => {
    const vars = finalizeAssistVars({ locale: 'de' })
    expect(vars.output_locale).toBe('de')
    expect(vars.generated_text_locale_name).toBe('German')
  })

  it('appends locale footer', () => {
    const en = appendLocaleOutputGuard('BODY', 'en')
    expect(en).toMatch(/CRITICAL OUTPUT LANGUAGE/)
    const de = appendLocaleOutputGuard('BODY', 'de')
    expect(de).toMatch(/AUSGABESPRACHE DEUTSCH/)
  })

  it('renders ported persona.interests with locale name', async () => {
    const t = await getAssistTemplate('persona.interests')
    expect(t.prompt.length).toBeGreaterThan(200)
    expect(t.prompt).toContain('${max_items}')
    const { user } = renderTemplate(t, {
      locale: 'en',
      max_items: '4',
      persona_profile: 'Alex',
      persona_interests: 'cycling',
      target_group_summary: 'riders',
    })
    expect(user).toContain('English')
    expect(user).toContain('maximum 4 points')
    expect(user).toContain('CRITICAL OUTPUT LANGUAGE')
    expect(user).not.toContain('${max_items}')
  })

  it('includes V2-ported and V3-extra ids', () => {
    expect(ASSIST_TEMPLATES['journey.moments']).toBeTruthy()
    expect(ASSIST_TEMPLATES['persona.geo_questions']).toBeTruthy()
    expect(ASSIST_TEMPLATES['moodboard.style_keywords']).toBeTruthy()
    expect(ASSIST_TEMPLATES['journey.validate_chat']).toBeTruthy()
    expect(ASSIST_TEMPLATES['persona.chat_system_default']).toBeTruthy()
  })
})

describe('assist prompt overrides', () => {
  afterEach(() => {
    resetPromptOverridesStore()
  })

  it('lists labels and applies override then reset', async () => {
    const listed = await listAssistTemplates()
    const interests = listed.templates.find((t) => t.id === 'persona.interests')
    expect(interests?.label).toMatch(/Interest/i)
    expect(interests?.overridden).toBe(false)
    expect(interests?.prompt.length).toBeGreaterThan(100)

    const updated = await updateAssistTemplate('persona.interests', {
      prompt: 'OVERRIDE ${max_items} ${generated_text_locale_name}',
    })
    expect('error' in updated).toBe(false)
    if ('error' in updated) return
    expect(updated.overridden).toBe(true)
    expect(updated.prompt).toContain('OVERRIDE')

    const rendered = renderTemplate(await getAssistTemplate('persona.interests'), {
      locale: 'de',
      max_items: '2',
    })
    expect(rendered.user).toContain('OVERRIDE 2 German')

    const reset = await resetAssistTemplate('persona.interests')
    expect('error' in reset).toBe(false)
    if ('error' in reset) return
    expect(reset.overridden).toBe(false)
    expect(await deletePromptOverride('persona.interests')).toBe(false)
  })

  it('rejects empty update', async () => {
    expect(await updateAssistTemplate('persona.interests', {})).toEqual({
      error: 'Provide system, user, and/or prompt',
      status: 400,
    })
  })

  it('upserts via store helper', async () => {
    await upsertPromptOverride('journey.moments', { system: 'SYS' })
    expect((await getAssistTemplate('journey.moments')).system).toBe('SYS')
  })
})
