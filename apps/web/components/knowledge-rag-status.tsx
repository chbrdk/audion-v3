'use client'

import { useCallback, useEffect, useState } from 'react'
import type { KnowledgeRagDocumentStatus } from '@audion-v3/contracts'
import { paths } from '../lib/paths'
import { useT } from '../lib/user-prefs'

export type KnowledgeRagStatusMap = Record<
  string,
  { status: KnowledgeRagDocumentStatus; chunkCount: number }
>

/** Load RAG index status for a project, keyed by sourceRef. */
export function useKnowledgeRagStatus(projectId: string | null | undefined) {
  const [bySourceRef, setBySourceRef] = useState<KnowledgeRagStatusMap>({})
  const [loaded, setLoaded] = useState(false)

  const refresh = useCallback(async () => {
    const pid = projectId?.trim()
    if (!pid) {
      setBySourceRef({})
      setLoaded(true)
      return
    }
    try {
      const res = await fetch(
        `${paths.routes.apiKnowledgeRagDocuments}?projectId=${encodeURIComponent(pid)}`,
      )
      if (!res.ok) {
        setBySourceRef({})
        return
      }
      const body = (await res.json()) as {
        items?: Array<{
          sourceRef: string | null
          status: KnowledgeRagDocumentStatus
          chunkCount: number
        }>
      }
      const next: KnowledgeRagStatusMap = {}
      for (const item of body.items ?? []) {
        if (!item.sourceRef) continue
        next[item.sourceRef] = { status: item.status, chunkCount: item.chunkCount }
      }
      setBySourceRef(next)
    } catch {
      setBySourceRef({})
    } finally {
      setLoaded(true)
    }
  }, [projectId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { bySourceRef, loaded, refresh }
}

export function KnowledgeRagStatusBadge({
  status,
}: {
  status: KnowledgeRagDocumentStatus | null | undefined
}) {
  const t = useT()
  if (!status) return null
  const label =
    status === 'ready'
      ? t('knowledge.ragReady')
      : status === 'pending'
        ? t('knowledge.ragPending')
        : t('knowledge.ragFailed')
  return (
    <span
      className={[
        'audion-knowledge-rag-badge',
        status === 'ready' ? 'is-ready' : status === 'pending' ? 'is-pending' : 'is-failed',
      ].join(' ')}
      title={t('knowledge.ragHint')}
    >
      {label}
    </span>
  )
}
