import { describe, expect, it } from 'vitest'
import {
  correlateFindabilityRun,
  matchesSuccessPattern,
  waveRunToFindabilitySnapshot,
} from '../lib/lab-archetype-correlate'
import { createStudyFromScenarioPack, getScenarioPack, resolveScenarioPackUrl } from '../lib/scenario-packs'
import { paths } from '../lib/paths'
import { resetUxStudyStore } from '../lib/fixtures/ux-study-store'
import type { UxWaveRunItem } from '@audion-v3/contracts'

describe('lab-archetype-correlate (generic findability)', () => {
  it('matchesSuccessPattern for url / title / goal_text / honest_abandon', () => {
    expect(
      matchesSuccessPattern({ kind: 'url_match', pattern: 'example\\.com' }, { url: 'https://example.com/' }),
    ).toBe(true)
    expect(
      matchesSuccessPattern({ kind: 'url_match', pattern: 'example\\.com' }, { url: 'https://example.org/' }),
    ).toBe(false)
    expect(
      matchesSuccessPattern({ kind: 'title_match', pattern: 'Example Domain' }, { title: 'Example Domain' }),
    ).toBe(true)
    expect(
      matchesSuccessPattern({ kind: 'goal_text', pattern: 'reached target' }, { blob: 'I reached target OK' }),
    ).toBe(true)
    expect(
      matchesSuccessPattern({ kind: 'honest_abandon', pattern: null }, { blob: 'Ich breche ab — kein Link.' }),
    ).toBe(true)
  })

  it('correlates example.com landing as closer without brand strings', () => {
    const result = correlateFindabilityRun(
      {
        runKey: 'Template-findability-home-to-target',
        steps: 3,
        maxSteps: 8,
        finalUrl: 'https://example.com/',
        finalTitle: 'Example Domain',
        finding: 'Found example.com via link',
        narrativeBlob: 'Started on example.org, followed a link to example.com.',
        goalReached: true,
        blockers: [],
        deeplinkCheat: false,
        startUrl: 'https://example.org/',
      },
      {
        runKey: 'Template-findability-home-to-target',
        maxStepsCap: 8,
        closerScoreThreshold: 0.65,
        successCriteria: { kind: 'url_match', pattern: 'example\\.com' },
        requireStartedOffTarget: true,
      },
    )
    expect(result.closer).toBe(true)
    expect(result.checks.find((c) => c.id === 'url_matches')?.pass).toBe(true)
    expect(result.checks.find((c) => c.id === 'no_deeplink_cheat')?.pass).toBe(true)
  })

  it('fails closer when deeplinkCheat is true', () => {
    const result = correlateFindabilityRun(
      {
        runKey: 'Template-findability-home-to-target',
        steps: 1,
        maxSteps: 8,
        finalUrl: 'https://example.com/',
        finalTitle: 'Example Domain',
        finding: 'navigated',
        narrativeBlob: 'go_to_url',
        goalReached: true,
        blockers: [],
        deeplinkCheat: true,
        startUrl: 'https://example.org/',
      },
      {
        maxStepsCap: 8,
        closerScoreThreshold: 0.65,
        successCriteria: { kind: 'url_match', pattern: 'example\\.com' },
      },
    )
    expect(result.closer).toBe(false)
    expect(result.checks.find((c) => c.id === 'no_deeplink_cheat')?.pass).toBe(false)
  })

  it('maps wave run → findability snapshot', () => {
    const run: UxWaveRunItem = {
      id: 'run-t1',
      runKey: 'Template-findability-home-to-target',
      leitfadenBlock: 'Template',
      personaId: paths.personaLabImpatientPersonaId,
      personaName: 'Alex',
      segment: 'owner_upgrade',
      url: paths.labTemplateFindabilityStartUrl,
      task: 'find',
      maxSteps: 8,
      jobId: 'j1',
      agentStatus: 'complete',
      agentSuccess: true,
      taskCompleted: true,
      validEvidence: true,
      validEvidenceCaveat: null,
      blockers: [],
      steps: 2,
      frictionScore: 4,
      personaFitScore: 3,
      goalReached: true,
      finding: 'ok',
      categories: {},
      finalUrl: paths.labTemplateFindabilityTargetUrl,
      finalTitle: 'Example Domain',
      deeplinkCheat: false,
    }
    const snap = waveRunToFindabilitySnapshot(run)
    expect(snap.startUrl).toBe(paths.labTemplateFindabilityStartUrl)
    expect(
      correlateFindabilityRun(snap, {
        maxStepsCap: 8,
        closerScoreThreshold: 0.65,
        successCriteria: { kind: 'url_match', pattern: 'example\\.com' },
      }).closer,
    ).toBe(true)
  })
})

describe('lab template findability pack', () => {
  it('registers non-Bosch template with archetype and URL keys', () => {
    const pack = getScenarioPack(paths.labTemplateFindabilityPackId)
    expect(pack).not.toBeNull()
    expect(pack!.archetype).toBe('findability')
    expect(pack!.domainProfileId).toBe('core')
    expect(pack!.successCriteria).toEqual({ kind: 'url_match', pattern: 'example\\.com' })
    expect(pack!.softScoreKeys).toContain('findability')
    expect(pack!.softScoreKeys).not.toContain('Q4_auffindbarkeit')
    expect(resolveScenarioPackUrl(paths.labTemplateFindabilityStartUrlKey)).toBe(
      paths.labTemplateFindabilityStartUrl,
    )
    expect(resolveScenarioPackUrl(paths.labTemplateFindabilityTargetUrlKey)).toBe(
      paths.labTemplateFindabilityTargetUrl,
    )
  })

  it('seeds study from template pack without Bosch URL strings', async () => {
    resetUxStudyStore()
    const created = await createStudyFromScenarioPack({
      packId: paths.labTemplateFindabilityPackId,
      waveKey: 'template-unit',
    })
    expect(created).not.toBeNull()
    expect(created!.wave.runs).toHaveLength(1)
    expect(created!.wave.runs[0]?.url).toBe(paths.labTemplateFindabilityStartUrl)
    expect(created!.study.targetUrlKey).toBe(paths.labTemplateFindabilityStartUrlKey)
    expect(created!.wave.runs[0]?.url).not.toMatch(/bosch-ebike|produktkombinationen/i)
    expect(created!.study.targetUrlKey).not.toMatch(/bosch/i)
  })
})
