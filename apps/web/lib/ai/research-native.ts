/**
 * In-process native research job — crawl seed URL + LLM synthesize into fixture store.
 */

import { runAssistJson } from './assist'
import { crawlResearchSeed } from './research-crawl'
import {
  storeAppendResearchEvent,
  storeCompleteResearchRun,
  storeFailResearchRun,
  storeMarkResearchRunning,
} from '../fixtures/research-runs'

export function scheduleNativeResearchJob(
  runId: string,
  projectId: string,
  seedUrl: string,
  packContext?: string,
): void {
  void (async () => {
    try {
      storeMarkResearchRunning(runId)
      storeAppendResearchEvent(runId, 'crawl_start', `Crawl ${seedUrl}`)
      const crawl = await crawlResearchSeed(seedUrl)
      for (const page of crawl.pages) {
        storeAppendResearchEvent(
          runId,
          'page_fetched',
          page.ok
            ? `Fetched ${page.url}${page.source === 'checkion_fetch_page' ? ' via CHECKION' : ''}`
            : page.blocked
              ? `Blocked ${page.url} (HTTP ${page.status})`
              : `Failed ${page.url}`,
          {
            url: page.url,
            status: page.status,
            blocked: page.blocked,
            chars: page.text.length,
            error: page.error,
            source: page.source,
          },
        )
      }
      storeAppendResearchEvent(runId, 'crawl_done', 'Crawl finished', {
        pages_fetched: crawl.pages.length,
        pages_ok: crawl.fetchedOk,
        pages_blocked: crawl.blockedCount,
      })
      storeAppendResearchEvent(runId, 'synthesize_start', 'Synthesizing summary')
      const packBlock = packContext?.trim()
        ? `${packContext.trim()}\n\n`
        : ''
      const citationUrls = crawl.pages.filter((p) => p.ok).map((p) => p.url)
      const primaryCitations = citationUrls.length ? citationUrls : [seedUrl]
      const assist = await runAssistJson<{
        title?: string
        summary?: string
        sections?: Array<{ heading?: string; body?: string }>
        citations?: Array<{ url?: string; note?: string }>
      }>('research.synthesize', {
        locale: 'en',
        context: `${packBlock}SEED URL: ${seedUrl}
PAGES OK: ${crawl.fetchedOk}
PAGES BLOCKED: ${crawl.blockedCount}

Extracts:
${crawl.combinedText.slice(0, 10_000)}`,
      })
      if ('error' in assist) {
        storeFailResearchRun(runId, assist.detail || assist.error)
        return
      }
      const sections = (assist.data.sections ?? []).map((s, i) => ({
        key: `section_${i + 1}`,
        title: s.heading?.trim() || `Section ${i + 1}`,
        claims: [
          {
            text: s.body?.trim() || assist.data.summary || 'No claim',
            citations: primaryCitations,
          },
        ],
      }))
      if (assist.data.summary && !sections.length) {
        sections.push({
          key: 'overview',
          title: assist.data.title || 'Overview',
          claims: [{ text: assist.data.summary, citations: primaryCitations }],
        })
      }
      storeAppendResearchEvent(runId, 'synthesize_done', 'Summary synthesized')
      storeCompleteResearchRun(runId, sections, {
        title: assist.data.title,
        citations: assist.data.citations,
        projectId,
      })
      storeAppendResearchEvent(runId, 'summary_saved', 'Summary saved')
      const { scheduleResearchBriefAutosync } = await import('../knowledge-pack-autosync')
      scheduleResearchBriefAutosync(projectId)
    } catch (error) {
      storeFailResearchRun(
        runId,
        error instanceof Error ? error.message : 'Research job failed',
      )
    }
  })()
}
