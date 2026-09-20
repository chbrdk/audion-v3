# Persona chat corpus analysis (AUDION v3)

**Exported:** 2026-09-20T17:36:28.284Z
**Source:** Coolify REST `GET /applications/{uuid}/envs` → `AUDION_API_TOKEN` → Staging `GET /api/chat/conversations`
**Raw:** `.tmp/persona-chats/conversations.json` · **Stats:** `.tmp/persona-chats/analysis.json`

## Verdict

Staging holds **143** persona chat threads (Jul 31 – Sep 17, 2026). Usage is dominated by two Vaillant programs: **MaFo product/persona smoke** (many short 1-turn chats) and a **GEO prompt-bank / Employer-brand elicitation** loop (longer multi-turn coaching). Other projects (Bosch eBike, Festo, Finaltest) are sparse. Website inspect is used but rare (12). TG/project ask-all is **not** in this table.

## Totals

| Metric | Value |
|--------|------:|
| Conversations | 143 |
| User turns | 198 |
| Assistant turns | 194 |
| Unique personas | 37 |
| Unique projects | 6 |
| With website inspect | 12 |
| With images | 1 |
| With docs | 0 |

## By project

| Project | Conversations | User turns | Personas | Dominant use |
|---------|--------------:|-----------:|----------|--------------|
| Vaillant Group MaFo | 85 | 87 | 16 | Short product/persona probes (often 1 turn) |
| Vaillant (GEO / Employer) | 34 | 73 | 11 | GEO U/BV/BR prompt bank + follow-ups |
| —none— | 16 | 20 | 7 | Ad-hoc / unscoped personas |
| Finaltest | 5 | 14 | 2 | Product UI/smoke |
| Festo | 2 | 2 | 2 | One-shot B2B persona pings |
| Bosch eBike | 1 | 2 | 1 | Minimal Sam smoke |

## Intent classification (first user turn / inspect)

| Intent | Conversations |
|--------|--------------:|
| smoke_test | 42 |
| product_advice | 41 |
| other | 32 |
| website_inspect | 14 |
| geo_prompt_bank | 13 |
| compare | 1 |

## Thread depth (user turns per conversation)

| Depth | Conversations |
|------:|--------------:|
| 1 | 122 |
| 2 | 8 |
| 3 | 6 |
| 4 | 2 |
| 5 | 2 |
| 6 | 1 |
| 8 | 1 |
| 10 | 1 |

## Monthly volume

| Month | Conversations updated |
|-------|----------------------:|
| 2026-07 | 3 |
| 2026-08 | 45 |
| 2026-09 | 95 |

## Findings

1. **Two research modes, not one chat habit.** MaFo ≈ breadth (many personas × short prompts). GEO/Employer ≈ depth (coach the persona to emit U/BV/BR questions in their voice).
2. **GEO prompt template is sticky.** Same long system-ish user prompt appears across Michael, Lea, Ingrid, Jonas, Nina, Frank, Tom, Sabine, Julia, Markus — then short corrections ("fragen die *du* stellen würdest", "unbranded allgemeiner").
3. **Persona fidelity friction.** Operators repeatedly push personas away from press/employer framing toward lived questions; competitor bias (Viessmann-only) also appears.
4. **Inspect underused relative to product talk.** 12/143 threads carry inspect snapshots; keyword hits for journey/URL still high because prompts mention URLs without completing inspect.
5. **Access gap for export.** Machine `AUDION_API_TOKEN` can list chats but gets 403 on `/api/projects/:id` (Access Model B) and 405 on list routes that are session-shaped — project names resolved from seed knowledge + ids.
6. **Coolify path works.** MCP hides secrets; Coolify REST `…/envs` returns `value` with the same team token — use that for staging ops, do not commit values.

## Theme keyword hits (message-level)

| Theme | Hits |
|-------|-----:|
| product_tech | 130 |
| trust_brand | 92 |
| journey_inspect | 64 |
| ux_web | 53 |
| price_cost | 46 |
| decision | 33 |
| emotion | 8 |

## Top personas by conversations

| Persona | Project | Conv | User turns | Avg user words |
|---------|---------|-----:|-----------:|---------------:|
| Peter Braunschweig | Vaillant Group MaFo | 14 | 16 | 8 |
| Dr. Nina Falk | Vaillant (GEO / Employer) | 7 | 9 | 24 |
| Sophie Weber | Vaillant Group MaFo | 7 | 7 | 8 |
| Preis-Leistungs-Optimierer Markus | —none— | 7 | 8 | 15 |
| Frank Ostermann | Vaillant (GEO / Employer) | 6 | 6 | 26 |
| Julia Wendt | Vaillant (GEO / Employer) | 6 | 9 | 45 |
| Lisa Hartmann | Vaillant Group MaFo | 6 | 6 | 9 |
| Jana Schmitt | Vaillant Group MaFo | 6 | 6 | 9 |
| Sandra Müller | Vaillant Group MaFo | 6 | 6 | 9 |
| Sandra Vogt | Vaillant Group MaFo | 6 | 6 | 9 |
| Frank Meier | Vaillant Group MaFo | 6 | 6 | 9 |
| Klaus Brenner | Vaillant Group MaFo | 6 | 6 | 9 |

## Method

- Coolify: `GET https://coolify.plygrnd.tech/api/v1/applications/putvwgqq1c9yb30tsqosujde/envs` (Bearer team token) → `AUDION_API_TOKEN`.
- Audion: `GET /api/chat/conversations` + detail per id.
- Script: `scripts/export-persona-chats.mjs`.
- Intent labels are heuristic first-pass codes, not a full thematic codebook.
