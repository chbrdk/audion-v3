/**
 * Easy Setup — create Project + Target Group + Persona from a customer brief.
 * Native AI when shouldPreferAiNative(); else deterministic stub seeds.
 */

import type {
  ProjectCreateOptions,
  ProjectEasySetupRequest,
  ProjectEasySetupResponse,
} from '@audion-v3/contracts'
import { runAssist, runAssistJson } from './ai/assist'
import {
  storeApplyPlatformBinding,
  storeCreateProject,
  storeProjectDetail,
} from './fixtures/project-store'
import { storeCreatePersona } from './fixtures/persona-store'
import {
  storeCreateTargetGroup,
  storePatchTargetGroup,
  storeTargetGroupDetail,
} from './fixtures/target-group-store'
import { registerAudionProjectOnPlexon } from './plexon-project-origin'
import { isPlexonAuthConfigured, shouldPreferAiNative } from './runtime-config'
import { fetchWebsitePlainText, normalizePublicHttpUrl } from './easy-setup-url'

export type EasySetupError = { error: string; status: number }

type TgSeed = { name: string; segment: string; description: string }
type PersonaSeed = { name: string; role: string; bio: string; archetype?: string; interests?: string[] }

function stubTargetGroup(customer: string, about: string): TgSeed {
  const short = about.trim().slice(0, 160) || `Core audience for ${customer}`
  return {
    name: `${customer} primary audience`,
    segment: 'Primary buyers',
    description: short,
  }
}

function stubPersona(customer: string, tg: TgSeed): PersonaSeed {
  return {
    name: `${customer} persona`,
    role: 'Decision maker',
    bio: `Representative of ${tg.name}. ${tg.description}`.slice(0, 400),
    archetype: tg.segment,
    interests: [tg.segment],
  }
}

async function resolveTargetGroupSeed(
  contextText: string,
  customer: string,
  about: string,
  locale: string,
): Promise<{ seed: TgSeed; stubbed: boolean }> {
  if (!shouldPreferAiNative()) {
    return { seed: stubTargetGroup(customer, about), stubbed: true }
  }
  const assist = await runAssist('project.suggest_target_groups', {
    locale,
    max_items: '1',
    context: contextText,
  })
  if ('error' in assist || !assist.suggestions.length) {
    return { seed: stubTargetGroup(customer, about), stubbed: true }
  }
  const first = assist.suggestions[0]!
  return {
    seed: {
      name: first.title.trim() || stubTargetGroup(customer, about).name,
      segment: first.subtitle?.trim() || 'Primary buyers',
      description:
        first.description?.trim() || about.trim().slice(0, 280) || `Audience for ${customer}`,
    },
    stubbed: false,
  }
}

async function resolvePersonaSeed(
  tg: TgSeed,
  customer: string,
  locale: string,
  alreadyStubbed: boolean,
): Promise<{ seed: PersonaSeed; stubbed: boolean }> {
  if (alreadyStubbed || !shouldPreferAiNative()) {
    return { seed: stubPersona(customer, tg), stubbed: true }
  }
  const assist = await runAssistJson<{
    personas?: Array<{
      name?: string
      role?: string
      archetype?: string
      bio?: string
      interests?: string[]
    }>
  }>('persona.generate_batch', {
    locale,
    max_items: '1',
    context: `Name: ${tg.name}\nSegment: ${tg.segment}\nDescription: ${tg.description}`,
  })
  if ('error' in assist) {
    return { seed: stubPersona(customer, tg), stubbed: true }
  }
  const draft = assist.data.personas?.[0]
  if (!draft?.name?.trim()) {
    return { seed: stubPersona(customer, tg), stubbed: true }
  }
  return {
    seed: {
      name: draft.name.trim(),
      role: draft.role?.trim() || 'Audience member',
      bio: draft.bio?.trim() || `Generated for ${tg.name}`,
      archetype: draft.archetype?.trim() || tg.segment,
      interests: draft.interests?.length ? draft.interests : [tg.segment],
    },
    stubbed: false,
  }
}

export async function runEasySetup(
  payload: ProjectEasySetupRequest,
  owner: ProjectCreateOptions = {},
): Promise<ProjectEasySetupResponse | EasySetupError> {
  const customer = payload.customer_name?.trim() || ''
  const about = payload.about?.trim() || ''
  if (!customer) {
    return { error: 'customer_name is required', status: 400 }
  }
  if (!about) {
    return { error: 'about is required', status: 400 }
  }

  let websiteExcerptIncluded = false
  let websiteAppendix = ''
  const rawUrl = payload.website_url?.trim()
  if (rawUrl) {
    const normalized = normalizePublicHttpUrl(rawUrl)
    if ('error' in normalized) {
      return { error: normalized.error, status: 400 }
    }
    if ('url' in normalized) {
      const { text } = await fetchWebsitePlainText(normalized.url)
      if (text) {
        websiteAppendix = `\n\n---\nSource (public page text): ${normalized.url}\n${text}`
        websiteExcerptIncluded = true
      }
    }
  }

  const projectName = (payload.project_name?.trim() || customer).trim()
  const description = `Customer / brand: ${customer}\n\n${about}`.trim()
  const companyContext = `${about}${websiteAppendix}`.trim()
  const locale = payload.output_locale?.trim() || 'en'

  let project = await storeCreateProject(
    {
      name: projectName,
      description,
      companyContext,
      status: 'draft',
    },
    owner,
  )

  if (isPlexonAuthConfigured()) {
    const origin = await registerAudionProjectOnPlexon({
      audionProjectId: project.id,
      name: project.name,
      ownerPlexonUserId: owner.ownerPlexonUserId,
      platformCompanyId: owner.platformCompanyId,
    })
    if (origin?.platformProjectId) {
      project =
        (await storeApplyPlatformBinding(project.id, {
          platformProjectId: origin.platformProjectId,
          checkionProjectId: origin.checkionProjectId ?? null,
          platformCompanyId:
            origin.platformCompanyId ?? owner.platformCompanyId ?? null,
          ownerPlexonUserId:
            origin.ownerPlexonUserId ?? owner.ownerPlexonUserId ?? null,
        })) ?? project
      const { scheduleResearchBriefAutosync } = await import('./knowledge-pack-autosync')
      scheduleResearchBriefAutosync(project.id)
    }
  }

  const contextText = [description, companyContext].filter(Boolean).join('\n\n')
  const { seed: tgSeed, stubbed: tgStubbed } = await resolveTargetGroupSeed(
    contextText,
    customer,
    about,
    locale,
  )
  const { seed: personaSeed, stubbed: personaStubbed } = await resolvePersonaSeed(
    tgSeed,
    customer,
    locale,
    tgStubbed,
  )
  const stubbed = tgStubbed || personaStubbed

  let targetGroup = await storeCreateTargetGroup({
    name: tgSeed.name,
    segment: tgSeed.segment,
    description: tgSeed.description,
    status: 'draft',
    projectId: project.id,
  })

  const persona = await storeCreatePersona({
    name: personaSeed.name,
    role: personaSeed.role,
    status: 'draft',
    archetype: personaSeed.archetype ?? tgSeed.segment,
    bio: personaSeed.bio,
    projectId: project.id,
    interests: personaSeed.interests ?? [tgSeed.segment],
  })

  targetGroup =
    (await storePatchTargetGroup(targetGroup.id, {
      linkedPersonaIds: [persona.id],
    })) ?? targetGroup

  const refreshedProject = (await storeProjectDetail(project.id)) ?? project
  const refreshedTg = (await storeTargetGroupDetail(targetGroup.id)) ?? targetGroup

  return {
    stubbed,
    project: refreshedProject,
    targetGroup: refreshedTg,
    persona,
    websiteExcerptIncluded,
  }
}
