# Chat document attachments

**Status:** Accepted — 2026-08-27 (DOCX) · Extended 2026-09-25 (PDF / PPTX / MD / TXT / XLSX)  
**Surfaces:** Persona chat only (`/chat`)  
**Contracts:** `ChatMessageDocument` · `ChatSendPayload.documentIds`  
**API:** `POST /api/chat/documents/upload`  
**Companion:** `specs/domain/chat-image-attachments.md` (Vision)  
**Legacy:** AUDION-v2 `/chat/documents/upload` + user-message merge

## Purpose

Users attach text-bearing briefs (Word, PDF, slides, plain text, spreadsheets) so the persona can ground answers in document text. Extracted text is merged into the **user** message (not the system prompt). Images stay on the Vision path — classification is by extension at upload time, not agent routing.

## Scope

Same as image attachments: persona authenticated only; no TG / guest.

## Supported formats

| Ext | Extract |
|-----|---------|
| `.docx` | mammoth plain text |
| `.pdf` | pdf-parse embedded text (scanned-PDF OCR deferred — follow-up) |
| `.pptx` | JSZip + slide XML `<a:t>` runs |
| `.md` / `.markdown` | UTF-8 with light markdown strip |
| `.txt` | UTF-8 plain |
| `.xlsx` / `.xls` | SheetJS → TSV per sheet (caps below) |

## Client

1. Pick supported files (multi, max **4** pending docs; images remain separate) via the document paperclip. Accept: `paths.chatDocumentUploadAccept`.
2. Composer hint: images → vision, documents → text.
3. `POST /api/chat/documents/upload` multipart field `file` → `{ documentId, filename, charCount, truncated }`.
4. Pending chips (filename) + remove.
5. Send: `documentIds` alongside optional `imageIds` / `message`. Empty message OK when ≥1 document **or** ≥1 image.

## Server

- Extract via `lib/chat/extract-*` dispatcher in `document-upload-store`.
- Max file **15 MB** (`paths.chatDocumentUploadMaxBytes`).
- Max extracted chars **200 000** (`paths.chatDocumentUploadMaxChars`); truncate with `\n\n[… truncated]`.
- Max **4** docs per turn (`paths.chatDocumentMaxPerTurn`).
- Durable store: Postgres `chat_documents` when `DATABASE_URL` set; else memory map.
- Orphan TTL **3600 s** (`paths.chatDocumentUploadTtlSeconds`).
- Filenames sanitized (basename only).
- PPTX: max **80** slides; per-slide XML soft-capped (~2 MB).
- Excel: max **10** sheets, **500** rows/sheet, **50** columns; empty sheets skipped.
- Reject unsupported types → 415; empty extract → 422; empty file → 400.

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
- Scanned-PDF OCR (planned follow-up; Plexon Assistant already has eng+deu tesseract path)
- Code interpreter / structured spreadsheet tooling (v1 = TSV text only)
- Knowledge/RAG / Storion ingest — see planned `specs/domain/chat-knowledge-rag.md` (project corpus; not this session merge path)
- TG / guest
- Blob/S3 object storage
