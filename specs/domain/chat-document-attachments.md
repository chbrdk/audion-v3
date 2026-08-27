# Chat document attachments (DOCX)

**Status:** Accepted — 2026-08-27  
**Surfaces:** Persona chat only (`/chat`)  
**Contracts:** `ChatMessageDocument` · `ChatSendPayload.documentIds`  
**API:** `POST /api/chat/documents/upload`  
**Legacy:** AUDION-v2 `/chat/documents/upload` + user-message merge

## Purpose

Users attach Word (`.docx`) briefs so the persona can ground answers in document text. Extracted text is merged into the **user** message (not the system prompt).

## Scope

Same as image attachments: persona authenticated only; no TG / guest.

## Client

1. Pick `.docx` (multi allowed).
2. `POST /api/chat/documents/upload` multipart field `file` → `{ documentId, filename, charCount, truncated }`.
3. Pending chips (filename) + remove.
4. Send: `documentIds` alongside optional `imageIds` / `message`.

## Server

- Extract with **mammoth** (paragraphs + tables as plain text).
- Max file **15 MB** (`paths.chatDocumentUploadMaxBytes`).
- Max extracted chars **200 000** (`paths.chatDocumentUploadMaxChars`); truncate with `\n\n[… truncated]`.
- Durable store: Postgres `chat_documents` when `DATABASE_URL` set; else memory map.
- Orphan TTL **3600 s** (`paths.chatDocumentUploadTtlSeconds`).
- Reject non-`.docx` → 415.

## Merge (user message)

```
### Attached document: {filename}

{extracted text}
---
{user content}
```

Multiple docs: blocks joined with `\n\n---\n\n`. Merge runs **before** vision content parts. Inspect URL heuristics use the raw user `message` (without doc prefix).

## Persist

User `ChatMessage` stores `documents: { id, filename, charCount }[]` for UI chips (no full text dump in the transcript column).

## Out of scope

- Legacy `.doc`
- Knowledge/RAG / Storion ingest
- TG / guest
