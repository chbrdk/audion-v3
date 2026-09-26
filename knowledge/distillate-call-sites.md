# Destillat Call-Sites — AUDION

**Spec:** `plexon-v3/specs/domain/suite-enterprise-program.md` § E1 / E4  
**Clients:** `apps/web/lib/plexon-suite-audit.ts` · `apps/web/lib/plexon-collection-activity.ts`

| Trigger | File | Activity | Audit | Notes |
|---|---|---|---|---|
| Research native run finish | `apps/web/lib/ai/research-native.ts` | `scheduleCollectionActivityDistillate` | `scheduleSuiteAuditEvent` | Collection-bound research |
