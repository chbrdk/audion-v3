'use client'

import { useCallback, useMemo, useState } from 'react'
import Link from 'next/link'
import type {
  BehavioralGoldObservation,
  BehavioralPolicyScoreboard,
} from '@audion-v3/contracts'
import { Button, Chip, EmptyState, Panel, Text } from '@msqdx/ui'
import { paths } from '../lib/paths'
import { useT } from '../lib/user-prefs'

type Props = {
  scoreboards: BehavioralPolicyScoreboard[]
  initialObservations?: BehavioralGoldObservation[]
}

export function BehavioralScoreboardPanel({
  scoreboards: initialBoards,
  initialObservations = [],
}: Props) {
  const t = useT()
  const [scoreboards, setScoreboards] = useState(initialBoards)
  const [observations, setObservations] = useState(initialObservations)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const byPolicy = useMemo(() => {
    const map = new Map<string, BehavioralGoldObservation[]>()
    for (const obs of observations) {
      const list = map.get(obs.policyId) ?? []
      list.push(obs)
      map.set(obs.policyId, list)
    }
    return map
  }, [observations])

  const refreshList = useCallback(async () => {
    const res = await fetch(paths.routes.apiBehavioralScoreboard)
    if (!res.ok) throw new Error(`Refresh failed (${res.status})`)
    const data = (await res.json()) as {
      scoreboards?: BehavioralPolicyScoreboard[]
      observations?: BehavioralGoldObservation[]
    }
    if (Array.isArray(data.scoreboards)) setScoreboards(data.scoreboards)
    if (Array.isArray(data.observations)) setObservations(data.observations)
  }, [])

  async function toggleExpand(policyId: string) {
    if (expanded === policyId) {
      setExpanded(null)
      return
    }
    setExpanded(policyId)
    setError(null)
    try {
      const res = await fetch(
        `${paths.routes.apiBehavioralScoreboard}?policyId=${encodeURIComponent(policyId)}`,
      )
      if (!res.ok) throw new Error(`Load failed (${res.status})`)
      const data = (await res.json()) as {
        observations?: BehavioralGoldObservation[]
        scoreboard?: BehavioralPolicyScoreboard | null
      }
      if (Array.isArray(data.observations)) {
        setObservations((prev) => {
          const others = prev.filter((o) => o.policyId !== policyId)
          return [...data.observations!, ...others]
        })
      }
      if (data.scoreboard) {
        setScoreboards((prev) => {
          const rest = prev.filter((b) => b.policyId !== policyId)
          return [data.scoreboard!, ...rest]
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('chatExtra.goldRefreshFailed'))
    }
  }

  async function markGold(obs: BehavioralGoldObservation, label: 'human_gold' | 'synthetic') {
    setBusyId(obs.id)
    setError(null)
    try {
      const res = await fetch(paths.routes.apiBehavioralScoreboard, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: obs.id, label }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(body?.error || `Mark failed (${res.status})`)
      }
      const data = (await res.json()) as {
        observation: BehavioralGoldObservation
        scoreboard?: BehavioralPolicyScoreboard | null
      }
      setObservations((prev) =>
        prev.map((o) => (o.id === data.observation.id ? data.observation : o)),
      )
      if (data.scoreboard) {
        setScoreboards((prev) => {
          const rest = prev.filter((b) => b.policyId !== data.scoreboard!.policyId)
          return [data.scoreboard!, ...rest]
        })
      } else {
        await refreshList()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('chatExtra.goldMarkFailed'))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="audion-index audion-tg-index">
      <div className="msqdx-flow-studies-actions" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <Link href={paths.routes.studies}>
          <Button type="button" size="sm" variant="subtle">
            Studies
          </Button>
        </Link>
        <Link href={paths.routes.studiesFlows}>
          <Button type="button" size="sm" variant="subtle">
            Flows
          </Button>
        </Link>
      </div>

      <Text role="headline" as="h1" className="audion-tg-card-title">
        {t('chatExtra.behavioralGoldTitle')}
      </Text>
      <p className="audion-tg-card-meta">{t('chatExtra.behavioralGoldLede')}</p>

      {error ? (
        <p className="audion-edit-error" role="alert">
          {error}
        </p>
      ) : null}

      {!scoreboards.length ? (
        <EmptyState>{t('chatExtra.behavioralGoldEmpty')}</EmptyState>
      ) : (
        <ul className="audion-tg-grid">
          {scoreboards.map((board) => {
            const open = expanded === board.policyId
            const rows = byPolicy.get(board.policyId) ?? []
            return (
              <li key={board.policyId}>
                <Panel as="div" variant="card" className="audion-tg-card-panel">
                  <div
                    style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}
                  >
                    <Chip size="sm">{board.closer ? 'closer' : 'not closer'}</Chip>
                    <Chip size="sm">score {board.score.toFixed(2)}</Chip>
                    <Chip size="sm">n={board.n}</Chip>
                    <Chip size="sm">
                      gold {board.humanGoldCount}/{board.n}
                    </Chip>
                  </div>
                  <Text role="headline" as="h2" className="audion-tg-card-title">
                    <code>{board.policyId}</code>
                  </Text>
                  <p className="audion-tg-card-meta">{board.verdict}</p>
                  <p className="audion-tg-card-meta">
                    frustr {board.means.frustrationLoad.toFixed(2)} · fatigue{' '}
                    {board.means.fatigue.toFixed(2)} · timeP {board.means.timePressure.toFixed(2)} ·
                    synth {board.syntheticCount} · gold {board.humanGoldCount}
                  </p>
                  <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.1rem' }}>
                    {board.checks.map((c) => (
                      <li key={c.id} className="audion-tg-card-meta">
                        {c.pass ? '✓' : '○'} {c.label}: {c.detail}
                      </li>
                    ))}
                  </ul>
                  <div style={{ marginTop: '0.75rem' }}>
                    <Button
                      type="button"
                      size="sm"
                      variant="subtle"
                      onClick={() => void toggleExpand(board.policyId)}
                    >
                      {open
                        ? t('chatExtra.goldHideObservations')
                        : t('chatExtra.goldShowObservations')}
                    </Button>
                  </div>
                  {open ? (
                    <ul className="audion-behavioral-obs-list" aria-label={t('chatExtra.goldObservations')}>
                      {!rows.length ? (
                        <li className="audion-tg-card-meta">{t('chatExtra.goldNoObservations')}</li>
                      ) : (
                        rows.map((obs) => (
                          <li key={obs.id} className="audion-behavioral-obs-row">
                            <div className="audion-tg-card-meta">
                              <Chip size="sm">{obs.label}</Chip>{' '}
                              <Chip size="sm">{obs.surface}</Chip> · turn {obs.metrics.turnIndex} ·
                              frustr {obs.metrics.frustrationLoad.toFixed(2)} ·{' '}
                              {obs.personaId}
                            </div>
                            {obs.label === 'synthetic' ? (
                              <Button
                                type="button"
                                size="sm"
                                disabled={busyId === obs.id}
                                onClick={() => void markGold(obs, 'human_gold')}
                              >
                                {busyId === obs.id
                                  ? t('common.saving')
                                  : t('chatExtra.goldMarkHuman')}
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                disabled={busyId === obs.id}
                                onClick={() => void markGold(obs, 'synthetic')}
                              >
                                {t('chatExtra.goldUnmarkHuman')}
                              </Button>
                            )}
                          </li>
                        ))
                      )}
                    </ul>
                  ) : null}
                </Panel>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
