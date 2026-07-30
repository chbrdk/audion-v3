# Queue dashboard (fixtures) — 2026-07-30

Magazine port of V2 `/admin/queue` for **document-processing jobs**. Backed by an in-memory fixture store — no Redis, Celery, or Postgres.

## Surfaces

| Kind | Path | Constant |
|------|------|----------|
| UI | `/queue` | `paths.routes.queue` |
| Stats | `GET /api/queue/stats` | `apiQueueStats` |
| List | `GET /api/queue/jobs` | `apiQueueJobs` |
| Detail | `GET /api/queue/jobs/[jobId]` | `apiQueueJobDetail` |
| Retry | `POST /api/queue/jobs/[jobId]/retry` | `apiQueueJobRetry` |

Store: `apps/web/lib/fixtures/queue-store.ts` · contracts: `@audion-v3/contracts` `queue.ts`

Entry: Settings Admin hub card **Queue** · home action link.

Query: optional `?projectId=` on `/queue` and APIs.

## Behavior

- Statuses: `pending` \| `processing` \| `completed` \| `failed`
- Stats strip + status filter + list/detail
- Retry failed → reset to `pending`, clear error, progress 0
- Auto-refresh every 10s

## Smoke

```bash
cd apps/web
npx vitest run __tests__/queue-dashboard.test.ts __tests__/queue-dashboard.test.tsx
```

Manual: open `/queue` → filter Failed → select job → Retry.

## Out of scope

Redis/Celery workers · document upload enqueue · research/AI job merge · service-status mesh · logs
