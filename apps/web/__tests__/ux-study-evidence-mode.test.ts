/**
 * Suite UC3 — evidence mode when Journey Agent URL is missing.
 */
import { describe, expect, it } from 'vitest'
import { getUxStudyEvidenceMode, isUxJourneyAgentConfigured } from '../lib/ux-journey-agent-client'

describe('ux study evidence mode', () => {
  it('exposes live vs fixture from agent URL config', () => {
    const configured = isUxJourneyAgentConfigured()
    expect(getUxStudyEvidenceMode()).toBe(configured ? 'live' : 'fixture')
  })
})
