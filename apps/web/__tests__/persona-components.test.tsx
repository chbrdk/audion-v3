import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PersonaDetail, PersonaList } from '@audion-v3/contracts'
import type { TargetGroupDetail, TargetGroupList } from '@audion-v3/contracts'
import { PersonaDetailPanel } from '../components/persona-detail-panel'
import { PersonaListPanel } from '../components/persona-list-panel'
import { TargetGroupDetailPanel } from '../components/target-group-detail-panel'
import { TargetGroupListPanel } from '../components/target-group-list-panel'
import { JourneyDetailPanel } from '../components/journey-detail-panel'
import { JourneyListPanel } from '../components/journey-list-panel'
import { paths } from '../lib/paths'
import type { JourneyDetail, JourneyList } from '@audion-v3/contracts'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
}))

afterEach(() => cleanup())

const list: PersonaList = {
  items: [
    {
      id: 'p1',
      name: 'Alex Morgan',
      role: 'Product Lead',
      projectId: null,
      status: 'ready',
      archetype: 'Builder',
      updatedAt: null,
      avatarUrl: '/fixtures/personas/persona-alex-morgan.svg',
    },
  ],
  total: 1,
  page: 1,
  pageSize: 50,
}

const detail: PersonaDetail = {
  ...list.items[0],
  age: '35-44',
  location: 'Berlin',
  bio: 'Experienced product leader for digital services.',
  gender: null,
  attentionSpan: 'Focused bursts',
  colorPalette: [],
  mediaAffinity: null,
  confidence: 0.7,
  traits: { Analytical: 0.8, Pragmatic: 0.7 },
  interests: ['Service design', 'Product ops'],
  values: ['Clarity', 'Reuse'],
  socialMediaUsage: ['LinkedIn'],
  communicationStyle: {
    vocabulary: ['evidence trail', 'decision loop'],
    sentenceStructure: 'Short, concrete sentences.',
    skepticismLevel: 0.5,
  },
  goals: [{ label: 'Launch faster with clearer evidence trails across research and delivery.', priority: 0 }],
  frustrations: [{ label: 'Slow feedback loops', evidenceCount: 1 }],
  channels: ['Slack'],
  sections: [{ title: 'Mindset', body: 'Prefers short loops.' }],
  visuals: {
    styleKeywords: ['calm editorial'],
    tiles: [
      {
        id: 't1',
        imageUrl: '/fixtures/personas/visuals/tone-warm.svg',
        category: 'tone',
        caption: 'Tone',
      },
    ],
  },
}

const tgList: TargetGroupList = {
  items: [
    {
      id: 'tg1',
      name: 'Digital Product Leads',
      segment: 'B2B SaaS',
      description: 'Leaders',
      status: 'active',
      personaCount: 1,
      projectId: null,
      updatedAt: null,
    },
  ],
  total: 1,
  page: 1,
  pageSize: 50,
}

const tgDetail: TargetGroupDetail = {
  ...tgList.items[0],
  linkedPersonas: [
    {
      id: 'p1',
      name: 'Alex Morgan',
      role: 'Product Lead',
      status: 'ready',
      avatarUrl: '/fixtures/personas/persona-alex-morgan.svg',
    },
  ],
}

describe('persona workspace components', () => {
  it('renders app-card index grid with create CTA', () => {
    const { container } = render(<PersonaListPanel list={list} query="" />)
    expect(screen.getByText('Alex Morgan')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Alex Morgan/i })).toHaveAttribute(
      'href',
      paths.routes.personaDetail('p1'),
    )
    expect(screen.getByRole('button', { name: /New persona/i })).toBeEnabled()
    expect(container.querySelector('.audion-tg-card--create .audion-tg-card-panel')).toBeTruthy()
    expect(container.querySelector('.audion-tg-grid')).toBeTruthy()
    expect(container.querySelector('.audion-tg-card-title')).toHaveTextContent('New persona')
  })

  it('enables edit actions on magazine detail', () => {
    const { container } = render(<PersonaDetailPanel persona={detail} />)
    expect(screen.getByRole('button', { name: 'Edit persona' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Create from template' })).toBeEnabled()
    expect(document.querySelector('.audion-magazine-topbar .audion-edit-icon-btn')).toBeTruthy()
    expect(container.querySelector('.briefing-nav')).toBeNull()
  })

  it('renders quiet reading magazine for long-form content', () => {
    const { container } = render(<PersonaDetailPanel persona={detail} />)
    expect(container.querySelector('.audion-magazine-body')).toBeTruthy()
    expect(container.querySelector('.signal-stage.audion-magazine-stage')).toBeTruthy()
    expect(container.querySelector('.audion-editable-portrait')).toBeTruthy()
    expect(screen.getByRole('button', { name: /Edit Alex Morgan portrait/i })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Generate' }).length).toBeGreaterThan(0)
    expect(container.querySelectorAll('.audion-editable-list')).toHaveLength(6)
    expect(container.querySelector('.audion-magazine-lede')).toHaveTextContent(
      'Experienced product leader for digital services.',
    )
    expect(screen.getByText('Goals')).toBeInTheDocument()
    expect(screen.getByText('Traits')).toBeInTheDocument()
    expect(screen.getByText('Interests')).toBeInTheDocument()
    expect(screen.getByText('Values')).toBeInTheDocument()
    expect(screen.getByText('Communication')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Suggest' }).length).toBeGreaterThanOrEqual(5)
    expect(screen.getByRole('button', { name: 'Suggest vocab' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Suggest structure' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Communication layout' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Quote' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('How they speak')).toBeInTheDocument()
    expect(screen.getByText('Vocabulary')).toBeInTheDocument()
    expect(screen.queryByRole('slider', { name: 'Skepticism level' })).not.toBeInTheDocument()
    expect(container.querySelector('.audion-editable-comm-chip-row')).toBeTruthy()
    expect(screen.queryByText('Social media')).not.toBeInTheDocument()
    expect(screen.getByText('Visuals')).toBeInTheDocument()
    expect(container.querySelector('.audion-editable-visuals')).toBeTruthy()
    expect(container.querySelector('.audion-editable-visuals-keywords')).toBeTruthy()
    expect(screen.getByRole('button', { name: '+ Keyword' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Edit Tone tile/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add tile' })).toBeInTheDocument()
    expect(screen.getByText('Mindset')).toBeInTheDocument()
    expect(container.querySelector('.audion-persona-notes')).toBeTruthy()
    expect(container.querySelector('.audion-project-knowledge')).toBeTruthy()
    expect(screen.getByRole('button', { name: /Add note/i })).toBeInTheDocument()
    expect(container.querySelector('.audion-channel-bubbles')).toBeTruthy()
    expect(container.querySelector('.audion-magazine-meters')).toBeTruthy()
    expect(container.querySelector('.audion-editable-comm--quote')).toBeTruthy()
    expect(container.querySelector('.audion-magazine-visual-grid')).toBeTruthy()
  })

  it('opens tile editor from visuals band', () => {
    render(<PersonaDetailPanel persona={detail} />)
    fireEvent.click(screen.getByRole('button', { name: /Edit Tone tile/i }))
    expect(screen.getByLabelText('Tile category')).toBeInTheDocument()
    expect(screen.getByLabelText('Tile caption')).toBeInTheDocument()
    expect(screen.getByLabelText('Tile image URL')).toBeInTheDocument()
  })

  it('opens style keyword editor from visuals band', () => {
    render(<PersonaDetailPanel persona={detail} />)
    fireEvent.click(screen.getByRole('button', { name: 'calm editorial' }))
    expect(screen.getByLabelText('Edit style keyword 1')).toBeInTheDocument()
  })

  it('opens portrait URL editor from hero', () => {
    render(<PersonaDetailPanel persona={detail} />)
    fireEvent.click(screen.getByRole('button', { name: /Edit Alex Morgan portrait/i }))
    expect(screen.getByLabelText('Portrait image URL')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Generate' })).toBeInTheDocument()
  })

  it('opens AI suggest dialog from interests band', () => {
    render(<PersonaDetailPanel persona={detail} />)
    // Order: Traits, Interests, Values, Goals, Frustrations
    fireEvent.click(screen.getAllByRole('button', { name: 'Suggest' })[1]!)
    expect(screen.getByRole('heading', { name: /Suggest interests/i })).toBeInTheDocument()
  })

  it('switches communication layout to tone dial', () => {
    const { container } = render(<PersonaDetailPanel persona={detail} />)
    fireEvent.click(screen.getByRole('button', { name: 'Tone' }))
    expect(screen.getByRole('button', { name: 'Tone' })).toHaveAttribute('aria-pressed', 'true')
    expect(container.querySelector('.audion-editable-comm--tone')).toBeTruthy()
    expect(screen.getByText('Tone dial')).toBeInTheDocument()
    expect(screen.getByText('Open')).toBeInTheDocument()
    expect(screen.getByText('Skeptical')).toBeInTheDocument()
    expect(screen.getByRole('slider', { name: 'Skepticism level' })).toBeInTheDocument()
    expect(container.querySelector('.audion-editable-comm-chip-row')).toBeTruthy()
  })

  it('opens sentence structure editor from communication band', () => {
    render(<PersonaDetailPanel persona={detail} />)
    fireEvent.click(screen.getByRole('button', { name: /Short, concrete sentences/i }))
    expect(screen.getByLabelText('Edit sentence structure')).toBeInTheDocument()
  })

  it('opens vocabulary editor from communication band', () => {
    render(<PersonaDetailPanel persona={detail} />)
    fireEvent.click(screen.getByRole('button', { name: 'evidence trail' }))
    expect(screen.getByLabelText('Edit vocabulary item 1')).toBeInTheDocument()
  })

  it('opens inline input when clicking a trait label', () => {
    render(<PersonaDetailPanel persona={detail} />)
    fireEvent.click(screen.getByRole('button', { name: 'Analytical' }))
    expect(screen.getByLabelText('Edit trait name 1')).toBeInTheDocument()
  })

  it('updates trait score via slider', () => {
    render(<PersonaDetailPanel persona={detail} />)
    const slider = screen.getByRole('slider', { name: 'Score for Analytical' })
    expect(slider).toHaveValue('80')
    fireEvent.change(slider, { target: { value: '55' } })
    expect(slider).toHaveValue('55')
  })

  it('adds a draft trait from the hover Add item footer', () => {
    render(<PersonaDetailPanel persona={detail} />)
    fireEvent.click(screen.getByRole('button', { name: 'Add trait' }))
    expect(screen.getByLabelText('Edit trait name 3')).toBeInTheDocument()
  })

  it('opens inline input when clicking a goals row', () => {
    render(<PersonaDetailPanel persona={detail} />)
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Launch faster with clearer evidence trails across research and delivery.',
      }),
    )
    expect(screen.getByLabelText('Edit goals item 1')).toBeInTheDocument()
    expect(screen.getByDisplayValue(/Launch faster/)).toBeInTheDocument()
  })

  it('opens inline input when clicking an interests row', () => {
    render(<PersonaDetailPanel persona={detail} />)
    fireEvent.click(screen.getByRole('button', { name: 'Service design' }))
    expect(screen.getByLabelText('Edit interests item 1')).toBeInTheDocument()
  })

  it('adds a draft interest from the hover Add item footer', () => {
    render(<PersonaDetailPanel persona={detail} />)
    fireEvent.click(screen.getByRole('button', { name: 'Add interest' }))
    expect(screen.getByLabelText('Edit interests item 3')).toBeInTheDocument()
  })

  it('opens delete confirm for a list item', () => {
    const { container } = render(<PersonaDetailPanel persona={detail} />)
    fireEvent.click(screen.getByRole('button', { name: 'Delete goals item 1' }))
    expect(container.querySelector('.ds-dialog-title')?.textContent).toBe('Delete goal?')
  })

  it('adds a draft row from the hover Add item footer', () => {
    render(<PersonaDetailPanel persona={detail} />)
    fireEvent.click(screen.getByRole('button', { name: 'Add goal' }))
    expect(screen.getByLabelText('Edit goals item 2')).toBeInTheDocument()
  })

  it('opens channel icon picker from bubble click', () => {
    render(<PersonaDetailPanel persona={detail} />)
    fireEvent.click(screen.getByRole('button', { name: 'Slack' }))
    expect(document.querySelector('.audion-channel-picker')).toBeTruthy()
    expect(screen.getByRole('menu', { name: 'Change channel' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Teams' })).toBeInTheDocument()
  })

  it('opens channel icon picker via context menu', () => {
    render(<PersonaDetailPanel persona={detail} />)
    fireEvent.contextMenu(screen.getByRole('button', { name: 'Slack' }))
    expect(document.querySelector('.audion-channel-picker')).toBeTruthy()
    expect(screen.getByRole('menuitem', { name: 'Figma' })).toBeInTheDocument()
  })

  it('opens add-channel picker from dashed add bubble', () => {
    const { container } = render(<PersonaDetailPanel persona={detail} />)
    fireEvent.click(container.querySelector('.audion-channel-bubble--add')!)
    expect(screen.getByRole('menu', { name: 'Add channel' })).toBeInTheDocument()
  })
})

describe('target group workspace components', () => {
  it('renders index with create CTA', () => {
    const { container } = render(<TargetGroupListPanel list={tgList} query="" />)
    expect(screen.getByText('Digital Product Leads')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Digital Product Leads/i })).toHaveAttribute(
      'href',
      paths.routes.targetGroupDetail('tg1'),
    )
    expect(screen.getByRole('button', { name: /New target group/i })).toBeEnabled()
    expect(container.querySelector('.audion-tg-card--create .audion-tg-card-panel')).toBeTruthy()
    expect(container.querySelector('.audion-tg-card-title')).toHaveTextContent('New target group')
    expect(container.querySelector('.audion-tg-card-meta')).toHaveTextContent(/Create a segment/)
  })

  it('renders linked personas as app cards and edit icon in topbar', () => {
    const { container } = render(<TargetGroupDetailPanel targetGroup={tgDetail} />)
    expect(screen.getByRole('button', { name: 'Edit target group' })).toBeEnabled()
    expect(container.querySelector('.audion-magazine-topbar .audion-edit-icon-btn')).toBeTruthy()
    expect(screen.getByRole('link', { name: /Alex Morgan/i })).toHaveAttribute(
      'href',
      paths.routes.personaDetail('p1'),
    )
    expect(container.querySelector('.audion-tg-grid--nested .audion-tg-card')).toBeTruthy()
    expect(container.querySelector('.audion-tg-card-title')).toHaveTextContent('Alex Morgan')
    expect(container.querySelector('.audion-tg-card-meta')).toHaveTextContent(/Product Lead/)
  })
})

const journeyList: JourneyList = {
  items: [
    {
      id: 'j1',
      name: 'Product discovery to roadmap',
      journeyType: 'awareness',
      status: 'active',
      phaseCount: 4,
      targetGroupId: 'tg1',
      targetGroupName: 'Digital Product Leads',
      projectId: null,
      updatedAt: null,
    },
  ],
  total: 1,
  page: 1,
  pageSize: 50,
}

const journeyDetail: JourneyDetail = {
  ...journeyList.items[0],
  description: 'From signal to commit.',
  phases: [
    {
      id: 'ph1',
      name: 'Signal intake',
      order: 0,
      summary: 'Collect research.',
      elements: [
        { id: 'e1', kind: 'action', label: 'Park notes', order: 0 },
        { id: 'e2', kind: 'thought', label: 'Evidence?', order: 1 },
      ],
    },
    {
      id: 'ph2',
      name: 'Frame the problem',
      order: 1,
      summary: 'Align on the decision.',
      elements: [{ id: 'e3', kind: 'action', label: 'Map personas', order: 0 }],
    },
  ],
}

describe('journey workspace components', () => {
  it('renders index with create CTA', () => {
    const { container } = render(<JourneyListPanel list={journeyList} query="" />)
    expect(screen.getByText('Product discovery to roadmap')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Product discovery to roadmap/i })).toHaveAttribute(
      'href',
      paths.routes.journeyDetail('j1'),
    )
    expect(screen.getByRole('button', { name: /New journey/i })).toBeEnabled()
    expect(container.querySelector('.audion-tg-card--create .audion-tg-card-panel')).toBeTruthy()
  })

  it('renders phase slider with create card, edit/delete icons, and target group link', () => {
    const { container } = render(<JourneyDetailPanel journey={journeyDetail} />)
    expect(screen.getByRole('button', { name: 'Edit journey' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Delete journey' })).toBeEnabled()
    expect(container.querySelector('.audion-magazine-topbar-actions')).toBeTruthy()
    expect(container.querySelector('.audion-magazine-hero--split')).toBeTruthy()
    expect(container.querySelector('.audion-magazine-hero-copy')).toBeTruthy()
    expect(container.querySelector('.audion-magazine-hero--split > .audion-magazine-facets')).toBeTruthy()
    expect(container.querySelector('.audion-journey-timeline-viewport')).toBeTruthy()
    expect(container.querySelectorAll('.audion-journey-slide')).toHaveLength(3)
    expect(container.querySelector('.audion-journey-slide--create')).toBeTruthy()
    expect(screen.getByRole('tab', { name: /Signal intake/i })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: /Frame the problem/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Add phase' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit phase Signal intake' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Delete phase Signal intake' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Add new phase' })).toBeEnabled()
    expect(screen.getByText('Park notes')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Previous phase' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next phase' })).toBeEnabled()
    expect(screen.getByText('1 / 2')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Digital Product Leads/i })).toHaveAttribute(
      'href',
      paths.routes.targetGroupDetail('tg1'),
    )
  })

  it('opens journey delete confirm from topbar', () => {
    const { container } = render(<JourneyDetailPanel journey={journeyDetail} />)
    fireEvent.click(screen.getByRole('button', { name: 'Delete journey' }))
    expect(container.querySelector('.ds-dialog-title')?.textContent).toBe('Delete journey?')
  })

  it('opens phase delete confirm from slide delete icon', () => {
    const { container } = render(<JourneyDetailPanel journey={journeyDetail} />)
    fireEvent.click(screen.getByRole('button', { name: 'Delete phase Signal intake' }))
    expect(container.querySelector('.ds-dialog-title')?.textContent).toBe('Delete phase?')
  })

  it('opens phase edit dialog from slide edit icon', () => {
    const { container } = render(<JourneyDetailPanel journey={journeyDetail} />)
    fireEvent.click(screen.getByRole('button', { name: 'Edit phase Signal intake' }))
    expect(container.querySelector('.audion-edit-dialog')).toBeTruthy()
    expect(container.querySelector('.ds-dialog-title')?.textContent).toBe('Edit phase')
    expect(screen.getByDisplayValue('Signal intake')).toBeInTheDocument()
  })

  it('opens new phase dialog from create card', () => {
    const { container } = render(<JourneyDetailPanel journey={journeyDetail} />)
    fireEvent.click(screen.getByRole('button', { name: 'Add new phase' }))
    expect(container.querySelector('.audion-edit-dialog')).toBeTruthy()
    expect(container.querySelector('.ds-dialog-title')?.textContent).toBe('New phase')
  })
})
