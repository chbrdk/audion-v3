import {
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import type {
  DocumentSource,
  KnowledgeEntry,
  ProjectKnowledgeChapter,
  ProjectMember,
  TargetGroupLinkedPersona,
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
