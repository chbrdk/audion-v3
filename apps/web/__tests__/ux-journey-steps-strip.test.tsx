import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { UxJourneyStepsStrip } from '../components/ux-journey-steps-strip'

describe('UxJourneyStepsStrip persona moment channels', () => {
  it('shows Gesehenes / Denken / Gefühl / Ziel channels on compact cards', () => {
    Element.prototype.scrollIntoView = vi.fn()
    Element.prototype.scrollTo = vi.fn() as never

    render(
      <UxJourneyStepsStrip
        steps={[
          {
            step: 1,
            action: 'navigate',
            target: 'https://www.moebel-martin.de/',
            thinkAloud: {
              seen: 'Hero and category rail with Gartenmöbel',
              think: 'Ich öffne die Möbel-Martin Startseite und suche Orientierung.',
              priorKnow: 'Möbelhäuser verstecken Grillzubehör oft tief in Kategorien',
              learned: 'Home loaded',
              next: 'Nach Grillplatte in der Navigation suchen',
              why: 'Ohne sichtbaren Einstieg komme ich dem Ziel nicht näher',
              feel: { label: 'unsicher', valence: -1 },
            },
            result: 'Navigated',
          },
        ]}
        stepsTotal={6}
      />,
    )

    expect(screen.getByText('Gesehenes')).toBeInTheDocument()
    expect(screen.getByText('Denken')).toBeInTheDocument()
    expect(screen.getByText('Nächster Schritt')).toBeInTheDocument()
    expect(screen.getByText('Warum')).toBeInTheDocument()
    expect(screen.getAllByText('Gefühl').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/Hero and category rail/)).toBeInTheDocument()
    expect(screen.getByText(/komme ich dem Ziel nicht näher/)).toBeInTheDocument()
    // Secondary lanes stay expand-only
    expect(screen.queryByText('Schon gewusst')).toBeNull()
    expect(screen.queryByText('Ergebnis')).toBeNull()

    fireEvent.click(screen.getByLabelText(/Step 01 · Navigate/i))
    expect(screen.getByText('Schon gewusst')).toBeInTheDocument()
    expect(screen.getByText('Ergebnis')).toBeInTheDocument()
  })

  it('does not surface bookkeeping Start as Denken', () => {
    Element.prototype.scrollIntoView = vi.fn()
    Element.prototype.scrollTo = vi.fn() as never

    render(
      <UxJourneyStepsStrip
        steps={[
          {
            step: 1,
            action: 'navigate',
            target: 'https://www.moebel-martin.de/',
            reasoning: 'Start',
            thinkAloud: {
              seen: null,
              think: 'Start',
              priorKnow: null,
              learned: null,
              next: null,
              why: null,
              feel: null,
            },
          },
        ]}
      />,
    )

    expect(screen.queryByText('Start')).toBeNull()
    expect(screen.queryByText('Denken')).toBeNull()
  })
})
