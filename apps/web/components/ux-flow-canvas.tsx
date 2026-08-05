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
  UxFlowCursor,
  UxFlowGateSignalBundle,
  UxFlowNode,
  UxFlowNodeKind,
  UxSavedFlow,
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
  buildJobRunSummary,
  mapJobToFlowNodeInspector,
  mapJobToFlowNodeOutputs,
  mapJobToFlowNodeStates,
  type FlowJobRunSummary,
  type FlowNodeInspectorData,
  type FlowNodeRunOutput,
  type FlowNodeRunState,
} from '../lib/ux-flow-run-progress'
import { deriveFlowVerdict, type FlowRunVerdict } from '../lib/ux-flow-verdict'
import { flattenFlowBlocks, gateChoicesFromReplans, activePathEdgeIds } from '../lib/ux-test-flow-graph'
import { paths } from '../lib/paths'
import { CreateStudyFromFlowButton } from './create-study-from-flow-button'
import {
  IconDelete,
  IconGrip,
  IconList,
  IconClose,
  IconPlay,
  IconPlus,
  IconReset,
  IconSave,
  IconStop,
  IconUndo,
} from './nav-icons'
import { UxFlowFloatingPanel } from './ux-flow-floating-panel'
import { UxFlowNodeInspector } from './ux-flow-node-inspector'
import { UxFlowVerdictCard } from './ux-flow-verdict-card'
import { UxFlowRfNode as UxFlowRfNodeView } from './ux-flow-rf-node'

const nodeTypes = { uxFlow: UxFlowRfNodeView }
const POLL_MS = 1800
const HISTORY_MAX = 30

type AgentJobPoll = {
  jobId: string
  status: string
  error?: string | null
  gateSignals?: UxFlowGateSignalBundle | null
  flowCursor?: UxFlowCursor | null
  result?: {
    success?: boolean | null
    steps?: Array<{
      step?: number
      action?: string
      target?: string
      result?: string
      reasoning?: string | null
      timestamp?: string | null
      screenshot?: string | null
      screenshotUrl?: string | null
      perception?: Record<string, unknown> | null
      thinkAloud?: Record<string, unknown> | null
    }>
    scorecard?: Record<string, unknown> | null
    finalUrl?: string | null
    finalTitle?: string | null
    error?: string | null
    summary?: string | null
    cancelled?: boolean | null
    gateSignals?: UxFlowGateSignalBundle | null
  } | null
}

type GraphSnap = { nodes: UxFlowRfNode[]; edges: UxFlowRfEdge[] }

function FlowCanvasInner({
  initialFlow,
  onSwitchToList,
}: {
  initialFlow: UxTestFlow
  onSwitchToList?: () => void
}) {
  const templateRef = useRef(initialFlow)
  const initial = useMemo(() => flowToRfNodesEdges(initialFlow), [initialFlow])
  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges)
  const [dirty, setDirty] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [saveBusy, setSaveBusy] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [runStates, setRunStates] = useState<Record<string, FlowNodeRunState>>({})
  const [runStatesB, setRunStatesB] = useState<Record<string, FlowNodeRunState>>({})
  const [runOutputs, setRunOutputs] = useState<Record<string, FlowNodeRunOutput>>({})
  const [inspectorByNode, setInspectorByNode] = useState<Record<string, FlowNodeInspectorData>>({})
  const [jobSummary, setJobSummary] = useState<FlowJobRunSummary | null>(null)
  const [flowVerdict, setFlowVerdict] = useState<FlowRunVerdict | null>(null)
  const [flowCursor, setFlowCursor] = useState<UxFlowCursor | null>(null)
  const [segmentBusy, setSegmentBusy] = useState(false)
  const [runBusy, setRunBusy] = useState(false)
  const [runError, setRunError] = useState<string | null>(null)
  const [runMeta, setRunMeta] = useState<{
    studyId: string
    waveId: string
    jobId: string
    jobIdB?: string | null
    status: string
    stepCount: number
    stepCountB?: number
  } | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const jobIdRef = useRef<string | null>(null)
  const jobIdBRef = useRef<string | null>(null)
  const historyRef = useRef<GraphSnap[]>([])
  const skipHistoryRef = useRef(false)
  const [historyLen, setHistoryLen] = useState(0)
  const [paletteOpen, setPaletteOpen] = useState(false)

  const pushHistory = useCallback(() => {
    if (skipHistoryRef.current) return
    const snap: GraphSnap = {
      nodes: structuredClone(nodes) as UxFlowRfNode[],
      edges: structuredClone(edges) as UxFlowRfEdge[],
    }
    historyRef.current = [...historyRef.current.slice(-(HISTORY_MAX - 1)), snap]
    setHistoryLen(historyRef.current.length)
  }, [nodes, edges])

  const markDirty = useCallback(() => {
    pushHistory()
    setDirty(true)
    setSaveMsg(null)
  }, [pushHistory])

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  useEffect(() => () => stopPolling(), [stopPolling])

  // Load saved variant for this template (if any).
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch(
          `${paths.routes.apiStudiesFlowsSaved}?templateFlowId=${encodeURIComponent(initialFlow.id)}`,
          { headers: { Accept: 'application/json' }, cache: 'no-store' },
        )
        if (!res.ok) return
        const json = (await res.json()) as { items?: Array<{ id: string }> }
        const first = json.items?.[0]
        if (!first?.id) return
        const detailRes = await fetch(paths.routes.apiStudiesFlowSavedDetail(first.id), {
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        })
        if (!detailRes.ok) return
        const saved = (await detailRes.json()) as UxSavedFlow
        if (cancelled || !saved.flow?.nodes?.length) return
        skipHistoryRef.current = true
        const mapped = flowToRfNodesEdges(saved.flow)
        setNodes(mapped.nodes)
        setEdges(mapped.edges)
        setSavedId(saved.id)
        setDirty(false)
        skipHistoryRef.current = false
        setSaveMsg('Loaded saved flow')
      } catch {
        /* ignore — fall back to template */
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [initialFlow.id, setNodes, setEdges])

  const onUpdateNode = useCallback(
    (nodeId: string, patch: Partial<UxFlowNode>) => {
      pushHistory()
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
      setDirty(true)
      setSaveMsg(null)
    },
    [setNodes, pushHistory],
  )

  const getSnapshot = useCallback((): UxTestFlow => {
    return rfToUxTestFlow(templateRef.current, nodes as UxFlowRfNode[], edges as UxFlowRfEdge[])
  }, [nodes, edges])

  const jobToInput = useCallback((job: AgentJobPoll) => {
    const signals = job.gateSignals ?? job.result?.gateSignals ?? null
    return {
      status: job.status,
      steps: job.result?.steps ?? [],
      finalUrl: signals?.finalUrl ?? job.result?.finalUrl,
      finalTitle: signals?.finalTitle ?? job.result?.finalTitle,
      success: job.result?.success,
      error: job.error ?? job.result?.error,
      summary: job.result?.summary ?? null,
      cancelled: job.result?.cancelled ?? null,
      scorecard: job.result?.scorecard ?? null,
      gateSignals: signals,
      flowCursor: job.flowCursor ?? null,
      jobId: job.jobId,
    }
  }, [])

  const applyJobsToStates = useCallback(
    (jobA: AgentJobPoll, jobB?: AgentJobPoll | null) => {
      const flow = getSnapshot()
      const inputA = jobToInput(jobA)
      setFlowCursor(jobA.flowCursor ?? null)
      setRunStates(mapJobToFlowNodeStates(flow, inputA))
      setRunOutputs(mapJobToFlowNodeOutputs(flow, inputA))
      setInspectorByNode(mapJobToFlowNodeInspector(flow, inputA))
      setJobSummary(buildJobRunSummary(inputA))
      setFlowVerdict(deriveFlowVerdict(flow, inputA))
      if (jobB) {
        setRunStatesB(mapJobToFlowNodeStates(flow, jobToInput(jobB)))
      } else {
        setRunStatesB({})
      }
      setRunMeta((m) =>
        m
          ? {
              ...m,
              status: jobA.status,
              stepCount: jobA.result?.steps?.length ?? 0,
              stepCountB: jobB?.result?.steps?.length ?? m.stepCountB,
            }
          : m,
      )
    },
    [getSnapshot, jobToInput],
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

  const gateChoices = useMemo(() => {
    const fired = new Set<string>()
    for (const ev of flowCursor?.replanHistory ?? []) {
      if (ev?.gateNodeId) fired.add(ev.gateNodeId)
    }
    if (flowCursor?.replan?.gateNodeId) fired.add(flowCursor.replan.gateNodeId)
    return gateChoicesFromReplans(fired, flowCursor?.replanHistory ?? null)
  }, [flowCursor])

  const activeEdgeIds = useMemo(() => {
    const flow = rfToUxTestFlow(
      templateRef.current,
      nodes as UxFlowRfNode[],
      edges as UxFlowRfEdge[],
    )
    return activePathEdgeIds(flow, gateChoices)
  }, [nodes, edges, gateChoices])

  const edgesForFlow = useMemo(
    () =>
      edges.map((e) => {
        const onPath = activeEdgeIds.has(e.id)
        return {
          ...e,
          animated: onPath && runBusy,
          style: {
            ...((e.style as Record<string, unknown>) ?? {}),
            strokeWidth: onPath ? 3 : 2,
            stroke: onPath ? 'var(--flow-accent, var(--accent))' : undefined,
          },
        }
      }),
    [edges, activeEdgeIds, runBusy],
  )

  const onManualGateForNode = useCallback(
    async (gateNodeId: string, edgeKind: 'when' | 'otherwise') => {
      const jobId = jobIdRef.current ?? runMeta?.jobId
      if (!jobId) {
        setRunError('Kein laufender Job — zuerst Testen starten.')
        return
      }
      setRunError(null)
      try {
        const res = await fetch(`${paths.routes.apiUxJourneyAgentRun(jobId)}/gate-branch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ gateNodeId, edgeKind }),
        })
        const json = (await res.json()) as { error?: string; flowCursor?: UxFlowCursor }
        if (!res.ok) throw new Error(json.error || `Gate branch failed (${res.status})`)
        if (json.flowCursor) setFlowCursor(json.flowCursor)
        const jobA = await pollOnce(jobId)
        const jobB = jobIdBRef.current ? await pollOnce(jobIdBRef.current) : null
        applyJobsToStates(jobA, jobB)
      } catch (e) {
        setRunError(e instanceof Error ? e.message : String(e))
      }
    },
    [applyJobsToStates, pollOnce, runMeta?.jobId],
  )

  const onOutputToNote = useCallback(
    (nodeId: string) => {
      const out = runOutputs[nodeId]
      if (!out?.text?.trim()) return
      const node = nodes.find((n) => n.id === nodeId) as UxFlowRfNode | undefined
      const prev = node?.data?.flowNode?.note?.trim() ?? ''
      const addition = out.text.trim()
      onUpdateNode(nodeId, { note: prev ? `${prev}\n${addition}` : addition })
    },
    [nodes, onUpdateNode, runOutputs],
  )

  const inspectorTextFromStep = useCallback((step: FlowNodeInspectorData['steps'][number]) => {
    const parts: string[] = []
    if (step.action) parts.push(step.action)
    if (step.target) parts.push(step.target)
    if (step.result) parts.push(step.result)
    if (step.reasoning) parts.push(step.reasoning)
    const think = step.thinkAloud
    if (think && typeof think === 'object' && 'now' in think && think.now) {
      parts.push(String(think.now))
    }
    return parts.join('\n').trim()
  }, [])

  const onInspectorOutputToNote = useCallback(
    (nodeId: string) => {
      const data = inspectorByNode[nodeId]
      const last = data?.steps?.length ? data.steps[data.steps.length - 1] : null
      if (!last) return
      const addition = inspectorTextFromStep(last)
      if (!addition) return
      const node = nodes.find((n) => n.id === nodeId) as UxFlowRfNode | undefined
      const prev = node?.data?.flowNode?.note?.trim() ?? ''
      onUpdateNode(nodeId, { note: prev ? `${prev}\n${addition}` : addition })
    },
    [inspectorByNode, inspectorTextFromStep, nodes, onUpdateNode],
  )

  const onSelectNode = useCallback((nodeId: string) => {
    setSelectedId(nodeId)
  }, [])

  const onPlaySegment = useCallback(
    async (nodeId: string) => {
      if (runBusy || segmentBusy) return
      setSegmentBusy(true)
      setRunError(null)
      try {
        const flow = getSnapshot()
        const res = await fetch(paths.routes.apiStudiesFlowsHybridSegment, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ flow, nodeId, maxSteps: 10 }),
        })
        const json = (await res.json()) as { jobId?: string; error?: string }
        if (!res.ok || !json.jobId) {
          throw new Error(json.error || `Segment start failed (${res.status})`)
        }
        const jobId = json.jobId
        let done = false
        for (let i = 0; i < 120 && !done; i++) {
          await new Promise((r) => setTimeout(r, 1500))
          const job = await pollOnce(jobId)
          const snap = getSnapshot()
          const input = jobToInput(job)
          setRunOutputs((prev) => ({
            ...prev,
            ...mapJobToFlowNodeOutputs(snap, { ...input, jobId }),
          }))
          setRunStates((prev) => ({
            ...prev,
            ...mapJobToFlowNodeStates(snap, input),
          }))
          setInspectorByNode((prev) => ({
            ...prev,
            ...mapJobToFlowNodeInspector(snap, { ...input, jobId }),
          }))
          setJobSummary(buildJobRunSummary({ ...input, jobId }))
          if (job.status === 'complete' || job.status === 'error') done = true
        }
      } catch (e) {
        setRunError(e instanceof Error ? e.message : String(e))
      } finally {
        setSegmentBusy(false)
      }
    },
    [getSnapshot, jobToInput, pollOnce, runBusy, segmentBusy],
  )

  const nodesForFlow = useMemo(
    () =>
      nodes.map((n) => {
        const gateEval = flowCursor?.gateEvaluations?.find((e) => e.gateNodeId === n.id) ?? null
        return {
          ...n,
          data: {
            ...n.data,
            onUpdate: onUpdateNode,
            runState: runStates[n.id] ?? 'idle',
            runStateB: runStatesB[n.id] ?? 'idle',
            runOutput: runOutputs[n.id] ?? null,
            gateEvaluation: gateEval,
            runBusy: runBusy || segmentBusy,
            onManualGate:
              n.data?.flowNode?.kind === 'gate'
                ? (edgeKind: 'when' | 'otherwise') => void onManualGateForNode(n.id, edgeKind)
                : undefined,
            onPlaySegment: () => void onPlaySegment(n.id),
            onOutputToNote: () => onOutputToNote(n.id),
            onOpenInspector: () => onSelectNode(n.id),
          },
        }
      }),
    [
      nodes,
      onUpdateNode,
      runStates,
      runStatesB,
      runOutputs,
      flowCursor,
      runBusy,
      segmentBusy,
      onManualGateForNode,
      onPlaySegment,
      onOutputToNote,
      onSelectNode,
    ],
  )

  const selectedFlowNode = useMemo(() => {
    if (!selectedId) return null
    const rf = nodes.find((n) => n.id === selectedId) as UxFlowRfNode | undefined
    return rf?.data?.flowNode ?? null
  }, [nodes, selectedId])

  const startPolling = useCallback(
    (jobId: string, jobIdB?: string | null) => {
      stopPolling()
      jobIdRef.current = jobId
      jobIdBRef.current = jobIdB ?? null
      const tick = async () => {
        try {
          const jobA = await pollOnce(jobId)
          const jobB = jobIdB ? await pollOnce(jobIdB) : null
          applyJobsToStates(jobA, jobB)
          const aDone = jobA.status === 'complete' || jobA.status === 'error'
          const bDone = !jobB || jobB.status === 'complete' || jobB.status === 'error'
          if (aDone && bDone) {
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
    [applyJobsToStates, pollOnce, stopPolling],
  )

  const onTest = useCallback(async () => {
    setRunError(null)
    setRunBusy(true)
    stopPolling()
    setRunStates({})
    setRunStatesB({})
    setRunOutputs({})
    setFlowCursor(null)
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
      const realJobs =
        started.started
          ?.map((s) => s.jobId)
          .filter((id): id is string => Boolean(id) && !String(id).startsWith('job-local-')) ?? []
      const fallbackJobs =
        started.started?.map((s) => s.jobId).filter((id): id is string => Boolean(id)) ?? []
      const jobs = realJobs.length ? realJobs : fallbackJobs
      const jobId = jobs[0] ?? null
      const jobIdB = jobs[1] ?? null
      if (!jobId) {
        throw new Error(
          'No agent jobId — is UX_JOURNEY_AGENT_URL configured? Study was created; open wave to retry.',
        )
      }
      setRunMeta({
        studyId,
        waveId,
        jobId,
        jobIdB,
        status: 'running',
        stepCount: 0,
        stepCountB: jobIdB ? 0 : undefined,
      })
      applyJobsToStates({ jobId, status: 'running', result: { steps: [] } })
      startPolling(jobId, jobIdB)
    } catch (e) {
      setRunError(e instanceof Error ? e.message : String(e))
      setRunBusy(false)
    }
  }, [applyJobsToStates, getSnapshot, startPolling, stopPolling])

  const onStop = useCallback(async () => {
    const ids = [jobIdRef.current || runMeta?.jobId, jobIdBRef.current || runMeta?.jobIdB].filter(
      Boolean,
    ) as string[]
    stopPolling()
    setRunBusy(false)
    await Promise.all(
      ids.map((jobId) =>
        fetch(`${paths.routes.apiUxJourneyAgentRun(jobId)}/cancel`, {
          method: 'POST',
          headers: { Accept: 'application/json' },
        }).catch(() => undefined),
      ),
    )
    setRunMeta((m) => (m ? { ...m, status: 'cancelled' } : m))
  }, [runMeta?.jobId, runMeta?.jobIdB, stopPolling])

  const onSave = useCallback(async () => {
    setSaveBusy(true)
    setSaveMsg(null)
    try {
      const flow = getSnapshot()
      const res = await fetch(paths.routes.apiStudiesFlowsSaved, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          id: savedId ?? undefined,
          templateFlowId: templateRef.current.id,
          name: flow.name,
          flow,
        }),
      })
      const json = (await res.json()) as UxSavedFlow & { error?: string }
      if (!res.ok) throw new Error(json.error || `Save failed (${res.status})`)
      setSavedId(json.id)
      setDirty(false)
      setSaveMsg('Saved')
    } catch (e) {
      setSaveMsg(e instanceof Error ? e.message : String(e))
    } finally {
      setSaveBusy(false)
    }
  }, [getSnapshot, savedId])

  const onUndo = useCallback(() => {
    const prev = historyRef.current.pop()
    if (!prev) return
    setHistoryLen(historyRef.current.length)
    skipHistoryRef.current = true
    setNodes(prev.nodes)
    setEdges(prev.edges)
    setDirty(true)
    skipHistoryRef.current = false
  }, [setNodes, setEdges])

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return
      pushHistory()
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
      setDirty(true)
      setSaveMsg(null)
    },
    [nodes, edges, setEdges, pushHistory],
  )

  const onSelectionChange = useCallback(({ nodes: sel }: OnSelectionChangeParams) => {
    setSelectedId(sel[0]?.id ?? null)
  }, [])

  const addNode = useCallback(
    (kind: UxFlowNodeKind) => {
      pushHistory()
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
      setDirty(true)
      setSaveMsg(null)
      setPaletteOpen(false)
    },
    [nodes, setNodes, pushHistory],
  )

  const deleteSelected = useCallback(() => {
    if (!selectedId) return
    pushHistory()
    setNodes((nds) => nds.filter((n) => n.id !== selectedId))
    setEdges((eds) => eds.filter((e) => e.source !== selectedId && e.target !== selectedId))
    setSelectedId(null)
    setDirty(true)
    setSaveMsg(null)
  }, [selectedId, setNodes, setEdges, pushHistory])

  const reset = useCallback(() => {
    pushHistory()
    const next = flowToRfNodesEdges(templateRef.current)
    setNodes(next.nodes)
    setEdges(next.edges)
    setSelectedId(null)
    setDirty(false)
    setSavedId(null)
    setRunStates({})
    setRunStatesB({})
    setRunOutputs({})
    setFlowCursor(null)
    setSaveMsg(null)
  }, [setNodes, setEdges, pushHistory])

  const hasGraph = Boolean(initialFlow.nodes?.length)

  return (
    <div className="audion-flow-canvas-shell audion-flow-canvas-shell--immersive">
      {!hasGraph ? (
        <div className="audion-flow-board-stage">
          <UxFlowFloatingPanel
            storageKey={paths.flowBoardToolbarDockKey}
            defaultEdge="top"
            defaultOffset={0.1}
            className="audion-flow-float-panel--toolbar"
            ariaLabel="Flow Board"
          >
            <div className="audion-flow-canvas-toolbar audion-flow-canvas-toolbar--compact">
              <span className="audion-flow-toolbar-grip" title="Verschieben">
                <IconGrip />
              </span>
              {onSwitchToList ? (
                <Button
                  type="button"
                  size="sm"
                  variant="subtle"
                  className="audion-flow-toolbar-btn"
                  aria-label="Liste"
                  title="Liste"
                  icon={<IconList />}
                  onClick={onSwitchToList}
                />
              ) : null}
            </div>
          </UxFlowFloatingPanel>
          <Alert tone="info" className="audion-flow-board-empty">
            Noch kein vollständiger Graph — nur Katalog-Metadaten. Bausteine:{' '}
            {initialFlow.nodeKindsUsed.join(', ')}.
          </Alert>
        </div>
      ) : (
        <div className="audion-flow-board-stage">
          <div className="audion-flow-canvas-viewport audion-flow-canvas-viewport--fullscreen">
            <ReactFlow
              nodes={nodesForFlow}
              edges={edgesForFlow}
              onNodesChange={(c) => {
                if (
                  c.some(
                    (ch) =>
                      ch.type === 'remove' ||
                      ch.type === 'add' ||
                      (ch.type === 'position' && 'dragging' in ch && ch.dragging === false),
                  )
                ) {
                  pushHistory()
                  setDirty(true)
                  setSaveMsg(null)
                }
                onNodesChange(c)
              }}
              onEdgesChange={(c) => {
                if (c.some((ch) => ch.type === 'remove' || ch.type === 'add')) {
                  pushHistory()
                  setDirty(true)
                  setSaveMsg(null)
                }
                onEdgesChange(c)
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
              <Background gap={18} size={1} color="var(--line)" bgColor="transparent" />
              <Controls />
              <MiniMap pannable zoomable />
            </ReactFlow>
          </div>

          <UxFlowFloatingPanel
            storageKey={paths.flowBoardToolbarDockKey}
            defaultEdge="top"
            defaultOffset={0.06}
            className="audion-flow-float-panel--toolbar"
            ariaLabel="Flow Board Aktionen"
          >
            <div className="audion-flow-canvas-toolbar audion-flow-canvas-toolbar--compact">
              <span className="audion-flow-toolbar-grip" title="Verschieben">
                <IconGrip />
              </span>
              {onSwitchToList ? (
                <Button
                  type="button"
                  size="sm"
                  variant="subtle"
                  className="audion-flow-toolbar-btn"
                  aria-label="Liste"
                  title="Liste"
                  icon={<IconList />}
                  onClick={onSwitchToList}
                />
              ) : null}
              <span className="audion-flow-toolbar-sep" aria-hidden />
              <Button
                type="button"
                size="sm"
                variant="primary"
                className="audion-flow-toolbar-btn"
                aria-label={runBusy ? 'Running' : 'Testen'}
                title={runBusy ? 'Running…' : 'Testen'}
                icon={<IconPlay />}
                onClick={() => void onTest()}
                disabled={!hasGraph || runBusy}
              />
              <Button
                type="button"
                size="sm"
                variant="subtle"
                className="audion-flow-toolbar-btn"
                aria-label="Stop"
                title="Stop"
                icon={<IconStop />}
                onClick={() => void onStop()}
                disabled={!runBusy}
              />
              <CreateStudyFromFlowButton
                flowId={initialFlow.id}
                flowName={initialFlow.name}
                disabled={!initialFlow.compileReady && !hasGraph}
                getFlowSnapshot={getSnapshot}
                compact
              />
              <Button
                type="button"
                size="sm"
                variant="subtle"
                className="audion-flow-toolbar-btn"
                aria-label={saveBusy ? 'Saving' : 'Save'}
                title={saveMsg ?? (saveBusy ? 'Saving…' : 'Save')}
                icon={<IconSave />}
                onClick={() => void onSave()}
                disabled={!hasGraph || saveBusy}
              />
              <Button
                type="button"
                size="sm"
                variant="subtle"
                className="audion-flow-toolbar-btn"
                aria-label="Undo"
                title="Undo"
                icon={<IconUndo />}
                onClick={onUndo}
                disabled={historyLen < 1}
              />
              {dirty ? (
                <Chip size="sm" static className="audion-flow-toolbar-chip">
                  edit
                </Chip>
              ) : savedId ? (
                <Chip size="sm" static className="audion-flow-toolbar-chip">
                  ok
                </Chip>
              ) : null}
              <Button
                type="button"
                size="sm"
                variant="subtle"
                className="audion-flow-toolbar-btn"
                aria-label="Reset to template"
                title="Reset to template"
                icon={<IconReset />}
                onClick={reset}
                disabled={!dirty && !savedId}
              />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="audion-flow-toolbar-btn"
                aria-label="Delete node"
                title="Delete node"
                icon={<IconDelete />}
                onClick={deleteSelected}
                disabled={!selectedId || runBusy}
              />
            </div>
          </UxFlowFloatingPanel>

          <UxFlowFloatingPanel
            storageKey={paths.flowBoardPaletteDockKey}
            defaultEdge="left"
            defaultOffset={0.38}
            title={paletteOpen ? 'Bausteine' : undefined}
            className={
              paletteOpen
                ? 'audion-flow-float-panel--palette audion-flow-float-panel--palette-open'
                : 'audion-flow-float-panel--palette audion-flow-float-panel--palette-collapsed'
            }
            ariaLabel="Flow Bausteine"
          >
            {paletteOpen ? (
              <div className="audion-flow-palette">
                <div className="audion-flow-palette-head">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="audion-flow-toolbar-btn"
                    aria-label="Bausteine schließen"
                    title="Schließen"
                    icon={<IconClose />}
                    onClick={() => setPaletteOpen(false)}
                  />
                </div>
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
                      {kind}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="audion-flow-palette-fab"
                aria-label="Bausteine hinzufügen"
                title="Bausteine"
                disabled={runBusy}
                onClick={() => setPaletteOpen(true)}
              >
                <IconPlus size={28} />
              </button>
            )}
          </UxFlowFloatingPanel>

          {runMeta ? (
            <UxFlowFloatingPanel
              storageKey={paths.flowBoardRunDockKey}
              defaultEdge="bottom"
              defaultOffset={0.5}
              title="Live Run"
              className="audion-flow-float-panel--run"
              ariaLabel="Live Run Status"
            >
              <div className="audion-flow-run-strip">
                <Chip size="sm" static>
                  {runMeta.status}
                </Chip>
                <span>
                  A steps {runMeta.stepCount} · job {runMeta.jobId.slice(0, 10)}…
                  {runMeta.jobIdB
                    ? ` · B steps ${runMeta.stepCountB ?? 0} · job ${runMeta.jobIdB.slice(0, 10)}…`
                    : ''}
                </span>
                <Link href={paths.routes.studyWaveDetail(runMeta.studyId, runMeta.waveId)}>
                  Open wave
                </Link>
                {runBusy && runMeta.jobId ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    className="audion-flow-live-thumb"
                    src={`${paths.routes.apiUxJourneyAgentLive(runMeta.jobId)}?t=${runMeta.stepCount}`}
                    alt="Live viewport"
                  />
                ) : null}
              </div>
              <UxFlowVerdictCard verdict={flowVerdict} />
            </UxFlowFloatingPanel>
          ) : null}

          {selectedFlowNode ? (
            <UxFlowFloatingPanel
              storageKey={paths.flowBoardInspectorDockKey}
              defaultEdge="right"
              defaultOffset={0.22}
              title="Inspector"
              className="audion-flow-float-panel--inspector"
              ariaLabel="Node Inspector"
            >
              <UxFlowNodeInspector
                node={selectedFlowNode}
                runState={runStates[selectedId!] ?? 'idle'}
                inspector={inspectorByNode[selectedId!] ?? null}
                jobSummary={jobSummary}
                onClose={() => setSelectedId(null)}
                onAppendOutputToNote={() => onInspectorOutputToNote(selectedId!)}
              />
            </UxFlowFloatingPanel>
          ) : null}

          {runError ? <p className="audion-flow-board-alert">{runError}</p> : null}
        </div>
      )}
    </div>
  )
}

export function UxFlowDetailClient({
  flow,
  initialView,
}: {
  flow: UxTestFlow
  initialView?: 'board' | 'list' | 'canvas' | 'protocol'
}) {
  const hasGraph = Boolean(flow.nodes?.length)
  const resolvedView =
    initialView === 'list'
      ? 'list'
      : initialView === 'protocol' || initialView === 'canvas' || initialView === 'board' || hasGraph
        ? 'board'
        : 'list'
  const [view, setView] = useState<'board' | 'list'>(resolvedView === 'list' ? 'list' : 'board')
  const blocks = useMemo(() => flattenFlowBlocks(flow), [flow])
  const boardActive = view === 'board' && hasGraph

  useEffect(() => {
    document.body.classList.toggle('audion-flow-board-active', boardActive)
    return () => document.body.classList.remove('audion-flow-board-active')
  }, [boardActive])

  return (
    <div
      className={
        boardActive
          ? 'audion-flow-detail-client audion-flow-detail-client--immersive'
          : 'audion-flow-detail-client'
      }
    >
      {!boardActive ? (
        <div className="audion-flow-view-toggle" role="group" aria-label="Ansicht">
          <Button
            type="button"
            size="sm"
            variant={view === 'board' ? 'primary' : 'subtle'}
            onClick={() => setView('board')}
            disabled={!hasGraph}
          >
            Board
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
      ) : null}

      {view === 'board' ? (
        <ReactFlowProvider>
          <FlowCanvasInner initialFlow={flow} onSwitchToList={() => setView('list')} />
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
