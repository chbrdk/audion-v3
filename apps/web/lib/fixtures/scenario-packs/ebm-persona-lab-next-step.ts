/**
 * Persona Lab micro — Nächster Schritt nach der Prüfung (F3.8 / F3.9).
 * H3-Richtung Next-Step; no new hypothesis id. Sam patient.
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

/** H3 framing: natural journey / Next Step after check (Leitfaden F3.8–F3.9). */
const NEXT_STEP_HYPOTHESES = EBM_HYPOTHESES.filter((h) => h.id === 'H3').map((h) => ({
  ...h,
  statement:
    'Nach der Kompatibilitätsprüfung fehlt ein klarer Next Step (Händler, Kauf, Support) — F3.8/F3.9',
}))

export const EBM_PERSONA_LAB_NEXT_STEP_PACK: UxScenarioPack = {
  id: paths.personaLabNextStepPackId,
  name: 'Nächster Schritt nach der Prüfung',
  description:
    'F3.8/F3.9: nach kurzer Kompatibilitätsprüfung (oder Abbruch) explizit Next Steps benennen (Händler, Kauf, Support) und ob die Seite das anbietet. Soft-Q Fokus Q1/Q6/Q7. Siehe knowledge/persona-lab-micro-labs-2026-08-04.md.',
  sourceGuide: 'EBM-Testleitfaden Produktkombinationen-Tool v1.3 — F3.8 / F3.9 Next Step',
  targetUrlKey: 'bosch.ebike.produktkombinationen',
  projectId: 'proj-audion-core',
  hypothesisTemplates: NEXT_STEP_HYPOTHESES,
  softScoreKeys: SOFT_KEYS,
  domainProfileId: 'ebm-produktkombinationen',
  archetype: 'outcome_next_step',
  fFragenPrompts: [
    'F3.8 Was wäre der sinnvolle nächste Schritt für dich (Händler, Kauf, Support)?',
    'F3.9 Bietet die Seite diesen Next Step klar an — oder fehlt er?',
    'F3.4 Hast du das Gefühl, deine Frage beantwortet bekommen zu haben – was fehlte?',
  ],
  defaultWaveKey: 'persona-lab-next-step',
  runs: [
    {
      runKey: 'F38-next-step-after-check',
      leitfadenBlock: 'Next Step · F3.8/F3.9 · nach Prüfung',
      personaId: paths.personaLabPatientPersonaId,
      personaName: 'Sam Lab Geduldig',
      segment: 'owner_upgrade',
      urlKey: 'bosch.ebike.produktkombinationen',
      maxSteps: 15,
      task: [
        'Lab-Persona: Du bist geduldig — prüfe kurz die Kompatibilität, aber bleib am Ziel.',
        'Du hast ein eBike mit Bosch Performance Line und willst passende Displays wissen.',
        'Nutze das Produktkombinationen-Tool kurz (Filter prüfen oder ehrlich abbrechen).',
        'Danach explizit laut denken (F3.8/F3.9): Was wäre dein nächster Schritt — Händler finden, kaufen, Support?',
        'Bietet die Seite diesen Next Step klar an, oder fehlt er / bricht die Journey ab?',
        'Beantworte F3.8 und F3.9. Soft-Q Schwerpunkt Q1, Q6, Q7.',
        'Erfolg = ehrliche Aussage zum Next Step, nicht Maximalexploration der Matrix.',
      ].join(' '),
    },
  ],
}
