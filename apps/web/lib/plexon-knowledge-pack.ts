/**
 * Collection Knowledge Pack client — AUDION → plexon-v3.
 * Spec: specs/domain/knowledge-pack-publish.md
 */

import {
  getPlexonAuthUrl,
  getPlexonServiceSecret,
  isPlexonAuthConfigured,
} from './runtime-config'
import { getPlexonContractHeaders } from './plexon-contract'
import { stripKnowledgeHtml } from './project-knowledge'
import type { ProjectKnowledgeChapter, ResearchSummarySection } from '@audion-v3/contracts'

export type KnowledgePackResponse = {
  platformProjectId: string
  revision: number
  facets: {
    profile?: { data?: Record<string, unknown> }
    competitive?: { data?: Record<string, unknown> }
    geo_context?: { data?: Record<string, unknown> }
    research_brief?: { data?: Record<string, unknown> }
  }
}

function knowledgePath(platformProjectId: string): string {
  const base = getPlexonAuthUrl().replace(/\/$/, '')
  return `${base}/api/platform/projects/${encodeURIComponent(platformProjectId)}/knowledge`
}

function facetPublishPath(platformProjectId: string, facetId: string): string {
  return `${knowledgePath(platformProjectId)}/facets/${encodeURIComponent(facetId)}/publish`
}

export function formatPackSeedContext(pack: KnowledgePackResponse | null): string {
  if (!pack) return ''
  const lines: string[] = []
  const profile = pack.facets.profile?.data ?? {}
  const competitive = pack.facets.competitive?.data ?? {}
  const geo = pack.facets.geo_context?.data ?? {}

  if (typeof profile.displayName === 'string' && profile.displayName.trim()) {
    lines.push(`Collection display name: ${profile.displayName.trim()}`)
  }
  if (typeof profile.industry === 'string' && profile.industry.trim()) {
    lines.push(`Industry: ${profile.industry.trim()}`)
  }
  if (typeof profile.tagline === 'string' && profile.tagline.trim()) {
    lines.push(`Tagline: ${profile.tagline.trim()}`)
  }
  if (typeof competitive.category === 'string' && competitive.category.trim()) {
    lines.push(`Category: ${competitive.category.trim()}`)
  }
  const rivals = Array.isArray(competitive.competitors)
    ? competitive.competitors
        .map((c) =>
          c && typeof c === 'object' && typeof (c as { host?: string }).host === 'string'
            ? (c as { host: string }).host
            : '',
        )
        .filter(Boolean)
    : []
  if (rivals.length) lines.push(`Known rivals: ${rivals.join(', ')}`)
  const themes = Array.isArray(geo.queryThemes)
    ? geo.queryThemes.filter((t): t is string => typeof t === 'string')
    : []
  if (themes.length) lines.push(`GEO themes: ${themes.join(', ')}`)
  const seeds = Array.isArray(geo.seedQueries)
    ? geo.seedQueries.filter((t): t is string => typeof t === 'string').slice(0, 8)
    : []
  if (seeds.length) lines.push(`GEO seed queries:\n- ${seeds.join('\n- ')}`)

  if (!lines.length) return ''
  return `Collection knowledge (shared brief):\n${lines.join('\n')}`
}

export async function fetchCollectionKnowledgePack(
  platformProjectId: string,
): Promise<KnowledgePackResponse | null> {
  const id = platformProjectId.trim()
  if (!id || !isPlexonAuthConfigured()) return null
  const secret = getPlexonServiceSecret()
  try {
    const res = await fetch(knowledgePath(id), {
      method: 'GET',
      headers: { ...getPlexonContractHeaders(secret) },
      cache: 'no-store',
    })
    if (!res.ok) {
      console.warn(
        '[AUDION-v3] knowledge pack GET failed:',
        res.status,
        await res.text().catch(() => ''),
      )
      return null
    }
    return (await res.json()) as KnowledgePackResponse
  } catch (e) {
    console.warn('[AUDION-v3] knowledge pack GET error:', e instanceof Error ? e.message : e)
    return null
  }
}

export function distillResearchBrief(opts: {
  chapters: ProjectKnowledgeChapter[]
  summarySections?: ResearchSummarySection[] | null
  sourceRunId?: string | null
  sourceProjectId: string
}): {
  summary: string | null
  sections: Array<{ id: string; title: string; plainText: string; bullets?: string[] }>
  topics: string[]
  sourceRunId: string | null
  sourceProjectId: string
} {
  const sections = opts.chapters
    .map((c) => ({
      id: c.id,
      title: c.title.trim() || 'Untitled',
      plainText: stripKnowledgeHtml(c.body).slice(0, 12_000),
    }))
    .filter((s) => s.plainText)
    .slice(0, 8)

  const summaryFromResearch =
    opts.summarySections
      ?.map((s) => {
        const claims = (s.claims ?? []).map((c) => c.text).filter(Boolean).join(' ')
        return claims || s.title
      })
      .filter(Boolean)
      .join(' ')
      .slice(0, 2000) || null

  const summary =
    summaryFromResearch ||
    sections
      .map((s) => s.plainText)
      .join(' ')
      .slice(0, 2000) ||
    null

  const topics = [
    ...new Set(
      (opts.summarySections ?? [])
        .map((s) => s.title.trim())
        .filter(Boolean)
        .slice(0, 24),
    ),
  ]

  return {
    summary,
    sections,
    topics,
    sourceRunId: opts.sourceRunId ?? null,
    sourceProjectId: opts.sourceProjectId,
  }
}

export async function publishResearchBriefToPack(opts: {
  platformProjectId: string
  expectedRevision: number
  data: ReturnType<typeof distillResearchBrief>
  runId?: string | null
}): Promise<{ ok: true; revision: number } | { ok: false; status: number; error: string }> {
  if (!isPlexonAuthConfigured()) {
    return { ok: false, status: 503, error: 'plexon_not_configured' }
  }
  const secret = getPlexonServiceSecret()
  try {
    const res = await fetch(facetPublishPath(opts.platformProjectId, 'research_brief'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getPlexonContractHeaders(secret),
      },
      body: JSON.stringify({
        mode: 'replace',
        expectedRevision: opts.expectedRevision,
        provenance: {
          actorType: 'service',
          productId: 'audion',
          runId: opts.runId ?? opts.data.sourceRunId,
          note: 'research distillate publish',
        },
        data: opts.data,
      }),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return { ok: false, status: res.status, error: text || res.statusText }
    }
    const body = (await res.json()) as { revision?: number }
    return { ok: true, revision: body.revision ?? opts.expectedRevision + 1 }
  } catch (e) {
    return {
      ok: false,
      status: 502,
      error: e instanceof Error ? e.message : 'publish_failed',
    }
  }
}
