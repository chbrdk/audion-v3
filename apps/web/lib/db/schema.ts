import {
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import type { ProjectKnowledgeChapter, ProjectMember } from '@audion-v3/contracts'

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
