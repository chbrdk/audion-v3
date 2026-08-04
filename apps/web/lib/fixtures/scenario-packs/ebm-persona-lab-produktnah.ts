/**
 * Persona Lab micro — Produktnahe Kurzantwort statt Matrix (H4 / Q5).
 * Separate from Filter-Matrix Lab B. Alex impatient, capped steps.
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

/** H4: produktnahe Antwort oft besser als volle Matrix. */
const PRODUKTNAH_HYPOTHESES = EBM_HYPOTHESES.filter((h) => h.id === 'H4')

export const EBM_PERSONA_LAB_PRODUKTNAH_PACK: UxScenarioPack = {
  id: paths.personaLabProduktnahPackId,
  name: 'Produktnahe Kurzantwort statt Matrix',
  description:
    'H4/Q5: ungeduldig (Alex) will schnelle Display-Antwort; laut denken, ob Produktseite/einfacher Hinweis besser wäre als volle Matrix — kein Endlos-Filterkampf. Siehe knowledge/persona-lab-micro-labs-2026-08-04.md.',
  sourceGuide: 'EBM-Testleitfaden Produktkombinationen-Tool v1.3 — H4 / Q5 slice',
  targetUrlKey: 'bosch.ebike.produktkombinationen',
  projectId: 'proj-audion-core',
  hypothesisTemplates: PRODUKTNAH_HYPOTHESES.map((h) => ({ ...h })),
  softScoreKeys: SOFT_KEYS,
  domainProfileId: 'ebm-produktkombinationen',
  archetype: 'comprehension',
  fFragenPrompts: [
    'F3.1 Wie einfach/schwer war die Antwort zu finden?',
    'F3.4 Hast du das Gefühl, deine Frage beantwortet bekommen zu haben – was fehlte?',
    'Q5: Reicht eher eine produktnahe Kurzantwort, oder brauchst du die volle Matrix?',
  ],
  defaultWaveKey: 'persona-lab-produktnah',
  runs: [
    {
      runKey: 'H4-produktnah-kurzantwort',
      leitfadenBlock: 'Produktnah · H4/Q5 · Kurzantwort vs Matrix',
      personaId: paths.personaLabImpatientPersonaId,
      personaName: 'Alex Lab Ungeduldig',
      segment: 'owner_upgrade',
      urlKey: 'bosch.ebike.produktkombinationen',
      maxSteps: 12,
      task: [
        'Lab-Persona: Du bist ungeduldig (time_pressure hoch).',
        'Du hast ein eBike mit Bosch Performance Line und willst schnell wissen, welche Displays passen.',
        'Starte im Produktkombinationen-Tool. Denke laut auf Deutsch.',
        'Ziel = eine kurze, sichere Display-Antwort — nicht maximale Filter-Exploration.',
        'Laut denken (Q5/H4): Wäre eine Produktseite oder ein einfacher Kompatibilitätshinweis besser als die volle Matrix?',
        'Kein Endlos-Filterkampf: nach kurzem Versuch ehrlich abbrechen, wenn keine sichere Antwort kommt.',
        'Beantworte F3.1 und F3.4; Schwerpunkt Soft-Q Q5 und Q1.',
      ].join(' '),
    },
  ],
}
