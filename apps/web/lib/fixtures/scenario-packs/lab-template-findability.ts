/**
 * Non-Bosch findability template — proves pack → study without product brand strings.
 * Uses IANA example.org → example.com via successCriteria.url_match.
 *
 * @see specs/domain/ux-lab-archetypes.md
 */

import type { SoftScoreCoreKey, UxScenarioPack } from '@audion-v3/contracts'
import { paths } from '../../paths'

const SOFT_KEYS: SoftScoreCoreKey[] = [
  'ease',
  'findability',
  'clarity',
  'usefulness',
  'likelihood',
  'overall',
]

export const LAB_TEMPLATE_FINDABILITY_PACK: UxScenarioPack = {
  id: paths.labTemplateFindabilityPackId,
  name: 'Template: Findability (non-Bosch)',
  description:
    'Domain-agnostic findability smoke: start on example.org, reach example.com without deeplink. Validates archetype + successCriteria plumbing — not a customer study.',
  sourceGuide: 'AUDION UX Lab Archetypes — findability template',
  targetUrlKey: paths.labTemplateFindabilityStartUrlKey,
  projectId: 'proj-audion-core',
  hypothesisTemplates: [
    {
      id: 'T1',
      statement: 'Users cannot find the destination page from the start URL without a deeplink',
    },
  ],
  softScoreKeys: SOFT_KEYS,
  domainProfileId: 'core',
  archetype: 'findability',
  successCriteria: { kind: 'url_match', pattern: 'example\\.com' },
  fFragenPrompts: [
    'How easy was it to find the destination from the start page?',
    'Did you need a direct link, or was navigation enough?',
  ],
  defaultWaveKey: 'lab-template-findability',
  runs: [
    {
      runKey: 'Template-findability-home-to-target',
      leitfadenBlock: 'Template · Findability',
      personaId: paths.personaLabImpatientPersonaId,
      personaName: 'Alex Lab Ungeduldig',
      segment: 'owner_upgrade',
      urlKey: paths.labTemplateFindabilityStartUrlKey,
      maxSteps: 8,
      archetype: 'findability',
      successCriteria: { kind: 'url_match', pattern: 'example\\.com' },
      task: [
        'Start on the example.org home page (not on example.com).',
        'Find your way to example.com using links on the page if present;',
        'if none exist, say so honestly and stop — do not invent a deeplink navigate to the target.',
        'Think aloud in English or German. Success = final URL contains example.com without a forbidden navigate shortcut.',
      ].join(' '),
    },
  ],
}
