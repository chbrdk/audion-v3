import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  buildCheckionSingleScanHref,
  buildCheckionSingleScanPath,
  resolveScanUrl,
} from '../lib/checkion-links'
import { paths } from '../lib/paths'

describe('CHECKION single-scan deep-link helpers', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('builds /scan path with mode=single and encoded url', () => {
    expect(
      buildCheckionSingleScanPath({
        checkionProjectId: 'proj-check-1',
        url: 'https://www.bosch-ebike.com/de/',
        platformProjectId: 'col-1',
        audionRunId: 'job-9',
        stepUrl: 'https://www.bosch-ebike.com/de/service',
      }),
    ).toBe(
      '/scan?projectId=proj-check-1&mode=single&url=https%3A%2F%2Fwww.bosch-ebike.com%2Fde%2F&platformProjectId=col-1&audionRunId=job-9&stepUrl=https%3A%2F%2Fwww.bosch-ebike.com%2Fde%2Fservice',
    )
  })

  it('builds absolute href from base override', () => {
    const href = buildCheckionSingleScanHref({
      checkionProjectId: 'proj-1',
      url: 'https://example.com/page',
      baseUrl: 'https://checkion-v3.projects-a.plygrnd.tech',
      audionRunId: 'wave-1',
    })
    expect(href).toBe(
      'https://checkion-v3.projects-a.plygrnd.tech/scan?projectId=proj-1&mode=single&url=https%3A%2F%2Fexample.com%2Fpage&audionRunId=wave-1',
    )
  })

  it('returns null without base, project, or http(s) url', () => {
    expect(
      buildCheckionSingleScanHref({
        checkionProjectId: 'proj-1',
        url: 'https://example.com',
        baseUrl: '',
      }),
    ).toBeNull()
    expect(
      buildCheckionSingleScanHref({
        checkionProjectId: '',
        url: 'https://example.com',
        baseUrl: paths.checkionStagingBaseUrl,
      }),
    ).toBeNull()
    expect(
      buildCheckionSingleScanHref({
        checkionProjectId: 'proj-1',
        url: 'not-a-url',
        baseUrl: paths.checkionStagingBaseUrl,
      }),
    ).toBeNull()
  })

  it('resolves first http(s) candidate', () => {
    expect(resolveScanUrl([null, '  ', 'ftp://x', 'https://ok.example/'])).toBe(
      'https://ok.example/',
    )
    expect(resolveScanUrl([])).toBeNull()
  })

  it('reads NEXT_PUBLIC_CHECKION_BASE_URL via runtime helper', async () => {
    vi.stubEnv('NEXT_PUBLIC_CHECKION_BASE_URL', 'https://checkion.test')
    vi.resetModules()
    const { getCheckionBaseUrl, isCheckionConfigured } = await import('../lib/runtime-config')
    expect(getCheckionBaseUrl()).toBe('https://checkion.test')
    expect(isCheckionConfigured()).toBe(true)
  })
})
