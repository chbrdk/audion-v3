# Persona `project_id` alias (MCP)

Plexon assistant / AUDION MCP `audion.persona_create` historically POSTs FastAPI-era snake_case `project_id`.
AUDION v3 contracts use camelCase `projectId` (`PersonaWritePayload`).

**Parity with target groups:** `POST /api/personas` accepts either field and binds the persona to that Audion project.

- Route: `apps/web/app/api/personas/route.ts`
- Spec: `specs/api/personas.md`
- MCP maps `project_id` → `projectId` before POST (`AUDION-v2/mcp-server/src/tools.ts`)
- Companion: `knowledge/target-group-project-id-alias.md`
