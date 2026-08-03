/**
 * In-process native research job — crawl seed URL + LLM synthesize into fixture store.
 */

import { runAssistJson } from './assist'
import {
  storeAppendResearchEvent,
  storeCompleteResearchRun,
  storeFailResearchRun,
  storeMarkResearchRunning,
} from '../fixtures/research-runs'

async function fetchPageText(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { Accept: 'text/html,text/plain,*/*' },
      cache: 'no-store',
      signal: AbortSignal.timeout(12_000),
    })
    const text = await res.text()
    return text
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 12_000)
  } catch (error) {
    return `Fetch failed for ${url}: ${error instanceof Error ? error.message : 'unknown'}`
  }
}

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
      const pageText = await fetchPageText(seedUrl)
      storeAppendResearchEvent(runId, 'page_fetched', 'Fetched seed page', {
        url: seedUrl,
        pages_fetched: 1,
        chars: pageText.length,
      })
      storeAppendResearchEvent(runId, 'crawl_done', 'Crawl finished', { pages_fetched: 1 })
      storeAppendResearchEvent(runId, 'synthesize_start', 'Synthesizing summary')
      const packBlock = packContext?.trim()
        ? `${packContext.trim()}\n\n`
        : ''
      const assist = await runAssistJson<{
        title?: string
        summary?: string
        sections?: Array<{ heading?: string; body?: string }>
        citations?: Array<{ url?: string; note?: string }>
      }>('research.synthesize', {
        locale: 'en',
        context: `${packBlock}URL: ${seedUrl}\n\nExtract:\n${pageText.slice(0, 8000)}`,
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
            citations: [seedUrl],
          },
        ],
      }))
      if (assist.data.summary && !sections.length) {
        sections.push({
          key: 'overview',
          title: assist.data.title || 'Overview',
          claims: [{ text: assist.data.summary, citations: [seedUrl] }],
        })
      }
      storeAppendResearchEvent(runId, 'synthesize_done', 'Summary synthesized')
      storeCompleteResearchRun(runId, sections, {
        title: assist.data.title,
        citations: assist.data.citations,
        projectId,
      })
      storeAppendResearchEvent(runId, 'summary_saved', 'Summary saved')
    } catch (error) {
      storeFailResearchRun(
        runId,
        error instanceof Error ? error.message : 'Research job failed',
      )
    }
  })()
}
