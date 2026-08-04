'use client'

import React, { useCallback, useMemo, useRef, useState } from 'react'
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
  UxFlowGateCondition,
  UxFlowNode,
  UxFlowNodeKind,
  UxTestFlow,
} from '@audion-v3/contracts'
import { Alert, Button, Chip, Field, Input, Panel, Text, Textarea } from '@msqdx/ui'
import { Select } from '../lib/msqdx-ui-client'
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
import { flattenFlowBlocks } from '../lib/ux-test-flow-graph'
import { CreateStudyFromFlowButton } from './create-study-from-flow-button'
import { UxFlowRfNode as UxFlowRfNodeView } from './ux-flow-rf-node'

const GATE_OPTIONS: UxFlowGateCondition[] = [
  'frustration_high',
  'url_match',
  'title_match',
  'consent_accepted',
  'consent_rejected',
  'goal_reached',
  'confusion_named',
  'time_elapsed',
]

const nodeTypes = { uxFlow: UxFlowRfNodeView }

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

  const markDirty = useCallback(() => setDirty(true), [])

  const getSnapshot = useCallback((): UxTestFlow => {
    return rfToUxTestFlow(templateRef.current, nodes as UxFlowRfNode[], edges as UxFlowRfEdge[])
  }, [nodes, edges])

  const selectedNode = useMemo(() => {
    if (!selectedId) return null
    const n = nodes.find((x) => x.id === selectedId) as UxFlowRfNode | undefined
    return n?.data?.flowNode ?? null
  }, [nodes, selectedId])

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
      )
      const id = `e-${connection.source}-${connection.target}-${Date.now().toString(36)}`
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            id,
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

  const updateSelected = useCallback(
    (patch: Partial<UxFlowNode>) => {
      if (!selectedId) return
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== selectedId) return n
          const prev = (n as UxFlowRfNode).data?.flowNode
          return {
            ...n,
            data: {
              flowNode: { ...prev, ...patch, id: selectedId },
            },
          }
        }),
      )
      markDirty()
    },
    [selectedId, setNodes, markDirty],
  )

  const addNode = useCallback(
    (kind: UxFlowNodeKind) => {
      const flowNode = newUxFlowNode(kind)
      const maxY = nodes.reduce((m, n) => Math.max(m, n.position.y), 0)
      const rfNode: UxFlowRfNode = {
        id: flowNode.id,
        type: 'uxFlow',
        position: { x: 40, y: maxY + 120 },
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
  }, [setNodes, setEdges])

  const hasGraph = Boolean(initialFlow.nodes?.length)

  return (
    <div className="audion-flow-canvas-shell">
      <div className="audion-flow-canvas-toolbar">
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
      </div>

      {!hasGraph ? (
        <Alert tone="info">
          Noch kein vollständiger Graph — nur Katalog-Metadaten. Bausteine:{' '}
          {initialFlow.nodeKindsUsed.join(', ')}.
        </Alert>
      ) : (
        <div className="audion-flow-canvas-layout">
          <div className="audion-flow-canvas-main">
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
                  >
                    + {kind}
                  </Button>
                ))}
              </div>
            </div>
            <div className="audion-flow-canvas-viewport">
              <ReactFlow
                nodes={nodes}
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
                deleteKeyCode={['Backspace', 'Delete']}
              >
                <Background />
                <Controls />
                <MiniMap />
              </ReactFlow>
            </div>
          </div>
          <aside className="audion-flow-inspector">
            <Panel as="div" variant="card">
              <Text role="headline" as="h3">
                Inspector
              </Text>
              {!selectedNode ? (
                <p className="audion-flow-block-text">Knoten wählen zum Bearbeiten.</p>
              ) : (
                <div className="audion-flow-inspector-fields">
                  <p className="audion-flow-block-meta">
                    <Chip size="sm" static>
                      {selectedNode.kind}
                    </Chip>
                    <Chip size="sm" static>
                      {selectedNode.id}
                    </Chip>
                  </p>
                  <Field label="Label" size="sm" htmlFor="flow-node-label">
                    <Input
                      id="flow-node-label"
                      size="sm"
                      block
                      value={selectedNode.label}
                      onChange={(e) => updateSelected({ label: e.target.value })}
                    />
                  </Field>
                  {selectedNode.kind !== 'start' && selectedNode.kind !== 'gate' ? (
                    <Field label="Text" size="sm" htmlFor="flow-node-text">
                      <Textarea
                        id="flow-node-text"
                        size="sm"
                        block
                        rows={4}
                        value={selectedNode.text ?? ''}
                        onChange={(e) => updateSelected({ text: e.target.value })}
                      />
                    </Field>
                  ) : null}
                  {selectedNode.kind === 'start' ? (
                    <Field label="urlKey" size="sm" htmlFor="flow-node-url">
                      <Input
                        id="flow-node-url"
                        size="sm"
                        block
                        value={selectedNode.urlKey ?? ''}
                        onChange={(e) => updateSelected({ urlKey: e.target.value })}
                      />
                    </Field>
                  ) : null}
                  {selectedNode.kind === 'gate' ? (
                    <>
                      <Field label="Gate condition" size="sm" htmlFor="flow-node-gate">
                        <Select
                          id="flow-node-gate"
                          size="sm"
                          value={selectedNode.gateCondition ?? 'goal_reached'}
                          onChange={(v: string) =>
                            updateSelected({ gateCondition: v as UxFlowGateCondition })
                          }
                          options={GATE_OPTIONS.map((g) => ({ value: g, label: g }))}
                        />
                      </Field>
                      {(selectedNode.gateCondition === 'url_match' ||
                        selectedNode.gateCondition === 'title_match') && (
                        <Field label="pattern" size="sm" htmlFor="flow-node-pattern">
                          <Input
                            id="flow-node-pattern"
                            size="sm"
                            block
                            value={selectedNode.pattern ?? ''}
                            onChange={(e) => updateSelected({ pattern: e.target.value })}
                          />
                        </Field>
                      )}
                    </>
                  ) : null}
                  <Button type="button" size="sm" variant="ghost" onClick={deleteSelected}>
                    Delete node
                  </Button>
                </div>
              )}
            </Panel>
          </aside>
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
                  <Panel as="div" variant="card" className="audion-flow-block-panel">
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
                  </Panel>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}
    </div>
  )
}
