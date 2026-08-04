/**
 * Persona Lab micro — Nav proof (H3): home → Produktkombinationen tool.
 * Separate from Lab B matrix. Correlate via persona-lab-nav-correlate.ts.
 */

import type { SoftScoreKey, UxScenarioPack } from '@audion-v3/contracts'
import { EBM_HYPOTHESES } from '../ux-studies'
import { paths } from '../../paths'

const SOFT_KEYS: SoftScoreKey[] = [
  'Q1_nuetzlichkeit',
  'Q2_bedienbarkeit',
  'Q3_filterlogik',
  'Q4_auffindbarkeit',
  'Q5_produktnah_vs_tool',
  'Q6_nutzungswahrscheinlichkeit',
  'Q7_gesamteindruck',
]

const NAV_HYPOTHESES = EBM_HYPOTHESES.filter((h) => h.id === 'H3')

export const EBM_PERSONA_LAB_NAV_PACK: UxScenarioPack = {
  id: paths.personaLabNavPackId,
  name: 'Persona Lab · Nav proof (H3)',
  description:
    'Micro-lab: start on Bosch home, find Produktkombinationen. Success = final URL/title match tool page (H3 / Q4). Do not mix with Lab B matrix wave. See knowledge/persona-lab-micro-labs-2026-08-04.md.',
  sourceGuide: 'EBM-Testleitfaden Produktkombinationen-Tool v1.3 — Nav slice (H3)',
  targetUrlKey: 'bosch.ebike.home',
  projectId: 'proj-audion-core',
  hypothesisTemplates: NAV_HYPOTHESES.map((h) => ({ ...h })),
  softScoreKeys: SOFT_KEYS,
  fFragenPrompts: [
    'F4.2 Wie leicht findest du den Einstieg zum Produktkombinationen-Tool?',
    'F4.4 Gab es einen natürlichen Next Step vom Produkt-/Service-Kontext zum Tool?',
  ],
  defaultWaveKey: 'persona-lab-nav',
  runs: [
    {
      runKey: 'Nav-home-to-tool',
      leitfadenBlock: 'Lab · Nav · H3',
      personaId: paths.personaLabImpatientPersonaId,
      personaName: 'Alex Lab Ungeduldig',
      segment: 'owner_upgrade',
      urlKey: 'bosch.ebike.home',
      maxSteps: 12,
      task: [
        'Starte auf der Bosch eBike Startseite (nicht direkt im Tool).',
        'Finde den Weg zum Produktkombinationen-Tool (Service/Produktkombinationen).',
        'Denke laut auf Deutsch: (F4.2) Einstieg? (F4.4) natürlicher Next Step?',
        'Erfolg = du landest auf der Produktkombinationen-Seite (URL/Titel passen).',
        'Beschreibe Umwege und Abbruchmomente ehrlich; bei starker Verwirrung benenne sie.',
      ].join(' '),
    },
  ],
}
