import { getCheckionBaseUrl } from './runtime-config'

export type CheckionSingleScanLinkParams = {
  checkionProjectId: string
  url: string
  platformProjectId?: string | null
  audionRunId?: string | null
  stepUrl?: string | null
  /** Override base (tests). */
  baseUrl?: string
}

/** Relative CHECKION launch path (same shape as checkion `paths.routes.scanLaunch`). */
export function buildCheckionSingleScanPath(params: {
  checkionProjectId: string
  url: string
  platformProjectId?: string | null
  audionRunId?: string | null
  stepUrl?: string | null
}): string {
  const qs = new URLSearchParams()
  qs.set('projectId', params.checkionProjectId)
  qs.set('mode', 'single')
  qs.set('url', params.url)
  if (params.platformProjectId?.trim()) {
    qs.set('platformProjectId', params.platformProjectId.trim())
  }
  if (params.audionRunId?.trim()) {
    qs.set('audionRunId', params.audionRunId.trim())
  }
  if (params.stepUrl?.trim()) {
    qs.set('stepUrl', params.stepUrl.trim())
  }
  return `/scan?${qs.toString()}`
}

/** Absolute CHECKION deep-link for single-page a11y scan. Null when base or project missing. */
export function buildCheckionSingleScanHref(
  params: CheckionSingleScanLinkParams,
): string | null {
  const base = (params.baseUrl ?? getCheckionBaseUrl()).replace(/\/$/, '')
  const projectId = params.checkionProjectId?.trim()
  const url = params.url?.trim()
  if (!base || !projectId || !url) return null
  if (!/^https?:\/\//i.test(url)) return null
  return `${base}${buildCheckionSingleScanPath({
    checkionProjectId: projectId,
    url,
    platformProjectId: params.platformProjectId,
    audionRunId: params.audionRunId,
    stepUrl: params.stepUrl,
  })}`
}

/** Prefer http(s) step target; otherwise landing / run URL. */
export function resolveScanUrl(candidates: Array<string | null | undefined>): string | null {
  for (const c of candidates) {
    const t = c?.trim()
    if (t && /^https?:\/\//i.test(t)) return t
  }
  return null
}
