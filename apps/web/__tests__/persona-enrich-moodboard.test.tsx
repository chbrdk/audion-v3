import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EnrichPersonaButton } from '../components/enrich-persona-button'
import { PersonaEditableVisuals } from '../components/persona-editable-visuals'
import { paths } from '../lib/paths'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}))

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('persona enrich + moodboard UI', () => {
  it('renders Enrich with AI and posts after confirm', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        stubbed: true,
        workflowId: 'enrichPersona',
        facetsUpdated: ['interests', 'values'],
        interests: [],
        values: [],
        goals: [],
        frustrations: [],
        traits: {},
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<EnrichPersonaButton personaId="persona-alex-morgan" personaName="Alex Morgan" />)
    fireEvent.click(screen.getByRole('button', { name: /Enrich with AI/i }))
    expect(screen.getByText(/deepen interests/i)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /^Enrich$/i }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        paths.routes.apiAiEnrichPersona('persona-alex-morgan'),
        expect.objectContaining({ method: 'POST' }),
      )
    })
    await waitFor(() => {
      expect(screen.getByText(/Updated interests, values/i)).toBeTruthy()
    })
  })

  it('renders Generate moodboard and posts to AI route', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        stubbed: true,
        workflowId: 'generateMoodboard',
        status: 'stubbed',
        visuals: {
          styleKeywords: ['editorial light'],
          tiles: [
            {
              id: 't1',
              imageUrl: '/fixtures/personas/visuals/tone-warm.svg',
              category: 'tone',
              caption: 'Atmosphere',
            },
          ],
        },
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    render(
      <PersonaEditableVisuals
        personaId="persona-alex-morgan"
        visuals={{ styleKeywords: [], tiles: [] }}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Generate moodboard/i }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        paths.routes.apiAiGenerateMoodboard('persona-alex-morgan'),
        expect.objectContaining({ method: 'POST' }),
      )
    })
    await waitFor(() => {
      expect(screen.getByText('editorial light')).toBeTruthy()
    })
  })

  it('toggles tile lock via PATCH and keeps locked tile after generate', async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (typeof url === 'string' && url.includes('/moodboard/generate')) {
        return {
          ok: true,
          json: async () => ({
            stubbed: true,
            workflowId: 'generateMoodboard',
            status: 'stubbed',
            visuals: {
              styleKeywords: ['kept style'],
              tiles: [
                {
                  id: 'locked-tone',
                  imageUrl: '/fixtures/personas/visuals/locked-keep.svg',
                  category: 'tone',
                  caption: 'Locked atmosphere',
                  locked: true,
                },
                {
                  id: 'new-material',
                  imageUrl: '/fixtures/personas/visuals/material-soft.svg',
                  category: 'material',
                  caption: 'Texture',
                  locked: false,
                },
              ],
            },
          }),
        }
      }
      return {
        ok: true,
        json: async () => ({}),
      }
    })
    vi.stubGlobal('fetch', fetchMock)

    render(
      <PersonaEditableVisuals
        personaId="persona-alex-morgan"
        visuals={{
          styleKeywords: ['base'],
          tiles: [
            {
              id: 'locked-tone',
              imageUrl: '/fixtures/personas/visuals/locked-keep.svg',
              category: 'tone',
              caption: 'Locked atmosphere',
              locked: false,
            },
          ],
        }}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Lock Locked atmosphere/i }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        paths.routes.apiPersonaDetail('persona-alex-morgan'),
        expect.objectContaining({ method: 'PATCH' }),
      )
    })

    const patchCall = fetchMock.mock.calls.find(
      (call) => call[1] && (call[1] as RequestInit).method === 'PATCH',
    )
    const patchBody = JSON.parse(String((patchCall?.[1] as RequestInit).body)) as {
      visuals: { tiles: Array<{ id: string; locked?: boolean }> }
    }
    expect(patchBody.visuals.tiles[0]).toMatchObject({ id: 'locked-tone', locked: true })

    await waitFor(() => {
      expect(screen.getByText('Keeps locked tiles')).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('button', { name: /Generate moodboard/i }))

    await waitFor(() => {
      expect(screen.getByAltText('Locked atmosphere')).toBeTruthy()
      expect(screen.getByAltText('Texture')).toBeTruthy()
      expect(screen.getByText('Locked')).toBeTruthy()
    })
  })
})
