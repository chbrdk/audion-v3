# AUDION v2 ↔ v3 — Runtime-Trennung (Coolify)

**Status:** Policy 2026-07-30  
**Ökosystem-SoT:** `PLEXON/knowledge/ecosystem-v3-parallel-track.md` (gesamte v3-Insel, nicht nur AUDION)

**Ziel:** Produktions-V2 auf Coolify bleibt unberührt. V3 läuft parallel, sauber getrennt für Team + Kunden. AUDION-v3 ist der erste Product-Pilot; PLEXON/CHECKION/ECHON/… folgen in derselben Insel.

## Nicht-Ziele

- Kein Shared Deploy / kein Shared Compose mit V2
- Keine gemeinsame Postgres / Redis / Qdrant / Neo4j mit V2
- Kein Überschreiben von V2 Domains, Env-Namen oder Coolify-Projekt-IDs
- Kein „V3 ersetzt V2“-Cutover, bevor Product-Postgres + Parity bewusst freigegeben sind

## Trennungsmatrix

| Ebene | V2 (Coolify, live) | V3 |
|-------|--------------------|-----|
| Repo | `AUDION-v2` | `audion-v3` (eigenes Repo) |
| Coolify | bestehendes Projekt / Stack **unverändert** | **neues** Coolify-Projekt, z. B. `audion-v3` |
| Domain | bestehende Prod-URL | eigene Preview/Staging-URL (`v3.…` / `audion-v3.…`) |
| DB / Volumes | V2 Postgres + Nebenstores | erst Fixtures; später **eigene** Product-DB |
| Auth | V2 Auth (wie heute) | Plexon Control Plane (`knowledge/plexon-federation.md`) |
| Upstream APIs | V2 persona-/chat-api | optional Proxy auf **Kopie** oder Staging-APIs — nie Prod-V2 mutierend ohne Freigabe |
| Secrets | V2 Env | eigene `AUTH_SECRET`, `PLEXON_*`, API keys |

## Was schon gilt (Code)

- V3 Domain-Daten: Fixture-Stores (Wave 1)
- V3 Identity: Plexon (wenn Env gesetzt), sonst offener Fixture-Dev
- Kein Shared Cookie mit Plexon / V2
- Product Postgres in V3 **deferred** (`remaining-gaps.md`)

## Empfohlene nächste Schritte (Reihenfolge)

### 0. Ökosystem-Insel (PLEXON)

Siehe `PLEXON/knowledge/ecosystem-v3-parallel-track.md`: Coolify Environment `msqdx-v3-staging` + `plexon-v3` bevor weitere Products hard an Prod-Plexon gehängt werden.

### 1. Ops-Freeze V2 (sofort)

- Coolify-V2: nur Bugfixes / kritische Patches
- Keine V3-Branch-Deploys in das V2-Projekt
- Env-/Domain-Doku V2 nicht umbenennen „für V3“

### 2. V3 Staging-Insel (nächster Ops-Schritt)

- Eigenes Coolify-Projekt `audion-v3`
- Mindestens: Web-App (+ später optional eigene API-Services)
- Eigene Domain + TLS
- Env: `AUTH_SECRET` (prod ≥32), optional Plexon gegen **Staging-Plexon** (nicht Prod-V2-DB)
- `NEXT_PERSONA_DATA_SOURCE=fixtures` bis Product-DB steht — oder `auto` nur gegen **separates** Staging-API

### 3. Plexon Staging verdrahten

- Shared `PLEXON_SERVICE_SECRET` nur für V3↔Plexon-Staging
- Contract `2026-05-plexon-federation-v3`
- Smoke: Login → Settings Account → Project create Origin (graceful)

### 4. Product-Daten (Wave 2+)

- Eigene Postgres für Personas/TGs/Journeys/Studies
- Migration/Import aus V2 als **einmaliger** Copy-Job — nie Live-Write in V2-DB
- V2 bleibt Source of Truth bis Cutover-Entscheidung

### 5. Cutover (später, bewusst)

- Parity-Checkliste (`v2-v3-feature-parity.md`) grün
- DNS/Domain-Switch oder Feature-Flag pro Tenant
- V2 danach Read-only / Sunset — nicht parallel-mutierend

## Team-Regel

Wenn unsicher: **V2 nicht anfassen.** Neue Features landen in `audion-v3`. Proxies auf V2-APIs nur lesend / explizit freigegeben und über Staging-URLs in `paths` / Env — nie hardcoded Prod-Host im Code.
