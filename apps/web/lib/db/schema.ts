import {
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import type {
  ChatMessage,
  DocumentSource,
  JourneyPhase,
  KnowledgeEntry,
  ProjectKnowledgeChapter,
  ProjectMember,
  TargetGroupLinkedPersona,
  UxHypothesisTemplate,
  UxWaveEvaluation,
  UxWaveRunItem,
} from '@audion-v3/contracts'

/** AUDION-v3 product projects (Wave: Projects Postgres MVP). */
export const projects = pgTable(
  'projects',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    nameDe: text('name_de'),
    description: text('description'),
    companyContext: text('company_context'),
    status: text('status').notNull().default('draft'),
    platformProjectId: text('platform_project_id'),
    platformCompanyId: text('platform_company_id'),
    ownerPlexonUserId: text('owner_plexon_user_id'),
    members: jsonb('members').$type<ProjectMember[]>().notNull().default([]),
    knowledgeChapters: jsonb('knowledge_chapters')
      .$type<ProjectKnowledgeChapter[]>()
      .notNull()
      .default([]),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    platformProjectIdUnique: uniqueIndex('projects_platform_project_id_unique').on(
      t.platformProjectId,
    ),
  }),
)

export type ProjectRow = typeof projects.$inferSelect
export type ProjectInsert = typeof projects.$inferInsert

/** Persona list columns + jsonb payload for detail-only fields. */
export const personas = pgTable('personas', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  role: text('role').notNull().default('Persona'),
  projectId: text('project_id'),
  status: text('status').notNull().default('draft'),
  archetype: text('archetype'),
  avatarUrl: text('avatar_url'),
  /** Detail-only fields (age, bio, traits, knowledge, …). */
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull().default({}),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type PersonaRow = typeof personas.$inferSelect
export type PersonaInsert = typeof personas.$inferInsert

export const targetGroups = pgTable('target_groups', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  segment: text('segment').notNull().default('Segment'),
  description: text('description'),
  status: text('status').notNull().default('draft'),
  projectId: text('project_id'),
  linkedPersonaIds: jsonb('linked_persona_ids').$type<string[]>().notNull().default([]),
  knowledgeEntries: jsonb('knowledge_entries').$type<KnowledgeEntry[]>().notNull().default([]),
  documents: jsonb('documents').$type<DocumentSource[]>().notNull().default([]),
  /** Cached linked persona summaries (refreshed on write). */
  linkedPersonas: jsonb('linked_personas')
    .$type<TargetGroupLinkedPersona[]>()
    .notNull()
    .default([]),
  personaCount: integer('persona_count').notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type TargetGroupRow = typeof targetGroups.$inferSelect
export type TargetGroupInsert = typeof targetGroups.$inferInsert

export const journeys = pgTable('journeys', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  journeyType: text('journey_type').notNull().default('journey'),
  status: text('status').notNull().default('draft'),
  phaseCount: integer('phase_count').notNull().default(0),
  targetGroupId: text('target_group_id'),
  targetGroupName: text('target_group_name'),
  projectId: text('project_id'),
  description: text('description'),
  phases: jsonb('phases').$type<JourneyPhase[]>().notNull().default([]),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type JourneyRow = typeof journeys.$inferSelect
export type JourneyInsert = typeof journeys.$inferInsert

export const uxStudies = pgTable('ux_studies', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  status: text('status').notNull().default('draft'),
  projectId: text('project_id'),
  sourceGuide: text('source_guide'),
  targetUrlKey: text('target_url_key'),
  description: text('description'),
  hypothesisTemplates: jsonb('hypothesis_templates')
    .$type<UxHypothesisTemplate[]>()
    .notNull()
    .default([]),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type UxStudyRow = typeof uxStudies.$inferSelect
export type UxStudyInsert = typeof uxStudies.$inferInsert

export const uxWaves = pgTable('ux_waves', {
  id: text('id').primaryKey(),
  studyId: text('study_id').notNull(),
  waveKey: text('wave_key').notNull(),
  status: text('status').notNull().default('draft'),
  runs: jsonb('runs').$type<UxWaveRunItem[]>().notNull().default([]),
  evaluation: jsonb('evaluation').$type<UxWaveEvaluation | null>(),
  reportMarkdown: text('report_markdown'),
  reportUpdatedAt: timestamp('report_updated_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type UxWaveRow = typeof uxWaves.$inferSelect
export type UxWaveInsert = typeof uxWaves.$inferInsert

/** Chat conversation history (messages jsonb). */
export const chatConversations = pgTable('chat_conversations', {
  id: text('id').primaryKey(),
  personaId: text('persona_id').notNull(),
  personaName: text('persona_name'),
  projectId: text('project_id'),
  title: text('title'),
  preview: text('preview'),
  messages: jsonb('messages').$type<ChatMessage[]>().notNull().default([]),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type ChatConversationRow = typeof chatConversations.$inferSelect
export type ChatConversationInsert = typeof chatConversations.$inferInsert

/** Global assist template overrides (settings admin). */
export const assistPromptOverrides = pgTable('assist_prompt_overrides', {
  templateId: text('template_id').primaryKey(),
  system: text('system'),
  user: text('user'),
  prompt: text('prompt'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type AssistPromptOverrideRow = typeof assistPromptOverrides.$inferSelect
export type AssistPromptOverrideInsert = typeof assistPromptOverrides.$inferInsert

/** Per-persona chat system prompt overrides. */
export const personaChatPrompts = pgTable('persona_chat_prompts', {
  personaId: text('persona_id').primaryKey(),
  systemPrompt: text('system_prompt').notNull(),
  systemPromptDe: text('system_prompt_de'),
  templateVersion: text('template_version').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type PersonaChatPromptRow = typeof personaChatPrompts.$inferSelect
export type PersonaChatPromptInsert = typeof personaChatPrompts.$inferInsert

/** Browser UX journey run summaries (chat inspect / studies). */
export const personaUxJourneyRuns = pgTable(
  'persona_ux_journey_runs',
  {
    id: text('id').primaryKey(),
    personaId: text('persona_id').notNull(),
    jobId: text('job_id').notNull(),
    task: text('task').notNull(),
    siteUrl: text('site_url').notNull(),
    success: text('success'),
    stepsCount: integer('steps_count').notNull().default(0),
    scorecard: jsonb('scorecard').$type<Record<string, unknown> | null>(),
    /** Step transcript for convert after agent restart. */
    steps: jsonb('steps').$type<unknown[]>().notNull().default([]),
    derivedJourneyId: text('derived_journey_id'),
    projectId: text('project_id'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    personaJobUnique: uniqueIndex('persona_ux_journey_runs_persona_job_unique').on(
      t.personaId,
      t.jobId,
    ),
  }),
)

export type PersonaUxJourneyRunRow = typeof personaUxJourneyRuns.$inferSelect
export type PersonaUxJourneyRunInsert = typeof personaUxJourneyRuns.$inferInsert
