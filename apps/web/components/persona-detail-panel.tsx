'use client'

import React from 'react'
import type { PersonaDetail } from '@audion-v3/contracts'
import { EmptyState, Text } from '@msqdx/ui'
import { paths } from '../lib/paths'
import { useT } from '../lib/user-prefs'
import { PersonaDetailActions } from './persona-actions'
import { PersonaChannelBubbles } from './persona-channel-bubbles'
import { PersonaEditableCommunication } from './persona-editable-communication'
import { PersonaEditableJourneyBehavior } from './persona-editable-journey-behavior'
import { PersonaEditableResearchProfile } from './persona-editable-research-profile'
import { PersonaEditableList } from './persona-editable-list'
import { PersonaEditableNotes } from './persona-editable-notes'
import { PersonaEditablePortrait } from './persona-editable-portrait'
import { PersonaEditableTavus } from './persona-editable-tavus'
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
  const t = useT()

  if (!persona) {
    return (
      <div className="panel briefing-detail audion-magazine audion-magazine--empty">
        <Text role="label" className="briefing-eyebrow">
          {t('detail.persona.eyebrow')}
        </Text>
        <EmptyState>{t('detail.persona.missing')}</EmptyState>
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
            {t('detail.persona.eyebrow')}
          </Text>
          <Text role="headline" as="h2" className="signal-title">
            {persona.name}
          </Text>
          <PersonaLocalizedHeroCopy persona={persona} />
          <ul className="geo-places audion-magazine-facets" aria-label="Persona attributes">
            {persona.location ? (
              <FacetTile
                label={t('detail.persona.location')}
                value={persona.location}
                kind="location"
              />
            ) : null}
            {persona.age ? (
              <FacetTile label={t('detail.persona.age')} value={persona.age} kind="age" />
            ) : null}
            {persona.gender ? (
              <FacetTile label={t('detail.persona.gender')} value={persona.gender} kind="gender" />
            ) : null}
            {persona.attentionSpan ? (
              <FacetTile
                label={t('detail.persona.attention')}
                value={persona.attentionSpan}
                kind="attention"
              />
            ) : null}
            {persona.archetype ? (
              <FacetTile
                label={t('detail.persona.archetype')}
                value={persona.archetype}
                kind="archetype"
              />
            ) : null}
            <FacetTile
              label={t('detail.persona.status')}
              value={persona.status}
              kind={persona.status}
            />
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
            title={t('detail.persona.interests')}
            items={persona.interests}
            empty={t('detail.persona.emptyInterests')}
          />
          <PersonaEditableList
            personaId={persona.id}
            field="values"
            title={t('detail.persona.values')}
            items={persona.values}
            empty={t('detail.persona.emptyValues')}
          />
        </div>

        <PersonaEditableCommunication
          personaId={persona.id}
          communicationStyle={persona.communicationStyle}
        />

        <div className="signal-stage audion-magazine-stage ds-motion-reveal">
          <PersonaEditableResearchProfile
            personaId={persona.id}
            personaName={persona.name}
            techLiteracy={persona.techLiteracy}
            emotionalBaseline={persona.emotionalBaseline}
            stressTriggers={persona.stressTriggers}
            motivations={persona.motivations}
          />
          <PersonaEditableJourneyBehavior
            personaId={persona.id}
            personaName={persona.name}
            journeyBehavior={persona.journeyBehavior}
          />
        </div>

        <PersonaEditableTavus
          personaId={persona.id}
          tavusReplicaId={persona.tavusReplicaId}
          tavusPersonaId={persona.tavusPersonaId}
          tavusLanguage={persona.tavusLanguage}
          bio={persona.bio}
          location={persona.location}
          headlineDe={persona.headlineDe}
          profileDe={persona.profileDe}
        />

        <div className="signal-stage audion-magazine-stage ds-motion-reveal">
          <PersonaEditableList
            personaId={persona.id}
            field="goals"
            title={t('detail.persona.goals')}
            items={persona.goals}
            empty={t('detail.persona.emptyGoals')}
          />
          <PersonaEditableList
            personaId={persona.id}
            field="frustrations"
            title={t('detail.persona.frustrations')}
            items={persona.frustrations}
            empty={t('detail.persona.emptyFrustrations')}
          />
        </div>

        <PersonaChannelBubbles
          personaId={persona.id}
          channels={persona.channels}
          className="detail-block ds-motion-reveal"
        />

        <PersonaEditableNotes personaId={persona.id} sections={persona.sections} />

        <ResourceKnowledgeDossier
          title={t('detail.persona.documents')}
          entries={persona.knowledgeEntries}
          documents={persona.documents}
          listUrl={paths.routes.apiPersonaKnowledge(persona.id)}
          projectId={persona.projectId}
          entrySourceRef={(entryId) => `persona:${persona.id}:${entryId}`}
        />

        <PersonaEditableVisuals personaId={persona.id} visuals={persona.visuals} />
      </div>
    </article>
  )
}
