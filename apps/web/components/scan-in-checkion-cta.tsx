'use client'

import { useEffect, useState } from 'react'
import type { ProjectDetail } from '@audion-v3/contracts'
import { buildCheckionSingleScanHref, resolveScanUrl } from '../lib/checkion-links'
import { paths } from '../lib/paths'

/**
 * Optional CTA: open CHECKION single-page scan for an explored URL.
 * Hidden when CHECKION base or Collection binding is missing (explore still works).
 */
export function ScanInCheckionCta({
  url,
  stepUrl,
  audionProjectId,
  audionRunId,
  checkionProjectId: knownCheckionId,
  platformProjectId: knownPlatformId,
  className = 'audion-link',
}: {
  url?: string | null
  stepUrl?: string | null
  audionProjectId?: string | null
  audionRunId?: string | null
  checkionProjectId?: string | null
  platformProjectId?: string | null
  className?: string
}) {
  const [binding, setBinding] = useState<{
    checkionProjectId?: string | null
    platformProjectId?: string | null
  }>(() => ({
    checkionProjectId: knownCheckionId,
    platformProjectId: knownPlatformId,
  }))

  useEffect(() => {
    setBinding({
      checkionProjectId: knownCheckionId,
      platformProjectId: knownPlatformId,
    })
  }, [knownCheckionId, knownPlatformId])

  useEffect(() => {
    if (knownCheckionId || !audionProjectId) return
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch(paths.routes.apiProjectDetail(audionProjectId))
        if (!res.ok || cancelled) return
        const project = (await res.json()) as ProjectDetail
        if (cancelled) return
        setBinding({
          checkionProjectId: project.checkionProjectId ?? null,
          platformProjectId: project.platformProjectId ?? knownPlatformId ?? null,
        })
      } catch {
        /* optional CTA */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [audionProjectId, knownCheckionId, knownPlatformId])

  const scanUrl = resolveScanUrl([stepUrl, url])
  const href =
    scanUrl && binding.checkionProjectId
      ? buildCheckionSingleScanHref({
          checkionProjectId: binding.checkionProjectId,
          url: scanUrl,
          platformProjectId: binding.platformProjectId,
          audionRunId,
          stepUrl: stepUrl ?? scanUrl,
        })
      : null

  if (!href) return null

  return (
    <a
      className={className}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title="Open CHECKION single-page accessibility scan for this URL"
    >
      Scan in CHECKION
    </a>
  )
}
