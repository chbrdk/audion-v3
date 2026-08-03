/**
 * Persona Lab — single-run pack for fast iteration toward human EBM findings.
 * Only B-aufgabe1 + impatient Alex. Correlate with `persona-lab-correlate.ts`.
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

/** Hypotheses most relevant to this micro-lab (H1/H2 matrix confusion). */
const LAB_HYPOTHESES = EBM_HYPOTHESES.filter((h) => h.id === 'H1' || h.id === 'H2')

export const EBM_PERSONA_LAB_B_PACK: UxScenarioPack = {
  id: paths.personaLabPackId,
  name: 'Persona Lab · B Aufgabe 1 (impatient)',
  description:
    'Fast iteration unit: one B-run, maxSteps 15, impatient Alex. Correlate via persona-lab-correlate against human gold band (friction high, confusion named, no optimistic clean success). See knowledge/persona-iteration-lab-2026-08-03.md.',
  sourceGuide: 'EBM-Testleitfaden Produktkombinationen-Tool v1.3 — Lab slice Aufgabe 1',
  targetUrlKey: 'bosch.ebike.produktkombinationen',
  projectId: 'proj-audion-core',
  hypothesisTemplates: LAB_HYPOTHESES.map((h) => ({ ...h })),
  softScoreKeys: SOFT_KEYS,
  fFragenPrompts: [
    'F3.1 Wie einfach/schwer war die Antwort zu finden?',
    'F3.2 Hat sich das Tool wie erwartet verhalten – was hat überrascht?',
    'F3.3 Gab es einen Moment ohne klaren nächsten Schritt?',
    'F3.4 Hast du das Gefühl, deine Frage beantwortet bekommen zu haben – was fehlte?',
  ],
  defaultWaveKey: 'persona-lab-b',
  runs: [
    {
      runKey: 'B-aufgabe1-nachruesten',
      leitfadenBlock: 'Lab · Aufgabe 1 · impatient persona',
      personaId: paths.personaLabImpatientPersonaId,
      personaName: 'Alex Lab Ungeduldig',
      segment: 'owner_upgrade',
      urlKey: 'bosch.ebike.produktkombinationen',
      maxSteps: 15,
      task: [
        'Lab-Persona: Du bist ungeduldig (Patient niedrig, time_pressure hoch).',
        'Du hast ein eBike mit Bosch Performance Line und willst kompatible Displays wissen.',
        'Nutze das Produktkombinationen-Tool. Denke laut auf Deutsch.',
        'Wenn Optionen ausgeblendet/grau sind und du nicht verstehst warum: benenne das sofort und brich nach höchstens zwei solchen Momenten ab — kein langes Weiterprobieren.',
        'Beantworte F3.1–F3.4. Nenne Displays oder dass du keine sichere Antwort gefunden hast.',
        'Erfolg für dich = ehrliche UX-Aussage, nicht maximale Seiten-Exploration.',
      ].join(' '),
    },
  ],
}
