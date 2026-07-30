# UX Studies API Consumption

**Status:** Accepted — Phase 3  
**Contracts:** `@audion-v3/contracts` ux-studies  
**Config:** `apps/web/lib/runtime-config.ts` · `paths.ts`  
**Upstream:** AUDION-v2 `GET/POST /ux-studies*`  
**Local:** fixture store + Next `/api/studies*`

## Endpoints (upstream v2)

- `GET /ux-studies?page=1&page_size=50[&project_id=…]`
- `POST /ux-studies` — `UxStudyWritePayload`
- `GET /ux-studies/{studyId}`
- `PATCH /ux-studies/{studyId}`
- `POST /ux-studies/{studyId}/waves` — `UxWaveWritePayload`
- `GET /ux-studies/{studyId}/waves/{waveId}`
- `PATCH /ux-studies/{studyId}/waves/{waveId}` — report / evaluation / runs merge
- `POST /ux-studies/{studyId}/waves/{waveId}/evaluate`
- `GET /ux-studies/{studyId}/waves/{waveId}/compare/{otherWaveId}`
- `POST /ux-studies/{studyId}/waves/{waveId}/start` — orchestration
- `POST /ux-studies/{studyId}/waves/{waveId}/sync` — poll job statuses

## Local Next

| Method | Path |
|--------|------|
| GET/POST | `/api/studies` |
| GET/PATCH | `/api/studies/[studyId]` |
| GET/POST | `/api/studies/[studyId]/waves` |
| GET/PATCH | `/api/studies/[studyId]/waves/[waveId]` |
| POST | `/api/studies/[studyId]/waves/[waveId]/evaluate` |
| GET | `/api/studies/[studyId]/waves/[waveId]/compare/[otherWaveId]` |
| POST | `/api/studies/[studyId]/waves/[waveId]/start` |
| POST | `/api/studies/[studyId]/waves/[waveId]/sync` |

## Runtime

- Data source: `NEXT_PERSONA_DATA_SOURCE` (`fixtures` \| `api` \| `auto`)
- Prefer `NEXT_PERSONA_BACKEND_INTERNAL_URL` for live API
- Seed: EBM wave `audion-2026-07-30-mcp`
- Fixtures: start → `running`; sync advances runs deterministically toward complete
