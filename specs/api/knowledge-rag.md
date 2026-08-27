# Knowledge RAG API (Audion-local)

**Status:** Accepted — implemented (phase 1) — 2026-08-27  
**Date:** 2026-08-27  
**Domain:** `specs/domain/chat-knowledge-rag.md`  
**Contracts:** `@audion-v3/contracts` — `KnowledgeRagSource`, ingest/retrieve payloads  
**Config:** `paths.ts` + `knowledge/paths.md` · env `OPENROUTER_API_KEY` (preferred) or `OPENAI_API_KEY` · `AUDION_RAG_*`

## Purpose

HTTP surface for **project-scoped** document index and retrieval used by persona chat. Complements session DOCX upload (`POST /api/chat/documents/upload`) which does **not** index into the vector store.

## Env

| Key | Role |
|-----|------|
| `OPENROUTER_API_KEY` | Embeddings auth |
| `OPENROUTER_API_BASE_URL` | Optional; default `https://openrouter.ai/api/v1` |
| `AUDION_RAG_EMBEDDING_MODEL` | Default `openai/text-embedding-3-small` |
| `AUDION_RAG_ENABLED` | `0` disables ingest enqueue + chat retrieve |
| `DATABASE_URL` | Required for durable chunks (pgvector) |

Never expose OpenRouter key to the browser.

## Routes (Next BFF)

| Method | Path key | Path | Role |
|--------|----------|------|------|
| `POST` | `apiKnowledgeRagIngest` | `/api/knowledge/rag/ingest` | Auth; JSON or multipart → chunk/embed |
| `POST` | `apiKnowledgeRagRetrieve` | `/api/knowledge/rag/retrieve` | Auth; `{ projectId, query, topK? }` → sources |
| `GET` | `apiKnowledgeRagDocuments` | `/api/knowledge/rag/documents?projectId=` | List index status |
| `DELETE` | `apiKnowledgeRagDocument` | `/api/knowledge/rag/documents/[id]` | Delete document + chunks |

Chat stream (`POST /api/chat/stream`) calls retrieve **internally** when `projectId` present, RAG enabled, and not guest.

### Ingest body (JSON)

```json
{
  "projectId": "proj_…",
  "sourceType": "docx" | "chapter" | "research" | "entry",
  "sourceRef": "optional-stable-id",
  "title": "Brief title",
  "text": "plain text…",
  "replaceDocumentId": null
}
```

Multipart variant: field `file` (`.docx`) + `projectId` (+ optional `title`). Server extracts via mammoth (same helper as chat DOCX), then chunks.

**Response:** `{ documentId, status, chunkCount }` (`status`: `pending` | `ready` | `failed`).

### Retrieve body

```json
{
  "projectId": "proj_…",
  "query": "user question",
  "topK": 5
}
```

**Response:**

```json
{
  "sources": [
    {
      "id": "chunk_…",
      "documentId": "doc_…",
      "title": "…",
      "content": "chunk text",
      "score": 0.72,
      "ord": 0
    }
  ],
  "modelId": "openai/text-embedding-3-small"
}
```

Empty `sources` on soft-fail (no key, no rows, score gate).

## Auth

Same as chat image/DOCX uploads: session required when Plexon auth configured. No guest.

## Chat stream integration

When implementing `native-stream.ts` / fixture stream:

1. Resolve `projectId` from payload.
2. If RAG on → retrieve with raw `message`.
3. Merge Relevant context → DOCX blocks → user text → vision parts.
4. Optionally attach `sources` on `{ type: 'done', … }` (extend `ChatStreamEvent` in contracts).

## Runtime rules

- Prefer server-side only for secrets and embed batching.
- Filter vectors by `model_id` = configured embedding model.
- Soft-fail never blocks the LLM turn.
- Paths only via `paths.routes.*` / env keys in `paths.ts`.

## Acceptance

1. Inventory lists this API spec + domain companion.
2. Path keys documented in `knowledge/paths.md` before code lands.
3. Contract shapes added with the first implementation PR (not before).
