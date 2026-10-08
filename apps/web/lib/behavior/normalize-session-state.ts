import type {
  BehavioralEpisodicEntry,
  BehavioralSessionState,
  BehavioralStance,
} from '@audion-v3/contracts'

const STANCES: BehavioralStance[] = ['proceed', 'hesitate', 'abandon']

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.min(1, Math.max(0, n))
}

/** Parse persisted / wire session blobs safely. */
export function normalizeBehavioralSessionState(
  raw: unknown,
): BehavioralSessionState | null {
  if (!raw || typeof raw !== 'object') return null
  const rec = raw as Record<string, unknown>
  const surface =
    rec.surface === 'browse' || rec.surface === 'chat' || rec.surface === 'video'
      ? rec.surface
      : null
  const stance = STANCES.includes(rec.stance as BehavioralStance)
    ? (rec.stance as BehavioralStance)
    : null
  const policyId = typeof rec.policyId === 'string' ? rec.policyId : null
  if (!surface || !stance || !policyId) return null

  const episodic: BehavioralEpisodicEntry[] = Array.isArray(rec.episodic)
    ? rec.episodic
        .filter((e): e is Record<string, unknown> => !!e && typeof e === 'object')
        .map((e): BehavioralEpisodicEntry => {
          const kind: BehavioralEpisodicEntry['kind'] =
            e.kind === 'try' || e.kind === 'notice' || e.kind === 'topic' || e.kind === 'repair'
              ? e.kind
              : 'try'
          return {
            kind,
            key: typeof e.key === 'string' ? e.key : '',
            at: typeof e.at === 'number' && Number.isFinite(e.at) ? e.at : 0,
          }
        })
        .filter((e) => e.key)
    : []

  return {
    surface,
    frustrationLoad: clamp01(Number(rec.frustrationLoad)),
    clarity:
      typeof rec.clarity === 'number' && Number.isFinite(rec.clarity)
        ? Math.min(3, Math.max(0, Math.round(rec.clarity)))
        : 2,
    fatigue: clamp01(Number(rec.fatigue)),
    tryBudgetRemaining:
      typeof rec.tryBudgetRemaining === 'number' && Number.isFinite(rec.tryBudgetRemaining)
        ? Math.max(0, Math.round(rec.tryBudgetRemaining))
        : 0,
    lookBeforeActSatisfied: Boolean(rec.lookBeforeActSatisfied),
    stance,
    turnIndex:
      typeof rec.turnIndex === 'number' && Number.isFinite(rec.turnIndex)
        ? Math.max(0, Math.round(rec.turnIndex))
        : 0,
    episodic,
    policyId,
  }
}
