/**
 * Chat image upload store (persona attachments).
 * Postgres when DATABASE_URL set; else in-memory map.
 * Spec: specs/domain/chat-image-attachments.md
 */

import { randomUUID } from 'node:crypto'
import {
  dbGetChatImage,
  dbPutChatImage,
} from '../db/chat-attachments'
import { isProjectsDatabaseConfigured } from '../db/config'
import { paths } from '../paths'

type StoredImage = {
  dataUrl: string
  mimeType: string
  createdAtMs: number
  expiresAtMs: number
}

const store = new Map<string, StoredImage>()

function ttlMs(): number {
  return paths.chatImageUploadTtlSeconds * 1000
}

function purgeExpired(now = Date.now()): void {
  for (const [id, entry] of store) {
    if (entry.expiresAtMs <= now) store.delete(id)
  }
}

export function resetChatImageUploadStore(): void {
  store.clear()
}

export function chatImageUploadStoreSize(): number {
  purgeExpired()
  return store.size
}

function approxDecodedBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(',')
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl
  return Math.floor((b64.length * 3) / 4)
}

function mimeFromDataUrl(dataUrl: string): string {
  const match = /^data:([^;,]+)/i.exec(dataUrl)
  return match?.[1]?.toLowerCase() || 'image/png'
}

export type PutChatImageResult =
  | { ok: true; imageId: string }
  | { ok: false; error: string; status: number }

export async function putChatImage(dataUrl: string): Promise<PutChatImageResult> {
  purgeExpired()
  const trimmed = dataUrl.trim()
  if (!trimmed.startsWith('data:image/')) {
    return { ok: false, error: 'Expected a data:image/… URL', status: 400 }
  }
  if (approxDecodedBytes(trimmed) > paths.chatImageUploadMaxBytes) {
    return { ok: false, error: 'Image exceeds max upload size', status: 413 }
  }

  const imageId = randomUUID()
  const now = Date.now()
  const expiresAtMs = now + ttlMs()
  const mimeType = mimeFromDataUrl(trimmed)

  if (isProjectsDatabaseConfigured()) {
    await dbPutChatImage({
      id: imageId,
      dataUrl: trimmed,
      mimeType,
      expiresAt: new Date(expiresAtMs),
    })
    return { ok: true, imageId }
  }

  store.set(imageId, {
    dataUrl: trimmed,
    mimeType,
    createdAtMs: now,
    expiresAtMs,
  })
  return { ok: true, imageId }
}

export async function getChatImageDataUrl(imageId: string): Promise<string | null> {
  if (isProjectsDatabaseConfigured()) {
    const row = await dbGetChatImage(imageId)
    return row?.dataUrl ?? null
  }
  purgeExpired()
  return store.get(imageId)?.dataUrl ?? null
}

export type ResolveChatImagesResult =
  | { ok: true; images: { id: string; dataUrl: string }[] }
  | { ok: false; error: string }

/** Resolve upload IDs in order; fails if any id is missing/expired. */
export async function resolveChatImages(
  imageIds: string[],
): Promise<ResolveChatImagesResult> {
  const images: { id: string; dataUrl: string }[] = []
  for (const id of imageIds) {
    const dataUrl = await getChatImageDataUrl(id)
    if (!dataUrl) {
      return { ok: false, error: `Image not found or expired: ${id}` }
    }
    images.push({ id, dataUrl })
  }
  return { ok: true, images }
}
