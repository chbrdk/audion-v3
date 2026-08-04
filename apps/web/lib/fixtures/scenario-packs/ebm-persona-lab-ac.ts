/**
 * Persona Lab micro — A (Erstkontakt) + C (Aufgabe 2 Kombination).
 * Separate from Lab B. Capped steps for runnable stubs / local unit coverage.
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

/** A+C slice — keep H1/H2 for matrix + exploration framing. */
const AC_HYPOTHESES = EBM_HYPOTHESES.filter((h) => h.id === 'H1' || h.id === 'H2')

export const EBM_PERSONA_LAB_AC_PACK: UxScenarioPack = {
  id: paths.personaLabAcPackId,
  name: 'Persona Lab · A+C (Erstkontakt + Kombination)',
  description:
    'Micro-lab: Erstkontakt (A) + Kombination Aufgabe 2 (C), capped maxSteps. Not part of Lab B matrix wave. See knowledge/persona-lab-micro-labs-2026-08-04.md.',
  sourceGuide: 'EBM-Testleitfaden Produktkombinationen-Tool v1.3 — A+C slice',
  targetUrlKey: 'bosch.ebike.produktkombinationen',
  projectId: 'proj-audion-core',
  hypothesisTemplates: AC_HYPOTHESES.map((h) => ({ ...h })),
  softScoreKeys: SOFT_KEYS,
  fFragenPrompts: [
    'F2.1 Was ist der Zweck dieser Seite?',
    'F2.2 Was fällt dir als Erstes auf?',
    'F3.5 Konntest du die Kombination zusammenstellen?',
    'F3.6 Hat das Tool erklärt, warum bestimmte Produkte nicht auswählbar waren?',
  ],
  defaultWaveKey: 'persona-lab-ac',
  runs: [
    {
      runKey: 'A-erstkontakt',
      leitfadenBlock: 'Lab · A · Erstkontakt',
      personaId: paths.personaLabImpatientPersonaId,
      personaName: 'Alex Lab Ungeduldig',
      segment: 'owner_upgrade',
      urlKey: 'bosch.ebike.produktkombinationen',
      maxSteps: 8,
      task: [
        'Du öffnest zum ersten Mal die Bosch Produktkombinationen-Seite.',
        'Nimm dir kurz Zeit: schau dich um, scrolle, aber ändere keine Filterauswahl.',
        'Denke laut (Deutsch): (F2.1) Zweck? (F2.2) Was fällt als Erstes auf?',
        'Beschreibe Verwirrung ehrlich. Kurze Zusammenfassung des ersten Eindrucks.',
      ].join(' '),
    },
    {
      runKey: 'C-aufgabe2-kombination',
      leitfadenBlock: 'Lab · C · Aufgabe 2',
      personaId: paths.personaLabPatientPersonaId,
      personaName: 'Sam Lab Geduldig',
      segment: 'purchase_intent',
      urlKey: 'bosch.ebike.produktkombinationen',
      maxSteps: 18,
      task: [
        'Aufgabe 2: Prüfe Kompatibilität Kiox 400C + Mini Remote + Cargo Line + leistungsfähiger Rahmenakku.',
        'Stelle die Kombination im Tool zusammen. Denke laut auf Deutsch.',
        'Beantworte F3.5–F3.6. Schliesse mit Kompatibilitätsurteil oder ehrlichem Abbruch.',
      ].join(' '),
    },
  ],
}
