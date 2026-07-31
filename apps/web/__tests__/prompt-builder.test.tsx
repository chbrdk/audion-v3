import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PromptBuilderWorkspace } from '../components/prompt-builder/PromptBuilderWorkspace'
import {
  getPersonaPromptDetail,
  resetPersonaPrompt,
  updatePersonaPrompt,
} from '../lib/settings-persona-prompts'
import {
  resetPersonaPromptsStore,
  resolvePersonaSystemPrompt,
} from '../lib/fixtures/persona-prompts-store'
import { paths } from '../lib/paths'

describe('persona prompts store', () => {
  afterEach(() => {
    resetPersonaPromptsStore()
  })

  it('updates and resolves custom system prompt', async () => {
    const personaId = 'persona-alex-morgan'
    const before = await resolvePersonaSystemPrompt(personaId)
    expect(before.length).toBeGreaterThan(10)

    const updated = await updatePersonaPrompt(personaId, {
      systemPrompt: 'CUSTOM PROMPT FOR ALEX',
    })
    expect('error' in updated).toBe(false)
    if ('error' in updated) return
    expect(updated.hasCustom).toBe(true)
    expect(await resolvePersonaSystemPrompt(personaId)).toBe('CUSTOM PROMPT FOR ALEX')

    await resetPersonaPrompt(personaId)
    expect(await resolvePersonaSystemPrompt(personaId)).not.toBe('CUSTOM PROMPT FOR ALEX')
    expect(await getPersonaPromptDetail(personaId)).toMatchObject({ hasCustom: false })
  })
})

describe('PromptBuilderWorkspace', () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    resetPersonaPromptsStore()
  })

  it('loads catalog, inserts variable, and saves assist override', async () => {
    let assistPrompt = 'Hello ${persona_name}'
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url === paths.routes.apiSettingsPrompts && (!init?.method || init.method === 'GET')) {
        return new Response(
          JSON.stringify({
            templates: [
              {
                id: 'persona.interests',
                label: 'Interests',
                description: 'd',
                category: 'persona',
                json: true,
                overridden: false,
                system: 'sys',
                user: assistPrompt,
                prompt: assistPrompt,
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }
      if (url === paths.routes.apiSettingsPersonaPrompts) {
        return new Response(
          JSON.stringify({
            items: [
              {
                personaId: 'persona-alex-morgan',
                name: 'Alex Morgan',
                hasCustom: false,
                updatedAt: null,
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }
      if (
        url === paths.routes.apiSettingsPromptDetail('persona.interests') &&
        init?.method === 'PUT'
      ) {
        const body = JSON.parse(String(init.body || '{}')) as { prompt?: string }
        assistPrompt = body.prompt || assistPrompt
        return new Response(
          JSON.stringify({
            id: 'persona.interests',
            label: 'Interests',
            description: 'd',
            category: 'persona',
            json: true,
            overridden: true,
            system: 'sys',
            user: assistPrompt,
            prompt: assistPrompt,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }
      if (url === paths.routes.apiSettingsPromptDetail('persona.interests') && init?.method === 'DELETE') {
        return new Response(
          JSON.stringify({
            id: 'persona.interests',
            label: 'Interests',
            description: 'd',
            category: 'persona',
            json: true,
            overridden: false,
            system: 'sys',
            user: 'Hello ${persona_name}',
            prompt: 'Hello ${persona_name}',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }
      return new Response('not found', { status: 404 })
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<PromptBuilderWorkspace />)
    await waitFor(() => {
      expect(screen.getByTestId('prompt-builder-workspace')).toBeTruthy()
      expect(screen.getByTestId('pb-editor')).toBeTruthy()
    })

    const chip = screen.getByTestId('pb-var-max_items')
    fireEvent.click(chip)
    await waitFor(() => {
      expect((screen.getByTestId('pb-editor') as HTMLTextAreaElement).value).toContain(
        '${max_items}',
      )
    })

    fireEvent.click(screen.getByTestId('pb-save'))
    await waitFor(() => {
      expect(fetchMock.mock.calls.some((c) => String(c[0]).includes('persona.interests'))).toBe(
        true,
      )
    })
  })
})
