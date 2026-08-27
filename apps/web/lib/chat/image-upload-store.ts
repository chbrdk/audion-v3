/**
 * Temporary chat image upload store (persona attachments).
 * Spec: specs/domain/chat-image-attachments.md
 */

import { randomUUID } from 'node:crypto'
import { paths } from '../paths'

type StoredImage = {
  dataUrl: string
  createdAtMs: number
}

const store = new Map<string, StoredImage>()

function purgeExpired(now = Date.now()): void {
  const ttlMs = paths.chatImageUploadTtlSeconds * 1000
  for (const [id, entry] of store) {
    if (now - entry.createdAtMs > ttlMs) store.delete(id)
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

export type PutChatImageResult =
  | { ok: true; imageId: string }
  | { ok: false; error: string; status: number }

export function putChatImage(dataUrl: string): PutChatImageResult {
  purgeExpired()
  const trimmed = dataUrl.trim()
  if (!trimmed.startsWith('data:image/')) {
    return { ok: false, error: 'Expected a data:image/… URL', status: 400 }
  }
  if (approxDecodedBytes(trimmed) > paths.chatImageUploadMaxBytes) {
    return { ok: false, error: 'Image exceeds max upload size', status: 413 }
  }
  const imageId = randomUUID()
  store.set(imageId, { dataUrl: trimmed, createdAtMs: Date.now() })
  return { ok: true, imageId }
}

export function getChatImageDataUrl(imageId: string): string | null {
  purgeExpired()
  return store.get(imageId)?.dataUrl ?? null
}

export type ResolveChatImagesResult =
  | { ok: true; images: { id: string; dataUrl: string }[] }
  | { ok: false; error: string }

/** Resolve upload IDs in order; fails if any id is missing/expired. */
export function resolveChatImages(imageIds: string[]): ResolveChatImagesResult {
  purgeExpired()
  const images: { id: string; dataUrl: string }[] = []
  for (const id of imageIds) {
    const dataUrl = store.get(id)?.dataUrl
    if (!dataUrl) {
      return { ok: false, error: `Image not found or expired: ${id}` }
    }
    images.push({ id, dataUrl })
  }
  return { ok: true, images }
}
