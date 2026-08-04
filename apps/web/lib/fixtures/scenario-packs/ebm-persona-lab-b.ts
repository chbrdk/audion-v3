/**
 * Persona Lab — dual-persona pack for Lab B Aufgabe 1 (Alex impatient + Sam patient).
 * Default wave enables H5/L4 segment+tempo contrast without manual PATCH.
 * Correlate Alex with `persona-lab-correlate.ts`; Sam contrast via L4 / Soft-Q.
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

/** Hypotheses most relevant to this micro-lab (H1/H2 matrix + H5 segment contrast). */
const LAB_HYPOTHESES = EBM_HYPOTHESES.filter(
  (h) => h.id === 'H1' || h.id === 'H2' || h.id === 'H5',
)

const SHARED_TASK_CORE = [
  'Du hast ein eBike mit Bosch Performance Line und willst kompatible Displays wissen.',
  'Nutze das Produktkombinationen-Tool. Denke laut auf Deutsch.',
  'Beantworte F3.1–F3.4. Nenne Displays oder dass du keine sichere Antwort gefunden hast.',
  'Erfolg für dich = ehrliche UX-Aussage, nicht maximale Seiten-Exploration.',
]

export const EBM_PERSONA_LAB_B_PACK: UxScenarioPack = {
  id: paths.personaLabPackId,
  name: 'Persona Lab · B Aufgabe 1 (Alex + Sam)',
  description:
    'Fast iteration unit: dual-persona B-wave (impatient Alex + patient Sam), maxSteps 15. Alex correlates via persona-lab-correlate; Sam enables L4/H5 tempo contrast without PATCH. See knowledge/persona-iteration-lab-2026-08-03.md.',
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
        ...SHARED_TASK_CORE.slice(0, 2),
        'Wenn Optionen ausgeblendet/grau sind und du nicht verstehst warum: benenne das sofort.',
        'Probiere kurz (scroll/klick/Filter prüfen) — wie ein kämpfendes Drittel — bevor du ehrlich abbrichst; kein Endlos-Weiterprobieren.',
        ...SHARED_TASK_CORE.slice(2),
      ].join(' '),
    },
    {
      runKey: 'B-aufgabe1-nachruesten-patient',
      leitfadenBlock: 'Lab · Aufgabe 1 · patient persona',
      personaId: paths.personaLabPatientPersonaId,
      personaName: 'Sam Lab Geduldig',
      segment: 'owner_upgrade',
      urlKey: 'bosch.ebike.produktkombinationen',
      maxSteps: 15,
      task: [
        'Lab-Persona: Du bist geduldig (time_pressure niedrig) — nimm dir Zeit, prüfe Filter und Hinweise.',
        ...SHARED_TASK_CORE.slice(0, 2),
        'Wenn Optionen ausgeblendet/grau sind: benenne das und untersuche kurz, ob eine Erklärung sichtbar ist, bevor du ggf. abbrichst.',
        ...SHARED_TASK_CORE.slice(2),
      ].join(' '),
    },
  ],
}
