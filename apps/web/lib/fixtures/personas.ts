import type {
  PersonaDetail,
  PersonaFrustration,
  PersonaGoal,
  PersonaList,
} from '@audion-v3/contracts'
import { personaAvatarPath, personaVisualPath } from '../paths'

function goalsFromLabels(labels: string[]): PersonaGoal[] {
  return labels.map((label, priority) => ({ label, priority }))
}

function frustrationsFromLabels(labels: string[]): PersonaFrustration[] {
  return labels.map((label) => ({ label, evidenceCount: 0 }))
}

const EMPTY_PROFILE = {
  gender: null as string | null,
  attentionSpan: null as string | null,
  colorPalette: [] as string[],
  mediaAffinity: null as number | null,
  confidence: null as number | null,
  techLiteracy: null as number | null,
  emotionalBaseline: null as string | null,
  stressTriggers: [] as string[],
  motivations: [] as PersonaDetail['motivations'],
  traits: {} as Record<string, number>,
  interests: [] as string[],
  values: [] as string[],
  socialMediaUsage: [] as string[],
  communicationStyle: null as PersonaDetail['communicationStyle'],
  visuals: null as PersonaDetail['visuals'],
  profileDe: null as PersonaDetail['profileDe'],
  headlineDe: null as string | null,
  journeyBehavior: null as PersonaDetail['journeyBehavior'],
  knowledgeEntries: [] as PersonaDetail['knowledgeEntries'],
  documents: [] as PersonaDetail['documents'],
}

/** Local demo personas for AUDION v3 when no API is available. */
export const DEMO_PERSONAS: PersonaDetail[] = [
  {
    id: 'persona-alex-morgan',
    name: 'Alex Morgan',
    role: 'Product Lead',
    projectId: 'proj-audion-core',
    status: 'ready',
    archetype: 'Builder',
    updatedAt: '2026-07-28T10:00:00.000Z',
    avatarUrl: personaAvatarPath('persona-alex-morgan'),
    age: '35–44',
    location: 'Berlin',
    bio: 'Outcome-driven product lead for digital service platforms. Balances roadmap clarity with research evidence, and keeps discovery tied to shipping decisions instead of slide decks. Expects personas to stay alive across research, design, and delivery — not as one-off workshop artifacts.',
    gender: null,
    attentionSpan: 'Focused bursts; prefers short decision loops',
    colorPalette: ['#1f2a24', '#c4b59a', '#6b8f71'],
    mediaAffinity: 0.62,
    confidence: 0.78,
    techLiteracy: 0.82,
    emotionalBaseline: 'cautious-optimistic',
    stressTriggers: [
      'Buzzword-heavy pages without evidence',
      'Cookie walls and newsletter gates',
      'Undated research decks',
    ],
    motivations: [
      { label: 'Ship decisions that stay traceable to evidence', type: 'intrinsic' },
      { label: 'Reduce handoff friction across research and delivery', type: 'extrinsic' },
    ],
    traits: {
      Analytical: 0.82,
      Pragmatic: 0.76,
      Collaborative: 0.71,
      Decisive: 0.68,
      Empathetic: 0.54,
    },
    interests: [
      'Service design systems',
      'Evidence-based roadmapping',
      'Product ops rituals',
      'Research synthesis tooling',
      'Urban cycling',
    ],
    values: [
      'Clarity over theatre',
      'Shared ownership of insight',
      'Traceable decisions',
      'Reuse before rebuild',
    ],
    socialMediaUsage: ['LinkedIn', 'Newsletter', 'Industry Slack'],
    communicationStyle: {
      vocabulary: [
        'evidence trail',
        'decision loop',
        'handoff friction',
        'confidence level',
        'working brief',
        'open question',
      ],
      sentenceStructure: 'Short, concrete sentences; leads with the decision at stake.',
      skepticismLevel: 0.55,
    },
    goals: goalsFromLabels([
      'Ship clearer persona workflows that research and delivery can both own without duplicate tooling.',
      'Reduce handoff friction between insight synthesis and sprint planning so decisions stay traceable.',
      'Ground roadmap calls in evidence: confidence levels, open questions, and named sources.',
      'Keep persona profiles readable under time pressure — scannable meta, expandable depth.',
      'Make reuse the default: one persona brief should feed briefing, journey, and channel work.',
    ]),
    frustrations: [
      {
        label:
          'Scattered research notes across Miro, Notion, and Slack threads that never land in the persona record.',
        evidenceCount: 4,
      },
      {
        label:
          'Slow approval loops when stakeholders treat personas as branding documents instead of working tools.',
        evidenceCount: 3,
      },
      {
        label: 'Tool switching between discovery and delivery that breaks context mid-decision.',
        evidenceCount: 2,
      },
      {
        label: 'Profiles that look complete but lack the operational detail teams need in the moment.',
        evidenceCount: 2,
      },
    ],
    channels: ['Slack', 'Figma', 'Notion', 'Email', 'Weekly product review'],
    sections: [
      {
        title: 'Mindset',
        body: 'Prefers short decision loops and visible ownership. Will trade perfect synthesis for a shared, dated view of what the team believes today — and what still needs proof.',
      },
      {
        title: 'Context',
        body: 'Works across research, design, and engineering stakeholders. Spends most of the week bridging qualitative insight with delivery constraints, often under incomplete data.',
      },
      {
        title: 'Working with this persona',
        body: 'Lead with the decision at stake, then the evidence. Avoid long decks; bring the persona brief, open questions, and a clear ask. Update the profile after every meaningful research cycle.',
      },
    ],
    visuals: {
      styleKeywords: ['calm editorial', 'warm neutrals', 'product UI'],
      tiles: [
        {
          id: 'alex-portrait',
          imageUrl: personaAvatarPath('persona-alex-morgan'),
          category: 'portrait',
          caption: 'Portrait',
        },
        {
          id: 'alex-tone',
          imageUrl: personaVisualPath('tone-warm'),
          category: 'tone',
          caption: 'Tone',
        },
        {
          id: 'alex-material',
          imageUrl: personaVisualPath('material-soft'),
          category: 'material',
          caption: 'Material',
        },
        {
          id: 'alex-ui',
          imageUrl: personaVisualPath('ui-calm'),
          category: 'ui',
          caption: 'Interface',
        },
        {
          id: 'alex-space',
          imageUrl: personaVisualPath('space-studio'),
          category: 'space',
          caption: 'Space',
        },
        {
          id: 'alex-accent',
          imageUrl: personaVisualPath('accent-green'),
          category: 'accent',
          caption: 'Accent',
        },
      ],
    },
    headlineDe: 'Product Lead · Evidenz vor Folien',
    profileDe: {
      headline: 'Product Lead · Evidenz vor Folien',
      bio: 'Ergebnisorientierte Product Lead für digitale Service-Plattformen. Verbindet Roadmap-Klarheit mit Forschungsevidenz und hält Discovery an Lieferentscheidungen gekoppelt.',
      interests: ['Service-Design-Systeme', 'Evidenzbasiertes Roadmapping', 'Product Ops'],
      values: ['Klarheit statt Theater', 'Geteiltes Insight-Ownership', 'Nachvollziehbare Entscheidungen'],
    },
    journeyBehavior: {
      dimensionOverrides: {
        riskAversion: 0.72,
        timePressure: 0.62,
        exploration: 0.45,
        detailOrientation: 0.88,
        trustSkepticism: 0.78,
        accessibilityNeed: 0.4,
      },
      dos: [
        'Prefer official navigation and documentation over ads or promo tiles',
        'Look for specs, confidence levels, and named evidence before committing',
      ],
      donts: [
        'Do not accept marketing cookies or newsletter walls as progress',
        'Avoid buzzword-heavy hero sections that lack operational detail',
      ],
      heuristics: [
        'Prefer dated working briefs over polished decks',
        'Ask for the decision, evidence, and open questions before committing',
      ],
      extraInstructions:
        'Under time pressure, scan for decision-ready briefs. Trade perfect synthesis for dated, shared evidence trails.',
    },
    knowledgeEntries: [
      {
        id: 'alex-know-ops',
        title: 'Operational notes',
        content:
          '<p>Prefers dated working briefs over polished decks. Ask for the decision, evidence, and open questions.</p>',
        updatedAt: '2026-07-28T10:00:00.000Z',
      },
    ],
    documents: [
      {
        id: 'alex-doc-interview',
        name: 'alex-interview-notes.md',
        status: 'ready',
        mimeType: 'text/markdown',
        updatedAt: '2026-07-27T11:00:00.000Z',
      },
    ],
  },
  {
    id: 'persona-samira-khan',
    name: 'Samira Khan',
    role: 'UX Researcher',
    projectId: 'proj-audion-core',
    status: 'ready',
    archetype: 'Explorer',
    updatedAt: '2026-07-27T14:30:00.000Z',
    avatarUrl: personaAvatarPath('persona-samira-khan'),
    age: '28–34',
    location: 'Amsterdam',
    bio: 'Qualitative researcher who turns interviews into actionable product constraints and opportunity maps.',
    ...EMPTY_PROFILE,
    goals: goalsFromLabels(['Keep findings reusable', 'Connect insights to personas', 'Improve synthesis speed']),
    frustrations: frustrationsFromLabels([
      'Insights locked in decks',
      'Weak traceability to decisions',
      'Repeated stakeholder briefings',
    ]),
    channels: ['Miro', 'Zoom', 'Notion'],
    sections: [
      { title: 'Working style', body: 'Synthesizes patterns early and stresses confidence levels.' },
    ],
  },
  {
    id: 'persona-jonas-richter',
    name: 'Jonas Richter',
    role: 'Brand Strategist',
    projectId: 'proj-brand-lab',
    status: 'draft',
    archetype: 'Narrator',
    updatedAt: '2026-07-26T09:15:00.000Z',
    avatarUrl: personaAvatarPath('persona-jonas-richter'),
    age: '40–49',
    location: 'Munich',
    bio: 'Shapes brand narratives for industrial and mobility clients. Still drafting channel preferences.',
    ...EMPTY_PROFILE,
    goals: goalsFromLabels(['Align persona voice with brand system', 'Prototype messaging variants faster']),
    frustrations: frustrationsFromLabels(['Inconsistent tone across teams']),
    channels: ['Email', 'Teams'],
    sections: [],
  },
  {
    id: 'persona-lena-vogel',
    name: 'Lena Vogel',
    role: 'Service Designer',
    projectId: 'proj-journey-ops',
    status: 'draft',
    archetype: 'Connector',
    updatedAt: '2026-07-25T16:45:00.000Z',
    avatarUrl: personaAvatarPath('persona-lena-vogel'),
    age: '30–39',
    location: 'Hamburg',
    bio: 'Maps end-to-end journeys and looks for operational bottlenecks between digital and physical touchpoints.',
    ...EMPTY_PROFILE,
    goals: goalsFromLabels(['Link personas to journey stages', 'Surface pain points with owners']),
    frustrations: frustrationsFromLabels(['Personas too abstract for ops', 'Missing channel coverage']),
    channels: ['FigJam', 'Slack'],
    sections: [
      { title: 'Focus', body: 'Care moments and service recovery paths.' },
    ],
  },
  {
    id: 'persona-marco-bianchi',
    name: 'Marco Bianchi',
    role: 'Growth Marketer',
    projectId: null,
    status: 'archived',
    archetype: 'Optimizer',
    updatedAt: '2026-06-12T11:00:00.000Z',
    avatarUrl: personaAvatarPath('persona-marco-bianchi'),
    age: '32–38',
    location: 'Milan',
    bio: 'Archived reference persona from an earlier campaign experiment.',
    ...EMPTY_PROFILE,
    goals: goalsFromLabels(['Increase qualified traffic']),
    frustrations: frustrationsFromLabels(['Attribution gaps']),
    channels: ['LinkedIn', 'Newsletter'],
    sections: [],
  },
]

const DETAIL_ONLY_KEYS = new Set([
  'age',
  'location',
  'bio',
  'gender',
  'attentionSpan',
  'colorPalette',
  'mediaAffinity',
  'confidence',
  'techLiteracy',
  'emotionalBaseline',
  'stressTriggers',
  'motivations',
  'traits',
  'interests',
  'values',
  'socialMediaUsage',
  'communicationStyle',
  'goals',
  'frustrations',
  'channels',
  'sections',
  'visuals',
  'profileDe',
  'headlineDe',
  'knowledgeEntries',
  'documents',
])

export function demoPersonaList(): PersonaList {
  return {
    items: DEMO_PERSONAS.map((persona) => {
      const summary = { ...persona }
      for (const key of DETAIL_ONLY_KEYS) {
        delete (summary as Record<string, unknown>)[key]
      }
      return summary
    }),
    total: DEMO_PERSONAS.length,
    page: 1,
    pageSize: 50,
  }
}

export function demoPersonaDetail(personaId: string): PersonaDetail | null {
  return DEMO_PERSONAS.find((persona) => persona.id === personaId) ?? null
}
