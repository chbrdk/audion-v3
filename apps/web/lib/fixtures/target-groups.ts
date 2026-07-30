import type { TargetGroupDetail } from '@audion-v3/contracts'
import { personaAvatarPath } from '../paths'

/** Local demo target groups — knowledge/target-group-migration-map.md */
export const DEMO_TARGET_GROUPS: TargetGroupDetail[] = [
  {
    id: 'tg-digital-product-leads',
    name: 'Digital Product Leads',
    segment: 'B2B SaaS · Decision makers',
    description:
      'Product and delivery leaders who own roadmap clarity and research-to-sprint handoffs. They need living personas, not workshop artifacts.',
    status: 'active',
    personaCount: 2,
    projectId: 'proj-audion-core',
    updatedAt: '2026-07-28T12:00:00.000Z',
    linkedPersonas: [
      {
        id: 'persona-alex-morgan',
        name: 'Alex Morgan',
        role: 'Product Lead',
        status: 'ready',
        avatarUrl: personaAvatarPath('persona-alex-morgan'),
      },
      {
        id: 'persona-samira-khan',
        name: 'Samira Khan',
        role: 'UX Researcher',
        status: 'ready',
        avatarUrl: personaAvatarPath('persona-samira-khan'),
      },
    ],
  },
  {
    id: 'tg-brand-narrative',
    name: 'Brand Narrative Owners',
    segment: 'Agency · Brand strategy',
    description: 'Strategists aligning persona voice with brand systems across industrial and mobility clients.',
    status: 'active',
    personaCount: 1,
    projectId: 'proj-brand-lab',
    updatedAt: '2026-07-26T09:00:00.000Z',
    linkedPersonas: [
      {
        id: 'persona-jonas-richter',
        name: 'Jonas Richter',
        role: 'Brand Strategist',
        status: 'draft',
        avatarUrl: personaAvatarPath('persona-jonas-richter'),
      },
    ],
  },
  {
    id: 'tg-service-ops',
    name: 'Service Operations',
    segment: 'Omnichannel · Care journeys',
    description: 'Designers and ops partners mapping digital–physical bottlenecks and recovery paths.',
    status: 'draft',
    personaCount: 1,
    projectId: 'proj-journey-ops',
    updatedAt: '2026-07-25T16:00:00.000Z',
    linkedPersonas: [
      {
        id: 'persona-lena-vogel',
        name: 'Lena Vogel',
        role: 'Service Designer',
        status: 'draft',
        avatarUrl: personaAvatarPath('persona-lena-vogel'),
      },
    ],
  },
]
