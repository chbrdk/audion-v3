import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { UxJourneyStepsStrip } from '../components/ux-journey-steps-strip'

describe('UxJourneyStepsStrip readable compact preview', () => {
  it('shows one Denken preview and hides closed channel labels until expand', () => {
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
              seen: 'Hero and category rail',
              think: 'Ich öffne die Möbel-Martin Startseite.',
              priorKnow: null,
              learned: 'Home loaded',
              next: 'Nach Grillplatte suchen',
              why: null,
              feel: null,
            },
            result: 'Navigated',
          },
        ]}
        stepsTotal={6}
      />,
    )

    expect(screen.getByText('Ich öffne die Möbel-Martin Startseite.')).toBeInTheDocument()
    expect(screen.getByText('Denken')).toBeInTheDocument()
    expect(screen.queryByText('Gesehenes')).toBeNull()
    expect(screen.queryByText('Nächster Schritt')).toBeNull()
    expect(screen.queryByText('Ergebnis')).toBeNull()

    fireEvent.click(screen.getByLabelText(/Step 01 · Navigate/i))
    expect(screen.getByText('Gesehenes')).toBeInTheDocument()
    expect(screen.getByText('Nächster Schritt')).toBeInTheDocument()
    expect(screen.getByText('Ergebnis')).toBeInTheDocument()
  })

  it('does not surface bookkeeping Start as Denken when action beat is available', () => {
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
    // Fallback synthesis happens in toChatUxJourneySteps; strip still filters stubs.
    // Without remapping, empty think → no Denken lane if only stub.
    expect(screen.queryByText('Denken')).toBeNull()
  })
})
