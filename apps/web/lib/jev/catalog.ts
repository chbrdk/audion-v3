import { choiceQuestion, type JevQuestions } from '@/lib/jev/types'

/** Audion Jev use-case ids — specs/domain/jev-decisions.md · suite SSOT plexon catalog */
export const JEV_USE_CASES = {
  audionFrictionSeverity: 'audion.friction_severity',
  audionInsightTriage: 'audion.insight_triage',
} as const

export type JevUseCaseId = (typeof JEV_USE_CASES)[keyof typeof JEV_USE_CASES]

export const FRICTION_SEVERITY_OPTIONS = ['high', 'medium', 'low'] as const
export const INSIGHT_TRIAGE_OPTIONS = ['act_now', 'watch', 'noise'] as const

export function questionsFrictionSeverity(): JevQuestions {
  return {
    severity: choiceQuestion(
      'How severe is this journey friction for the persona?',
      FRICTION_SEVERITY_OPTIONS,
      {
        high: 'Blocks or strongly derails the journey',
        medium: 'Noticeable friction but recoverable',
        low: 'Minor annoyance or soft signal',
      },
    ),
  }
}

export function questionsInsightTriage(): JevQuestions {
  return {
    triage: choiceQuestion(
      'How should this UX finding be triaged?',
      INSIGHT_TRIAGE_OPTIONS,
      {
        act_now: 'Actionable now — prioritize fix or follow-up',
        watch: 'Worth monitoring; not urgent',
        noise: 'Low signal / discard as noise',
      },
    ),
  }
}
