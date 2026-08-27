import { sql } from 'drizzle-orm'
import { getDb, isProjectsDatabaseConfigured } from './client'

let ensured = false

/** Create chat attachment tables when DATABASE_URL is set (idempotent). */
export async function ensureChatAttachmentsSchema(): Promise<void> {
  if (!isProjectsDatabaseConfigured()) return
  if (ensured) return
  const db = getDb()
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS chat_images (
      id text PRIMARY KEY,
      data_url text NOT NULL,
      mime_type text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      expires_at timestamptz NOT NULL
    )
  `)
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS chat_documents (
      id text PRIMARY KEY,
      filename text NOT NULL,
      extracted_text text NOT NULL,
      char_count integer NOT NULL,
      truncated integer NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now(),
      expires_at timestamptz NOT NULL
    )
  `)
  ensured = true
}

export async function dbPutChatImage(row: {
  id: string
  dataUrl: string
  mimeType: string
  expiresAt: Date
}): Promise<void> {
  await ensureChatAttachmentsSchema()
  const db = getDb()
  await db.execute(sql`
    INSERT INTO chat_images (id, data_url, mime_type, expires_at)
    VALUES (${row.id}, ${row.dataUrl}, ${row.mimeType}, ${row.expiresAt.toISOString()}::timestamptz)
    ON CONFLICT (id) DO UPDATE SET
      data_url = EXCLUDED.data_url,
      mime_type = EXCLUDED.mime_type,
      expires_at = EXCLUDED.expires_at
  `)
  await db.execute(sql`DELETE FROM chat_images WHERE expires_at < now()`)
}

export async function dbGetChatImage(
  id: string,
): Promise<{ dataUrl: string; mimeType: string } | null> {
  await ensureChatAttachmentsSchema()
  const db = getDb()
  const result = await db.execute(sql`
    SELECT data_url, mime_type
    FROM chat_images
    WHERE id = ${id} AND expires_at > now()
    LIMIT 1
  `)
  const row = result.rows[0] as { data_url?: string; mime_type?: string } | undefined
  if (!row?.data_url || !row.mime_type) return null
  return { dataUrl: row.data_url, mimeType: row.mime_type }
}

export async function dbPutChatDocument(row: {
  id: string
  filename: string
  extractedText: string
  charCount: number
  truncated: boolean
  expiresAt: Date
}): Promise<void> {
  await ensureChatAttachmentsSchema()
  const db = getDb()
  await db.execute(sql`
    INSERT INTO chat_documents (id, filename, extracted_text, char_count, truncated, expires_at)
    VALUES (
      ${row.id},
      ${row.filename},
      ${row.extractedText},
      ${row.charCount},
      ${row.truncated ? 1 : 0},
      ${row.expiresAt.toISOString()}::timestamptz
    )
    ON CONFLICT (id) DO UPDATE SET
      filename = EXCLUDED.filename,
      extracted_text = EXCLUDED.extracted_text,
      char_count = EXCLUDED.char_count,
      truncated = EXCLUDED.truncated,
      expires_at = EXCLUDED.expires_at
  `)
  await db.execute(sql`DELETE FROM chat_documents WHERE expires_at < now()`)
}

export async function dbGetChatDocument(id: string): Promise<{
  filename: string
  extractedText: string
  charCount: number
  truncated: boolean
} | null> {
  await ensureChatAttachmentsSchema()
  const db = getDb()
  const result = await db.execute(sql`
    SELECT filename, extracted_text, char_count, truncated
    FROM chat_documents
    WHERE id = ${id} AND expires_at > now()
    LIMIT 1
  `)
  const row = result.rows[0] as
    | {
        filename?: string
        extracted_text?: string
        char_count?: number
        truncated?: number
      }
    | undefined
  if (!row?.filename || typeof row.extracted_text !== 'string') return null
  return {
    filename: row.filename,
    extractedText: row.extracted_text,
    charCount: Number(row.char_count ?? 0),
    truncated: Number(row.truncated ?? 0) === 1,
  }
}
