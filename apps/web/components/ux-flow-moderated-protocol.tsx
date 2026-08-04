'use client'

/**
 * Moderated-only protocol checklist — walks a UX Test Flow without the journey agent.
 * @see specs/domain/ux-test-flow-model.md — Moderated-only protocol
 */

import { useCallback, useMemo, useState } from 'react'
import type { UxFlowNode, UxTestFlow } from '@audion-v3/contracts'
import { Alert, Button, Chip, Field, Input, Text, Textarea } from '@msqdx/ui'
import { outs, whenBranchPath } from '../lib/ux-test-flow-graph'
import { otherwiseBranchPath } from '../lib/ux-flow-replan'

export type ProtocolStepRecord = {
  nodeId: string
  status: 'done' | 'skipped'
  notes: string
  measureScore?: number | null
  gateChoice?: 'when' | 'otherwise' | null
}

/** Walk graph applying moderator gate choices (default: otherwise until chosen). */
export function buildProtocolPath(
  flow: UxTestFlow,
  gateChoices: Record<string, 'when' | 'otherwise'>,
): UxFlowNode[] {
  const nodes = flow.nodes ?? []
  const edges = flow.edges ?? []
  if (!nodes.length) return []
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const start = nodes.find((n) => n.kind === 'start')
  if (!start) return []
  const path: UxFlowNode[] = []
  let id: string | null = start.id
  const seen = new Set<string>()
  while (id && !seen.has(id)) {
    seen.add(id)
    const n = byId.get(id)
    if (!n) break
    path.push(n)
    if (n.kind === 'gate') {
      const choice = gateChoices[n.id]
      if (!choice) {
        // Stop at undecided gate — moderator must pick when/otherwise.
        break
      }
      const branch =
        choice === 'when' ? whenBranchPath(flow, n.id) : otherwiseBranchPath(flow, n.id)
      for (const b of branch) {
        if (seen.has(b.id)) continue
        seen.add(b.id)
        path.push(b)
        if (b.kind === 'gate' && !gateChoices[b.id]) {
          id = null
          break
        }
      }
      break
    }
    id = outs(edges, id, 'then')[0]?.to ?? null
  }
  return path
}

export function UxFlowModeratedProtocol({ flow }: { flow: UxTestFlow }) {
  const [gateChoices, setGateChoices] = useState<Record<string, 'when' | 'otherwise'>>({})
  const [cursor, setCursor] = useState(0)
  const [notesDraft, setNotesDraft] = useState('')
  const [measureDraft, setMeasureDraft] = useState('')
  const [records, setRecords] = useState<ProtocolStepRecord[]>([])
  const [finished, setFinished] = useState(false)

  const path = useMemo(() => buildProtocolPath(flow, gateChoices), [flow, gateChoices])
  const current = path[cursor] ?? null
  const hasGraph = Boolean(flow.nodes?.length)

  const advance = useCallback(
    (status: 'done' | 'skipped', gateChoice?: 'when' | 'otherwise') => {
      if (!current) return
      const scoreRaw = measureDraft.trim()
      const score =
        current.kind === 'measure' && scoreRaw
          ? Math.min(5, Math.max(1, Number(scoreRaw) || 0)) || null
          : null
      const nextGateChoices =
        current.kind === 'gate' && gateChoice
          ? { ...gateChoices, [current.id]: gateChoice }
          : gateChoices
      if (gateChoice && current.kind === 'gate') {
        setGateChoices(nextGateChoices)
      }
      setRecords((prev) => [
        ...prev.filter((r) => r.nodeId !== current.id),
        {
          nodeId: current.id,
          status,
          notes: notesDraft.trim(),
          measureScore: score,
          gateChoice: gateChoice ?? null,
        },
      ])
      setNotesDraft('')
      setMeasureDraft('')
      const nextPath = buildProtocolPath(flow, nextGateChoices)
      const idx = nextPath.findIndex((n) => n.id === current.id)
      const nextIdx = idx >= 0 ? idx + 1 : cursor + 1
      if (nextIdx >= nextPath.length) {
        setFinished(true)
        setCursor(Math.max(0, nextPath.length - 1))
      } else {
        setCursor(nextIdx)
      }
    },
    [current, cursor, flow, gateChoices, measureDraft, notesDraft],
  )

  const goBack = useCallback(() => {
    setFinished(false)
    setCursor((c) => Math.max(0, c - 1))
  }, [])

  const reset = useCallback(() => {
    setGateChoices({})
    setCursor(0)
    setNotesDraft('')
    setMeasureDraft('')
    setRecords([])
    setFinished(false)
  }, [])

  const summary = useMemo(() => {
    const lines = [
      `Protokoll · ${flow.name} (${flow.id})`,
      `Schritte: ${records.length}`,
      '',
    ]
    for (const r of records) {
      const node = (flow.nodes ?? []).find((n) => n.id === r.nodeId)
      const label = node?.label ?? r.nodeId
      const bits = [
        `${r.status === 'done' ? '✓' : '↷'} ${label}`,
        r.gateChoice ? `gate=${r.gateChoice}` : null,
        r.measureScore != null ? `score=${r.measureScore}` : null,
        r.notes ? `notes: ${r.notes}` : null,
      ].filter(Boolean)
      lines.push(bits.join(' · '))
    }
    return lines.join('\n')
  }, [flow, records])

  if (!hasGraph) {
    return (
      <Alert tone="info">
        Kein Graph — Protokoll braucht Nodes/Edges. Bausteine: {flow.nodeKindsUsed.join(', ')}.
      </Alert>
    )
  }

  return (
    <section className="audion-flow-protocol">
      <div className="audion-flow-canvas-toolbar">
        <Chip size="sm" static>
          ohne Agent
        </Chip>
        <Chip size="sm" static>
          Schritt {Math.min(cursor + 1, path.length || 1)} / {path.length || '—'}
        </Chip>
        <Button type="button" size="sm" variant="subtle" onClick={reset}>
          Reset
        </Button>
      </div>

      <Text role="headline" as="h2">
        Moderiertes Protokoll
      </Text>
      <p className="audion-flow-canvas-hint">
        Menschliche Moderation entlang des Flow-Graphen — kein Journey-Agent. Gates wählst du
        selbst (wenn / sonst).
      </p>

      {finished ? (
        <div className="audion-flow-protocol-done">
          <Alert tone="ok">Protokoll durch.</Alert>
          <Field label="Zusammenfassung (kopieren)">
            <Textarea id="protocol-summary" block rows={10} value={summary} readOnly />
          </Field>
          <Button type="button" size="sm" onClick={reset}>
            Neu starten
          </Button>
        </div>
      ) : current ? (
        <div className="audion-flow-protocol-card">
          <p className="audion-flow-block-meta">
            <Chip size="sm" static>
              {current.kind}
            </Chip>
            {current.gateCondition ? (
              <Chip size="sm" static>
                {current.gateCondition}
              </Chip>
            ) : null}
            {current.observeSeconds ? (
              <Chip size="sm" static>
                ~{current.observeSeconds}s
              </Chip>
            ) : null}
          </p>
          <Text role="headline" as="h3">
            {current.label}
          </Text>
          {current.text ? <p className="audion-flow-block-text">{current.text}</p> : null}
          {current.urlKey ? (
            <p className="audion-tg-card-meta">urlKey: {current.urlKey}</p>
          ) : null}

          <Field label="Notizen">
            <Textarea
              id="protocol-notes"
              block
              rows={3}
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              placeholder="Beobachtung / Zitat / Moderator-Notiz"
            />
          </Field>

          {current.kind === 'measure' ? (
            <Field label="Score 1–5 (optional)">
              <Input
                type="number"
                min={1}
                max={5}
                value={measureDraft}
                onChange={(e) => setMeasureDraft(e.target.value)}
              />
            </Field>
          ) : null}

          <div className="audion-flow-protocol-actions">
            <Button type="button" size="sm" variant="subtle" onClick={goBack} disabled={cursor < 1}>
              Zurück
            </Button>
            {current.kind !== 'gate' ? (
              <Button type="button" size="sm" variant="subtle" onClick={() => advance('skipped')}>
                Überspringen
              </Button>
            ) : null}
            {current.kind === 'gate' ? (
              <>
                <Button type="button" size="md" onClick={() => advance('done', 'when')}>
                  Wenn →
                </Button>
                <Button
                  type="button"
                  size="md"
                  variant="subtle"
                  onClick={() => advance('done', 'otherwise')}
                >
                  Sonst →
                </Button>
              </>
            ) : (
              <Button type="button" size="md" onClick={() => advance('done')}>
                Erledigt
              </Button>
            )}
          </div>
        </div>
      ) : (
        <Alert tone="info">Kein aktueller Schritt.</Alert>
      )}

      {records.length > 0 && !finished ? (
        <ol className="audion-flow-protocol-log">
          {records.map((r) => {
            const node = (flow.nodes ?? []).find((n) => n.id === r.nodeId)
            return (
              <li key={r.nodeId}>
                <Chip size="sm" static>
                  {r.status}
                </Chip>{' '}
                {node?.label ?? r.nodeId}
                {r.gateChoice ? ` · ${r.gateChoice}` : ''}
                {r.measureScore != null ? ` · ${r.measureScore}` : ''}
              </li>
            )
          })}
        </ol>
      ) : null}
    </section>
  )
}
