import { choiceQuestion, type JevQuestions } from '@/lib/jev/types'

/** Audion Jev use-case ids — specs/domain/jev-decisions.md · suite SSOT plexon catalog */
export const JEV_USE_CASES = {
  audionFrictionSeverity: 'audion.friction_severity',
  audionInsightTriage: 'audion.insight_triage',
  audionPersonaChatModelTier: 'audion.persona_chat_model_tier',
} as const

export type JevUseCaseId = (typeof JEV_USE_CASES)[keyof typeof JEV_USE_CASES]

export const FRICTION_SEVERITY_OPTIONS = ['high', 'medium', 'low'] as const
export const INSIGHT_TRIAGE_OPTIONS = ['act_now', 'watch', 'noise'] as const
export const PERSONA_CHAT_MODEL_TIER_OPTIONS = ['low', 'mid', 'high'] as const

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

export function questionsPersonaChatModelTier(): JevQuestions {
  return {
    tier: choiceQuestion(
      'Which completion model tier should persona chat use for this user turn?',
      PERSONA_CHAT_MODEL_TIER_OPTIONS,
      {
        low: 'Casual greeting / small talk — cheaper / faster model',
        mid: 'Normal product or persona dialogue — default model',
        high: 'Deep research, elicitation, or multi-step reasoning — larger model',
      },
    ),
  }
}
