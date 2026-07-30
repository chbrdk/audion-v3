import type { ProjectDetail } from '@audion-v3/contracts'

export const DEMO_PROJECTS: ProjectDetail[] = [
  {
    id: 'proj-audion-core',
    name: 'AUDION Core',
    nameDe: 'AUDION Kern',
    description: 'Primary persona and journey workspace for the AUDION product line.',
    companyContext: null,
    knowledgeChapters: [
      {
        id: 'ch-company',
        title: 'Company',
        body: '<p>B2B research platform helping brand teams ground decisions in living persona magazines.</p>',
      },
      {
        id: 'ch-market',
        title: 'Market',
        body: '<p>Mid-market brand and insights teams who need shared audience truth across campaigns.</p>',
      },
      {
        id: 'ch-voice',
        title: 'Brand voice',
        body: '<p>Clear, editorial, confident — <em>magazine</em> not dashboard. Prefer prose over chrome.</p>',
      },
      {
        id: 'ch-constraints',
        title: 'Constraints',
        body: '<p>No glass admin chrome. Knowledge stays readable as source material for personas and target groups.</p><ul><li>Keep chapters scannable</li><li>WYSIWYG for long briefing text</li></ul>',
      },
    ],
    status: 'published',
    personaCount: 0,
    targetGroupCount: 0,
    memberCount: 2,
    updatedAt: '2026-07-28T10:00:00.000Z',
    members: [
      {
        id: 'mem-1',
        email: 'christoph@msqdx.example',
        role: 'owner',
        status: 'active',
      },
      {
        id: 'mem-2',
        email: 'design@msqdx.example',
        role: 'editor',
        status: 'active',
      },
    ],
  },
  {
    id: 'proj-brand-lab',
    name: 'Brand Lab',
    nameDe: null,
    description: 'Exploratory brand and channel experiments.',
    companyContext: null,
    knowledgeChapters: [
      {
        id: 'ch-lab-brief',
        title: 'Brief',
        body: '<p>Internal lab for testing magazine layouts and channel mixes.</p>',
      },
    ],
    status: 'published',
    personaCount: 0,
    targetGroupCount: 0,
    memberCount: 1,
    updatedAt: '2026-07-26T14:30:00.000Z',
    members: [
      {
        id: 'mem-3',
        email: 'christoph@msqdx.example',
        role: 'owner',
        status: 'active',
      },
    ],
  },
  {
    id: 'proj-journey-ops',
    name: 'Journey Ops',
    nameDe: null,
    description: 'Operational journeys and touchpoint validation.',
    companyContext: null,
    knowledgeChapters: [],
    status: 'draft',
    personaCount: 0,
    targetGroupCount: 0,
    memberCount: 1,
    updatedAt: '2026-07-20T09:15:00.000Z',
    members: [
      {
        id: 'mem-4',
        email: 'ops@msqdx.example',
        role: 'owner',
        status: 'active',
      },
    ],
  },
]
