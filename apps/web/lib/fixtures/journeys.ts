import type { JourneyDetail } from '@audion-v3/contracts'

/** Local demo journeys — knowledge/journey-migration-map.md */
export const DEMO_JOURNEYS: JourneyDetail[] = [
  {
    id: 'journey-product-discovery',
    name: 'Product discovery to roadmap',
    journeyType: 'awareness',
    status: 'active',
    phaseCount: 4,
    targetGroupId: 'tg-digital-product-leads',
    targetGroupName: 'Digital Product Leads',
    projectId: 'proj-audion-core',
    updatedAt: '2026-07-28T14:00:00.000Z',
    description:
      'How product leads move from fuzzy research signals to a confident roadmap commitment — and where handoffs stall.',
    phases: [
      {
        id: 'phase-signal',
        name: 'Signal intake',
        order: 0,
        summary: 'Collect research snippets and stakeholder hunches into one place.',
        elements: [
          { id: 'el-1', kind: 'action', label: 'Park research notes in AUDION', order: 0 },
          { id: 'el-2', kind: 'thought', label: 'Is this evidence or opinion?', order: 1 },
          { id: 'el-3', kind: 'feeling', label: 'Cautious optimism', order: 2 },
        ],
      },
      {
        id: 'phase-frame',
        name: 'Frame the problem',
        order: 1,
        summary: 'Align on persona fit and the decision the journey should unlock.',
        elements: [
          { id: 'el-4', kind: 'action', label: 'Map against linked personas', order: 0 },
          { id: 'el-5', kind: 'pain', label: 'Conflicting stakeholder frames', order: 1 },
          { id: 'el-6', kind: 'opportunity', label: 'Shared problem statement', order: 2 },
        ],
      },
      {
        id: 'phase-options',
        name: 'Option shaping',
        order: 2,
        summary: 'Sketch 2–3 delivery bets with clear success signals.',
        elements: [
          { id: 'el-7', kind: 'action', label: 'Draft bets with owners', order: 0 },
          { id: 'el-8', kind: 'thought', label: 'What can we learn in two sprints?', order: 1 },
        ],
      },
      {
        id: 'phase-commit',
        name: 'Roadmap commit',
        order: 3,
        summary: 'Lock a thin slice into the roadmap with a review cadence.',
        elements: [
          { id: 'el-9', kind: 'action', label: 'Book commit review', order: 0 },
          { id: 'el-10', kind: 'feeling', label: 'Clear next step', order: 1 },
          { id: 'el-11', kind: 'pain', label: 'Scope creep after approval', order: 2 },
        ],
      },
    ],
  },
  {
    id: 'journey-brand-narrative',
    name: 'Brand narrative alignment',
    journeyType: 'purchase',
    status: 'active',
    phaseCount: 3,
    targetGroupId: 'tg-brand-narrative',
    targetGroupName: 'Brand Narrative Owners',
    projectId: 'proj-brand-lab',
    updatedAt: '2026-07-27T10:00:00.000Z',
    description: 'From brand system cues to persona voice that agencies can brief against.',
    phases: [
      {
        id: 'phase-audit',
        name: 'Voice audit',
        order: 0,
        summary: 'Inventory existing brand and persona language.',
        elements: [
          { id: 'el-b1', kind: 'action', label: 'Pull brand tokens + persona notes', order: 0 },
          { id: 'el-b2', kind: 'thought', label: 'Where does voice diverge?', order: 1 },
        ],
      },
      {
        id: 'phase-bridge',
        name: 'Bridge brief',
        order: 1,
        summary: 'Write the bridge rules between brand and persona.',
        elements: [
          { id: 'el-b3', kind: 'action', label: 'Draft bridge principles', order: 0 },
          { id: 'el-b4', kind: 'opportunity', label: 'Reusable briefing block', order: 1 },
        ],
      },
      {
        id: 'phase-ship',
        name: 'Agency handoff',
        order: 2,
        summary: 'Ship a living brief instead of a static PDF.',
        elements: [
          { id: 'el-b5', kind: 'action', label: 'Publish persona magazine link', order: 0 },
          { id: 'el-b6', kind: 'feeling', label: 'Shared ownership', order: 1 },
        ],
      },
    ],
  },
  {
    id: 'journey-care-recovery',
    name: 'Care recovery path',
    journeyType: 'ux_audit',
    status: 'draft',
    phaseCount: 3,
    targetGroupId: 'tg-service-ops',
    targetGroupName: 'Service Operations',
    projectId: 'proj-journey-ops',
    updatedAt: '2026-07-25T18:00:00.000Z',
    description: 'Digital–physical recovery after a service break — draft for validation.',
    phases: [
      {
        id: 'phase-break',
        name: 'Break detected',
        order: 0,
        summary: 'Customer or agent flags a failed handoff.',
        elements: [
          { id: 'el-c1', kind: 'pain', label: 'No single owner for recovery', order: 0 },
          { id: 'el-c2', kind: 'feeling', label: 'Frustration', order: 1 },
        ],
      },
      {
        id: 'phase-triage',
        name: 'Triage',
        order: 1,
        summary: 'Route to the right recovery lane.',
        elements: [
          { id: 'el-c3', kind: 'action', label: 'Open care case', order: 0 },
          { id: 'el-c4', kind: 'thought', label: 'Is this systemic or one-off?', order: 1 },
        ],
      },
      {
        id: 'phase-close',
        name: 'Close the loop',
        order: 2,
        summary: 'Confirm resolution and capture learning.',
        elements: [
          { id: 'el-c5', kind: 'action', label: 'Confirm with customer', order: 0 },
          { id: 'el-c6', kind: 'opportunity', label: 'Feed insight into journey map', order: 1 },
        ],
      },
    ],
  },
]
