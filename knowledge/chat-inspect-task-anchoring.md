# Chat inspect — task anchoring (browse/find)

**Problem:** Chat inspect passed only `Inspect {url}` to the agent. Step cards showed browser-use stubs (`Initial navigation`, `Ich öffne {url}`) with no user goal (e.g. „suche nach Grillplatte“).

**Fix (2026-08-12):**

- **Web BFF:** `extractInspectGoalFromMessage` + `buildInspectAgentTask` in `apps/web/lib/chat/share.ts`; stored on tool proposal as `agentTask`; passed to agent on approve; `toChatUxJourneySteps(steps, { task })` rewrites think/next with goal and drops agent stubs.
- **Client round-trip:** `agentTask` on `tool_proposed` → echoed on approve (`ChatToolDecisionPayload`) so stateless BFF instances do not lose the goal.
- **Conversation context:** goal from earlier user turns when the URL appears in a later message.
- **Agent:** `anchor_task_to_perception`, `task_reminder_from_task`, prompt block `AUFTRAG (jeder Schritt): …`; live poll `_persist_live_steps` runs `_apply_persona_perception_finalize` with `task`.

**Verify:** New chat message like `suche auf https://www.moebel-martin.de/ nach Grillplatte` → approve inspect → Step 1 Denken mentions Grillplatte; Nächster Schritt is not `Initial navigation`.

**Staging:** web `https://audion-v3.projects-a.plygrnd.tech` · agent `https://uxagent.projects-a.plygrnd.tech`
