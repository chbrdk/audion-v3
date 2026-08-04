/**
 * Pure UX Test Flow graph helpers (safe for client bundles).
 */

import type { UxFlowEdge, UxFlowNode, UxTestFlow } from '@audion-v3/contracts'

export function nodeMap(nodes: UxFlowNode[]): Map<string, UxFlowNode> {
  return new Map(nodes.map((n) => [n.id, n]))
}

export function outs(
  edges: UxFlowEdge[],
  from: string,
  kind?: UxFlowEdge['kind'],
): UxFlowEdge[] {
  return edges.filter((e) => e.from === from && (kind ? e.kind === kind : true))
}

/** Ordered block list for UI: default path with gate branches annotated. */
export function flattenFlowBlocks(flow: UxTestFlow): Array<{
  node: UxFlowNode
  branch?: 'when' | 'otherwise' | 'main'
  depth: number
}> {
  const nodes = flow.nodes ?? []
  const edges = flow.edges ?? []
  if (!nodes.length) return []
  const byId = nodeMap(nodes)
  const start = nodes.find((n) => n.kind === 'start')
  if (!start) return []
  const out: Array<{ node: UxFlowNode; branch?: 'when' | 'otherwise' | 'main'; depth: number }> =
    []
  const visit = (
    id: string,
    depth: number,
    branch: 'when' | 'otherwise' | 'main',
    seen: Set<string>,
  ) => {
    if (seen.has(id)) return
    seen.add(id)
    const node = byId.get(id)
    if (!node) return
    out.push({ node, branch, depth })
    if (node.kind === 'gate') {
      const when = outs(edges, id, 'when')[0]
      const other = outs(edges, id, 'otherwise')[0]
      if (when) visit(when.to, depth + 1, 'when', new Set(seen))
      if (other) visit(other.to, depth + 1, 'otherwise', new Set(seen))
      return
    }
    const next = outs(edges, id, 'then')[0] ?? outs(edges, id).find((e) => e.kind === 'then')
    if (next) visit(next.to, depth, branch, seen)
  }
  visit(start.id, 0, 'main', new Set())
  return out
}

/** Optimistic execution path: at gates follow `otherwise` (continue). */
export function defaultExecutionPath(flow: UxTestFlow): UxFlowNode[] {
  const nodes = flow.nodes ?? []
  const edges = flow.edges ?? []
  if (!nodes.length) return []
  const byId = nodeMap(nodes)
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
      id = outs(edges, id, 'otherwise')[0]?.to ?? null
      continue
    }
    id = outs(edges, id, 'then')[0]?.to ?? null
  }
  return path
}

/** Nodes after a gate on the `when` branch (not including the gate). */
export function whenBranchPath(flow: UxTestFlow, gateId: string): UxFlowNode[] {
  const nodes = flow.nodes ?? []
  const edges = flow.edges ?? []
  const byId = nodeMap(nodes)
  const first = outs(edges, gateId, 'when')[0]?.to
  if (!first) return []
  const path: UxFlowNode[] = []
  let id: string | null = first
  const seen = new Set<string>()
  while (id && !seen.has(id)) {
    seen.add(id)
    const n = byId.get(id)
    if (!n) break
    path.push(n)
    if (n.kind === 'gate') {
      id = outs(edges, id, 'otherwise')[0]?.to ?? null
      continue
    }
    id = outs(edges, id, 'then')[0]?.to ?? null
  }
  return path
}
