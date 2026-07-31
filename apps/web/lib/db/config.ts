/** Env-only helper — safe to import without pulling in `pg`. */
export function isProjectsDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim())
}
