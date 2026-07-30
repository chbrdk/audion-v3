import React from 'react'
import Link from 'next/link'
import type { PersonaDetail } from '@audion-v3/contracts'
import { EmptyState, Text } from '@msqdx/ui'
import { paths } from '../lib/paths'
import { PersonaDetailActions } from './persona-actions'
import { PersonaChannelBubbles } from './persona-channel-bubbles'
import { PersonaEditableCommunication } from './persona-editable-communication'
import { PersonaEditableList } from './persona-editable-list'
import { PersonaEditableNotes } from './persona-editable-notes'
import { PersonaEditablePortrait } from './persona-editable-portrait'
import { PersonaEditableTraits } from './persona-editable-traits'
import { PersonaEditableVisuals } from './persona-editable-visuals'
import { PersonaLocalizedHeroCopy } from './persona-localized-hero-copy'
import { PersonaProfileDeBand } from './persona-profile-de-band'
import { ResourceKnowledgeDossier } from './resource-knowledge-dossier'

/** ECHON geo-places gradient tiles for persona meta. */
function FacetTile({
  label,
  value,
  kind,
}: {
  label: string
  value: React.ReactNode
  kind: string
}) {
  return (
    <li data-kind={kind}>
      <span className="meta">{label}</span>
      {value}
    </li>
  )
}

export function PersonaDetailPanel({ persona }: { persona: PersonaDetail | null }) {
  if (!persona) {
    return (
      <div className="panel briefing-detail audion-magazine audion-magazine--empty">
        <Text role="label" className="briefing-eyebrow">
          Persona profile
        </Text>
        <EmptyState>
          <Link href={paths.routes.personas} className="audion-link">
            Back to personas
          </Link>
          {' — '}
          this profile could not be loaded.
        </EmptyState>
      </div>
    )
  }

  return (
    <article className="panel briefing-detail audion-magazine">
      <div className="audion-magazine-topbar ds-motion-reveal">
        <PersonaDetailActions persona={persona} />
      </div>

      <header className="signal-hero briefing-hero audion-magazine-hero ds-motion-reveal">
        <PersonaEditablePortrait
          personaId={persona.id}
          name={persona.name}
          avatarUrl={persona.avatarUrl}
        />
        <div className="audion-magazine-hero-copy">
          <Text role="label" className="briefing-eyebrow">
            Persona profile
          </Text>
          <Text role="headline" as="h2" className="signal-title">
            {persona.name}
          </Text>
          <PersonaLocalizedHeroCopy persona={persona} />
          <ul className="geo-places audion-magazine-facets" aria-label="Persona attributes">
            {persona.location ? (
              <FacetTile label="Location" value={persona.location} kind="location" />
            ) : null}
            {persona.age ? <FacetTile label="Age" value={persona.age} kind="age" /> : null}
            {persona.gender ? <FacetTile label="Gender" value={persona.gender} kind="gender" /> : null}
            {persona.attentionSpan ? (
              <FacetTile label="Attention" value={persona.attentionSpan} kind="attention" />
            ) : null}
            {persona.archetype ? (
              <FacetTile label="Archetype" value={persona.archetype} kind="archetype" />
            ) : null}
            <FacetTile label="Status" value={persona.status} kind={persona.status} />
          </ul>
        </div>
      </header>

      <div className="audion-magazine-body">
        <PersonaProfileDeBand persona={persona} />

        <PersonaEditableTraits personaId={persona.id} traits={persona.traits} />

        <div className="signal-stage audion-magazine-stage ds-motion-reveal">
          <PersonaEditableList
            personaId={persona.id}
            field="interests"
            title="Interests"
            items={persona.interests}
            empty="No interests yet."
          />
          <PersonaEditableList
            personaId={persona.id}
            field="values"
            title="Values"
            items={persona.values}
            empty="No values yet."
          />
        </div>

        <PersonaEditableCommunication
          personaId={persona.id}
          communicationStyle={persona.communicationStyle}
        />

        <div className="signal-stage audion-magazine-stage ds-motion-reveal">
          <PersonaEditableList
            personaId={persona.id}
            field="goals"
            title="Goals"
            items={persona.goals}
            empty="No goals available yet."
          />
          <PersonaEditableList
            personaId={persona.id}
            field="frustrations"
            title="Frustrations"
            items={persona.frustrations}
            empty="No frustrations available yet."
          />
        </div>

        <PersonaChannelBubbles
          personaId={persona.id}
          channels={persona.channels}
          className="detail-block ds-motion-reveal"
        />

        <PersonaEditableNotes personaId={persona.id} sections={persona.sections} />

        <ResourceKnowledgeDossier
          title="Documents & knowledge"
          entries={persona.knowledgeEntries}
          documents={persona.documents}
          listUrl={paths.routes.apiPersonaKnowledge(persona.id)}
          entryUrl={(entryId) => paths.routes.apiPersonaKnowledgeEntry(persona.id, entryId)}
        />

        <PersonaEditableVisuals personaId={persona.id} visuals={persona.visuals} />
      </div>
    </article>
  )
}
