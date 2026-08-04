/**
 * Persona Lab micro — Purchase-intent Aufgabe 1 (H5 segment contrast).
 * Separate from Lab B owner matrix. Cap maxSteps for fast iteration.
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

const PURCHASE_HYPOTHESES = EBM_HYPOTHESES.filter((h) => h.id === 'H5' || h.id === 'H1')

export const EBM_PERSONA_LAB_PURCHASE_PACK: UxScenarioPack = {
  id: paths.personaLabPurchasePackId,
  name: 'Kaufinteressent: passende Displays finden',
  description:
    'Kaufinteressent (H5): Aufgabe 1 im purchase-intent-Segment (Sam). Soft-Q / Segment-Kontrast zur Owner-Filter-Matrix — nicht in die Matrix-Welle mischen. Siehe knowledge/persona-lab-micro-labs-2026-08-04.md.',
  sourceGuide: 'EBM-Testleitfaden Produktkombinationen-Tool v1.3 — Purchase slice',
  targetUrlKey: 'bosch.ebike.produktkombinationen',
  projectId: 'proj-audion-core',
  hypothesisTemplates: PURCHASE_HYPOTHESES.map((h) => ({ ...h })),
  softScoreKeys: SOFT_KEYS,
  fFragenPrompts: [
    'F3.1 Wie einfach/schwer war die Antwort zu finden?',
    'F3.4 Hast du das Gefühl, deine Frage beantwortet bekommen zu haben – was fehlte?',
  ],
  defaultWaveKey: 'persona-lab-purchase',
  runs: [
    {
      runKey: 'B-aufgabe1-purchase-intent',
      leitfadenBlock: 'Kaufinteressent · Aufgabe 1 · passende Displays',
      personaId: paths.personaLabPatientPersonaId,
      personaName: 'Sam Lab Geduldig',
      segment: 'purchase_intent',
      urlKey: 'bosch.ebike.produktkombinationen',
      maxSteps: 15,
      task: [
        'Kaufinteressenten-Perspektive (H5): Du planst einen eBike-Kauf und willst wissen,',
        'welche Displays zu einem Bosch Performance Line Motor passen.',
        'Nutze das Produktkombinationen-Tool. Denke laut auf Deutsch.',
        'Bewerte Nutzen/Reibung für dein Segment; benenne Verwirrung ehrlich.',
        'Beantworte F3.1 und F3.4. Erfolg = ehrliche Segment-Aussage, nicht Maximalexploration.',
      ].join(' '),
    },
  ],
}
