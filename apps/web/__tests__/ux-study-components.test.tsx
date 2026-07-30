import { describe, expect, it, afterEach, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { StudyDetailPanel } from '../components/study-detail-panel'
import { StudyListPanel } from '../components/study-list-panel'
import { WaveDetailPanel } from '../components/wave-detail-panel'
import { resetUxStudyStore, storeUxStudyDetail, storeUxWaveDetail } from '../lib/fixtures/ux-study-store'
import { paths } from '../lib/paths'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}))

vi.mock('../components/knowledge-rich-editor', () => ({
  KnowledgeRichEditor: ({
    content,
    onChange,
  }: {
    content: string
    onChange: (html: string) => void
  }) => (
    <textarea
      aria-label="Wave report editor"
      defaultValue={content}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}))

afterEach(() => {
  cleanup()
  resetUxStudyStore()
})

describe('UX study UI (magazine + DS)', () => {
  it('renders study list cards with create affordance', () => {
    const study = storeUxStudyDetail('study-ebm-produktkombinationen')!
    const { container } = render(
      <StudyListPanel
        list={{
          items: [
            {
              id: study.id,
              name: study.name,
              status: study.status,
              projectId: study.projectId,
              sourceGuide: study.sourceGuide,
              targetUrlKey: study.targetUrlKey,
              waveCount: study.waveCount,
              updatedAt: study.updatedAt,
            },
          ],
          total: 1,
          page: 1,
          pageSize: 50,
        }}
      />,
    )
    expect(container.querySelector('.audion-tg-grid')).toBeTruthy()
    expect(container.querySelector('.audion-tg-card--create')).toBeTruthy()
    expect(screen.getByRole('link', { name: /Produktkombinationen/i })).toHaveAttribute(
      'href',
      paths.routes.studyDetail(study.id),
    )
  })

  it('renders study detail magazine chrome with hypotheses and waves', () => {
    const study = storeUxStudyDetail('study-ebm-produktkombinationen')!
    const { container } = render(<StudyDetailPanel study={study} />)
    expect(container.querySelector('.audion-magazine--study')).toBeTruthy()
    expect(container.querySelector('.audion-magazine-hero--split')).toBeTruthy()
    expect(container.querySelectorAll('.audion-magazine-band.ds-panel').length).toBeGreaterThanOrEqual(2)
    expect(container.querySelector('.section-chrome-title')?.textContent).toMatch(/Hypotheses/i)
    expect(container.querySelector('.ds-rank')).toBeTruthy()
    expect(container.querySelector('.audion-tg-grid--nested')).toBeTruthy()
    expect(screen.getAllByRole('button', { name: /New wave/i }).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByRole('link', { name: /audion-2026-07-30-mcp/i })).toHaveAttribute(
      'href',
      paths.routes.studyWaveDetail(study.id, 'wave-audion-2026-07-30-mcp'),
    )
  })

  it('renders wave detail with DS lede, start/compare, report, and F-Fragen chat', () => {
    const study = storeUxStudyDetail('study-ebm-produktkombinationen')!
    const wave = storeUxWaveDetail(study.id, 'wave-audion-2026-07-30-mcp')!
    const { container } = render(
      <WaveDetailPanel study={study} wave={wave} selfCompare={null} />,
    )
    expect(container.querySelector('.audion-magazine--wave')).toBeTruthy()
    expect(container.querySelector('.ds-stat-lede-group')).toBeTruthy()
    expect(container.querySelectorAll('.ds-stat-lede').length).toBeGreaterThanOrEqual(3)
    expect(container.querySelector('.audion-soft-q-lede-stats')).toBeTruthy()
    expect(container.querySelector('.audion-soft-q-edit-row')).toBeTruthy()
    expect(container.querySelector('#soft-value-Q1_nuetzlichkeit')).toBeTruthy()
    expect(container.querySelector('#soft-conf-Q1_nuetzlichkeit')).toBeTruthy()
    expect(container.querySelector('.audion-magazine-topbar-actions')).toBeTruthy()
    expect(screen.getByRole('button', { name: /Start agent/i })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Evaluate' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Compare' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Export report' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Edit' })).toBeEnabled()
    expect(container.querySelector('.ds-accordion')).toBeTruthy()
    expect(container.querySelector('.audion-study-prompt-grid')).toBeTruthy()
    expect(screen.getAllByRole('link', { name: /Open in Chat/i }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: /Open in Chat/i })[0]).toHaveAttribute(
      'href',
      expect.stringContaining('personaId='),
    )
    expect(screen.getAllByRole('link', { name: /Open in Chat/i })[0]).toHaveAttribute(
      'href',
      expect.stringContaining('studyId='),
    )
    expect(screen.getAllByRole('link', { name: /Open in Chat/i })[0]).toHaveAttribute(
      'href',
      expect.stringContaining('/chat?'),
    )
    expect(container.querySelector('.audion-wave-run-panel')).toBeTruthy()
    expect(container.querySelector('.audion-wave-run-scoreviz')).toBeTruthy()
    expect(container.querySelector('.briefing-radar-svg')).toBeTruthy()
    expect(container.querySelector('.ds-diverging-bars')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Export report' }))
    expect(container.querySelector('.audion-wave-export-preview')).toBeTruthy()
    expect(container.querySelector('.audion-wave-export-preview')?.textContent).toMatch(/Report/i)
  })
})
