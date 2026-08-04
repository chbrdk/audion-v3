'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type OnSelectionChangeParams,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type {
  UxFlowNode,
  UxFlowNodeKind,
  UxStudyFromFlowResult,
  UxTestFlow,
} from '@audion-v3/contracts'
import { Alert, Button, Chip, Text } from '@msqdx/ui'
import {
  UX_FLOW_NODE_KINDS,
  edgeKindLabel,
  flowToRfNodesEdges,
  newUxFlowNode,
  nextEdgeKindForSource,
  rfToUxTestFlow,
  type UxFlowRfEdge,
  type UxFlowRfNode,
} from '../lib/ux-flow-canvas'
import {
  mapJobToFlowNodeStates,
  type FlowNodeRunState,
} from '../lib/ux-flow-run-progress'
import { flattenFlowBlocks } from '../lib/ux-test-flow-graph'
import { paths } from '../lib/paths'
import { CreateStudyFromFlowButton } from './create-study-from-flow-button'
import { UxFlowRfNode as UxFlowRfNodeView } from './ux-flow-rf-node'

const nodeTypes = { uxFlow: UxFlowRfNodeView }
const POLL_MS = 1800

type AgentJobPoll = {
  jobId: string
  status: string
  error?: string | null
  result?: {
    success?: boolean | null
    steps?: Array<{ action?: string; target?: string; result?: string }>
    finalUrl?: string | null
    finalTitle?: string | null
    error?: string | null
  } | null
}

function FlowCanvasInner({
  initialFlow,
}: {
  initialFlow: UxTestFlow
}) {
  const templateRef = useRef(initialFlow)
  const initial = useMemo(() => flowToRfNodesEdges(initialFlow), [initialFlow])
  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges)
  const [dirty, setDirty] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [runStates, setRunStates] = useState<Record<string, FlowNodeRunState>>({})
  const [runBusy, setRunBusy] = useState(false)
  const [runError, setRunError] = useState<string | null>(null)
  const [runMeta, setRunMeta] = useState<{
    studyId: string
    waveId: string
    jobId: string
    status: string
    stepCount: number
  } | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const jobIdRef = useRef<string | null>(null)

  const markDirty = useCallback(() => setDirty(true), [])

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  useEffect(() => () => stopPolling(), [stopPolling])

  const onUpdateNode = useCallback(
    (nodeId: string, patch: Partial<UxFlowNode>) => {
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== nodeId) return n
          const prev = (n as UxFlowRfNode).data?.flowNode
          return {
            ...n,
            data: {
              ...n.data,
              flowNode: { ...prev, ...patch, id: nodeId },
            },
          }
        }),
      )
      markDirty()
    },
    [setNodes, markDirty],
  )

  const nodesForFlow = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        data: {
          ...n.data,
          onUpdate: onUpdateNode,
          runState: runStates[n.id] ?? 'idle',
        },
      })),
    [nodes, onUpdateNode, runStates],
  )

  const getSnapshot = useCallback((): UxTestFlow => {
    return rfToUxTestFlow(templateRef.current, nodes as UxFlowRfNode[], edges as UxFlowRfEdge[])
  }, [nodes, edges])

  const applyJobToStates = useCallback(
    (job: AgentJobPoll) => {
      const flow = getSnapshot()
      const next = mapJobToFlowNodeStates(flow, {
        status: job.status,
        steps: job.result?.steps ?? [],
        finalUrl: job.result?.finalUrl,
        finalTitle: job.result?.finalTitle,
        success: job.result?.success,
        error: job.error ?? job.result?.error,
      })
      setRunStates(next)
      setRunMeta((m) =>
        m
          ? {
              ...m,
              status: job.status,
              stepCount: job.result?.steps?.length ?? 0,
            }
          : m,
      )
    },
    [getSnapshot],
  )

  const pollOnce = useCallback(async (jobId: string) => {
    const res = await fetch(paths.routes.apiUxJourneyAgentRun(jobId), {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      throw new Error(`Job poll failed (${res.status}): ${detail.slice(0, 200)}`)
    }
    return (await res.json()) as AgentJobPoll
  }, [])

  const startPolling = useCallback(
    (jobId: string) => {
      stopPolling()
      jobIdRef.current = jobId
      const tick = async () => {
        try {
          const job = await pollOnce(jobId)
          applyJobToStates(job)
          if (job.status === 'complete' || job.status === 'error') {
            stopPolling()
            setRunBusy(false)
          }
        } catch (e) {
          setRunError(e instanceof Error ? e.message : String(e))
          stopPolling()
          setRunBusy(false)
        }
      }
      void tick()
      pollRef.current = setInterval(() => void tick(), POLL_MS)
    },
    [applyJobToStates, pollOnce, stopPolling],
  )

  const onTest = useCallback(async () => {
    setRunError(null)
    setRunBusy(true)
    stopPolling()
    setRunStates({})
    try {
      const flow = getSnapshot()
      const createRes = await fetch(paths.routes.apiStudiesFromFlow, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flowId: flow.id,
          flow,
          name: `${flow.name} · live test`,
          waveKey: `live-${Date.now().toString(36)}`,
        }),
      })
      const created = (await createRes.json()) as UxStudyFromFlowResult & { error?: string }
      if (!createRes.ok) {
        throw new Error(created.error || `Create failed (${createRes.status})`)
      }
      const studyId = created.study.id
      const waveId = created.wave.id
      const startRes = await fetch(paths.routes.apiStudyWaveStart(studyId, waveId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true }),
      })
      const started = (await startRes.json()) as {
        error?: string
        started?: Array<{ runKey: string; jobId: string | null; skipped?: boolean }>
      }
      if (!startRes.ok) {
        throw new Error(started.error || `Start failed (${startRes.status})`)
      }
      const jobId =
        started.started?.find((s) => s.jobId && !String(s.jobId).startsWith('job-local-'))
          ?.jobId ||
        started.started?.find((s) => s.jobId)?.jobId ||
        null
      if (!jobId) {
        throw new Error(
          'No agent jobId — is UX_JOURNEY_AGENT_URL configured? Study was created; open wave to retry.',
        )
      }
      setRunMeta({
        studyId,
        waveId,
        jobId,
        status: 'running',
        stepCount: 0,
      })
      // Seed start as active
      applyJobToStates({ jobId, status: 'running', result: { steps: [] } })
      startPolling(jobId)
    } catch (e) {
      setRunError(e instanceof Error ? e.message : String(e))
      setRunBusy(false)
    }
  }, [applyJobToStates, getSnapshot, startPolling, stopPolling])

  const onStop = useCallback(async () => {
    const jobId = jobIdRef.current || runMeta?.jobId
    if (!jobId) return
    stopPolling()
    setRunBusy(false)
    try {
      await fetch(`${paths.routes.apiUxJourneyAgentRun(jobId)}/cancel`, {
        method: 'POST',
        headers: { Accept: 'application/json' },
      })
    } catch {
      /* best-effort */
    }
    setRunMeta((m) => (m ? { ...m, status: 'cancelled' } : m))
  }, [runMeta?.jobId, stopPolling])

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return
      const sourceRf = nodes.find((n) => n.id === connection.source) as UxFlowRfNode | undefined
      const kind = nextEdgeKindForSource(
        sourceRf?.data?.flowNode,
        edges.map((e) => ({
          from: e.source,
          kind: (e.data as UxFlowRfEdge['data'])?.kind ?? 'then',
        })),
        connection.source,
        connection.sourceHandle,
      )
      const id = `e-${connection.source}-${connection.target}-${Date.now().toString(36)}`
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            id,
            sourceHandle: connection.sourceHandle ?? kind,
            targetHandle: connection.targetHandle ?? 'in',
            label: edgeKindLabel(kind),
            data: { kind },
          },
          eds,
        ),
      )
      markDirty()
    },
    [nodes, edges, setEdges, markDirty],
  )

  const onSelectionChange = useCallback(({ nodes: sel }: OnSelectionChangeParams) => {
    setSelectedId(sel[0]?.id ?? null)
  }, [])

  const addNode = useCallback(
    (kind: UxFlowNodeKind) => {
      const flowNode = newUxFlowNode(kind)
      const maxY = nodes.reduce((m, n) => Math.max(m, n.position.y), 0)
      const rfNode: UxFlowRfNode = {
        id: flowNode.id,
        type: 'uxFlow',
        position: { x: 40, y: maxY + 180 },
        data: { flowNode },
      }
      setNodes((nds) => [...nds, rfNode])
      setSelectedId(flowNode.id)
      markDirty()
    },
    [nodes, setNodes, markDirty],
  )

  const deleteSelected = useCallback(() => {
    if (!selectedId) return
    setNodes((nds) => nds.filter((n) => n.id !== selectedId))
    setEdges((eds) => eds.filter((e) => e.source !== selectedId && e.target !== selectedId))
    setSelectedId(null)
    markDirty()
  }, [selectedId, setNodes, setEdges, markDirty])

  const reset = useCallback(() => {
    const next = flowToRfNodesEdges(templateRef.current)
    setNodes(next.nodes)
    setEdges(next.edges)
    setSelectedId(null)
    setDirty(false)
    setRunStates({})
  }, [setNodes, setEdges])

  const hasGraph = Boolean(initialFlow.nodes?.length)

  return (
    <div className="audion-flow-canvas-shell">
      <div className="audion-flow-canvas-toolbar">
        <Button
          type="button"
          size="md"
          onClick={() => void onTest()}
          disabled={!hasGraph || runBusy}
        >
          {runBusy ? 'Running…' : 'Testen'}
        </Button>
        <Button type="button" size="sm" variant="subtle" onClick={() => void onStop()} disabled={!runBusy}>
          Stop
        </Button>
        <CreateStudyFromFlowButton
          flowId={initialFlow.id}
          flowName={initialFlow.name}
          disabled={!initialFlow.compileReady && !hasGraph}
          getFlowSnapshot={getSnapshot}
        />
        {dirty ? (
          <Chip size="sm" static>
            unsaved session edit
          </Chip>
        ) : null}
        <Button type="button" size="sm" variant="subtle" onClick={reset} disabled={!dirty}>
          Reset to template
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={deleteSelected}
          disabled={!selectedId || runBusy}
        >
          Delete node
        </Button>
      </div>

      {runMeta ? (
        <div className="audion-flow-run-strip">
          <Chip size="sm" static>
            {runMeta.status}
          </Chip>
          <span>
            steps {runMeta.stepCount} · job {runMeta.jobId.slice(0, 10)}…
          </span>
          <Link href={paths.routes.studyWaveDetail(runMeta.studyId, runMeta.waveId)}>
            Open wave
          </Link>
          {runBusy && runMeta.jobId ? (
            // Live frame refreshes as steps advance (cache-bust).
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className="audion-flow-live-thumb"
              src={`${paths.routes.apiUxJourneyAgentLive(runMeta.jobId)}?t=${runMeta.stepCount}`}
              alt="Live viewport"
            />
          ) : null}
        </div>
      ) : null}
      {runError ? <p className="audion-flow-create-error">{runError}</p> : null}

      {!hasGraph ? (
        <Alert tone="info">
          Noch kein vollständiger Graph — nur Katalog-Metadaten. Bausteine:{' '}
          {initialFlow.nodeKindsUsed.join(', ')}.
        </Alert>
      ) : (
        <div className="audion-flow-canvas-main audion-flow-canvas-main--full">
          <div className="audion-flow-palette">
            <Text role="label" as="p">
              Bausteine
            </Text>
            <div className="audion-flow-palette-row">
              {UX_FLOW_NODE_KINDS.map((kind) => (
                <Button
                  key={kind}
                  type="button"
                  size="sm"
                  variant="subtle"
                  onClick={() => addNode(kind)}
                  disabled={runBusy}
                >
                  + {kind}
                </Button>
              ))}
            </div>
            <p className="audion-flow-canvas-hint">
              Testen startet den Agenten und markiert Nodes live · Gates bleiben V1 (Task-Text)
            </p>
          </div>
          <div className="audion-flow-canvas-viewport audion-flow-canvas-viewport--tall">
            <ReactFlow
              nodes={nodesForFlow}
              edges={edges}
              onNodesChange={(c) => {
                onNodesChange(c)
                if (
                  c.some(
                    (ch) =>
                      ch.type === 'remove' ||
                      ch.type === 'add' ||
                      (ch.type === 'position' && 'dragging' in ch && ch.dragging === false),
                  )
                ) {
                  markDirty()
                }
              }}
              onEdgesChange={(c) => {
                onEdgesChange(c)
                if (c.some((ch) => ch.type === 'remove' || ch.type === 'add')) {
                  markDirty()
                }
              }}
              onConnect={onConnect}
              onSelectionChange={onSelectionChange}
              nodeTypes={nodeTypes}
              fitView
              deleteKeyCode={null}
              nodesDraggable={!runBusy}
              connectionLineStyle={{ strokeWidth: 2 }}
              defaultEdgeOptions={{
                type: 'smoothstep',
                animated: false,
                style: { strokeWidth: 2 },
              }}
            >
              <Background gap={18} size={1} />
              <Controls />
              <MiniMap pannable zoomable />
            </ReactFlow>
          </div>
        </div>
      )}
    </div>
  )
}

export function UxFlowDetailClient({ flow }: { flow: UxTestFlow }) {
  const hasGraph = Boolean(flow.nodes?.length)
  const [view, setView] = useState<'canvas' | 'list'>(hasGraph ? 'canvas' : 'list')
  const blocks = useMemo(() => flattenFlowBlocks(flow), [flow])

  return (
    <div className="audion-flow-detail-client">
      <div className="audion-flow-view-toggle" role="group" aria-label="Ansicht">
        <Button
          type="button"
          size="sm"
          variant={view === 'canvas' ? 'primary' : 'subtle'}
          onClick={() => setView('canvas')}
          disabled={!hasGraph}
        >
          Canvas
        </Button>
        <Button
          type="button"
          size="sm"
          variant={view === 'list' ? 'primary' : 'subtle'}
          onClick={() => setView('list')}
        >
          Liste
        </Button>
      </div>

      {view === 'canvas' ? (
        <ReactFlowProvider>
          <FlowCanvasInner initialFlow={flow} />
        </ReactFlowProvider>
      ) : (
        <section className="audion-flow-blocks">
          <div className="audion-flow-canvas-toolbar">
            <CreateStudyFromFlowButton
              flowId={flow.id}
              flowName={flow.name}
              disabled={!flow.compileReady}
            />
          </div>
          <Text role="headline" as="h2">
            Blockliste
          </Text>
          {!blocks.length ? (
            <Alert tone="info">
              Noch kein vollständiger Graph — nur Katalog-Metadaten. Bausteine:{' '}
              {flow.nodeKindsUsed.join(', ')}.
            </Alert>
          ) : (
            <ol className="audion-flow-block-list">
              {blocks.map(({ node, branch, depth }) => (
                <li
                  key={`${node.id}-${branch}-${depth}`}
                  className="audion-flow-block"
                  style={{ marginLeft: `${depth * 1.25}rem` }}
                >
                  <div className="audion-flow-block-panel audion-flow-block-panel--list">
                    <p className="audion-flow-block-meta">
                      <Chip size="sm" static>
                        {node.kind}
                      </Chip>
                      {branch && branch !== 'main' ? (
                        <Chip size="sm" static>
                          {branch === 'when' ? 'wenn' : 'sonst'}
                        </Chip>
                      ) : null}
                      {node.gateCondition ? (
                        <Chip size="sm" static>
                          {node.gateCondition}
                        </Chip>
                      ) : null}
                    </p>
                    <Text role="headline" as="h3">
                      {node.label}
                    </Text>
                    {node.text ? <p className="audion-flow-block-text">{node.text}</p> : null}
                    {node.urlKey ? (
                      <p className="audion-tg-card-meta">urlKey: {node.urlKey}</p>
                    ) : null}
                    {node.pattern ? (
                      <p className="audion-tg-card-meta">pattern: {node.pattern}</p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}
    </div>
  )
}
