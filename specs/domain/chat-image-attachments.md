# Chat image attachments + A/B compare

**Status:** Accepted — 2026-08-27  
**Surfaces:** Persona chat only (`/chat`)  
**Contracts:** `ChatMessageImage` · `ChatSendPayload.imageIds` · `abCompare`  
**API:** `POST /api/chat/images/upload` · stream body fields  
**Legacy:** AUDION-v2 `/chat/images/upload` + `ab_compare` system instruction

## Purpose

Users attach screenshots/design variants to a persona turn so the native OpenAI stream can reason with vision. With exactly two images, optional **A/B compare** forces a structured winner reply.

## Scope

| Mode | Attachments |
|------|-------------|
| Persona (authenticated) | yes |
| Target-group ask-all | no |
| Guest embed / public share (guest budget) | no |

## Client

1. Pick `image/*` (multi).
2. Compress (canvas max **1024×1024**, JPEG quality **0.7**) → data URL.
3. `POST /api/chat/images/upload` `{ image: dataUrl }` → `{ imageId }`.
4. Pending thumbs + remove; with **exactly 2** pending IDs show A/B checkbox.
5. Send: `imageIds`, optional `abCompare: true`; `message` may be empty when ≥1 image.

## Server store

- In-memory map keyed by UUID `imageId`.
- TTL **3600 s** (`paths.chatImageUploadTtlSeconds`).
- Max decoded payload **10 MB** (`paths.chatImageUploadMaxBytes`).
- Data URL must start with `data:image/`.

## Persist

User `ChatMessage` stores `images: { id, dataUrl }[]` (compressed) + optional `abCompare` for history UI. Upload-store IDs are resolved at send time for the LLM turn.

## Native stream

- Current user turn: OpenAI multimodal content parts (`text` + `image_url`).
- Prior history turns: **text-only** (token budget).
- When `abCompare === true` and exactly two resolved images, append the A/B system instruction (below).
- Missing/expired IDs → stream `error`.

## A/B system instruction (stable)

```
A/B Compare Mode (2 images):
- You will receive two images.
- Treat the FIRST image as Image A and the SECOND image as Image B.
- Compare A vs B directly. Do not describe them independently without comparing.
- Reply in Markdown and use these headings exactly:
  ### A summary
  ### B summary
  ### Key differences
  ### Winner & why
  ### Recommendations
- You MUST pick a winner (A or B) and justify it against the user's goal.
```

## Out of scope

- DOCX / knowledge upload
- Blob/S3 durable storage
- TG / guest attachments
