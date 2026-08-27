import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
import { resetPersonaStore } from '../lib/fixtures/persona-store'
import { paths } from '../lib/paths'

describe('persona prompts store', () => {
  beforeEach(() => {
    resetPersonaStore()
    resetPersonaPromptsStore()
  })

  afterEach(() => {
    resetPersonaStore()
    resetPersonaPromptsStore()
  })

  it('updates and resolves custom voice as overlay on adaptive profile', async () => {
    const personaId = 'persona-alex-morgan'
    const before = await resolvePersonaSystemPrompt(personaId)
    expect(before).toContain('You ARE Alex Morgan')
    expect(before).toContain('Personality traits')
    expect(before).toContain('Analytical: 0.82')

    const updated = await updatePersonaPrompt(personaId, {
      systemPrompt: 'CUSTOM VOICE FOR ALEX',
    })
    expect('error' in updated).toBe(false)
    if ('error' in updated) return
    expect(updated.hasCustom).toBe(true)
    expect(updated.systemPrompt).toBe('CUSTOM VOICE FOR ALEX')
    expect(updated.resolvedSystemPrompt).toContain('CUSTOM VOICE FOR ALEX')
    expect(updated.resolvedSystemPrompt).toContain('Analytical: 0.82')
    expect(updated.adaptiveProfilePrompt).not.toContain('CUSTOM VOICE FOR ALEX')

    const resolved = await resolvePersonaSystemPrompt(personaId)
    expect(resolved).toContain('CUSTOM VOICE FOR ALEX')
    expect(resolved).toContain('Personality traits')
    expect(resolved).not.toBe('CUSTOM VOICE FOR ALEX')

    await resetPersonaPrompt(personaId)
    const after = await resolvePersonaSystemPrompt(personaId)
    expect(after).not.toContain('CUSTOM VOICE FOR ALEX')
    expect(after).toContain('Analytical: 0.82')
    const detail = await getPersonaPromptDetail(personaId)
    expect(detail).toMatchObject({ hasCustom: false, systemPrompt: '' })
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
