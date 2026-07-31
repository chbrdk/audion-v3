/**
 * Mock context for Prompt Builder live preview.
 */

export function generateMockContext(): Record<string, string> {
  return {
    journey_name: 'E-Bike Purchase Journey',
    journey_type: 'purchase',
    journey_description: 'Complete customer journey from awareness to purchase',
    target_group_summary: 'Tech-savvy urban professionals, aged 30-45',
    persona_summaries: 'Alex — research lead; Jordan — eco rider',
    phase_name: 'Awareness',
    phase_description: 'Customer becomes aware of the product',
    phase_expected_emotion: 'curious',
    existing_phases_summary: 'Phase 1: Awareness · Phase 2: Consideration',
    existing_phases_count: '2',
    last_phase_summary: 'Phase 2: Consideration',
    last_phase_name: 'Consideration',
    last_phase_emotion: 'hopeful',
    next_phase_number: '3',
    persona_name: 'Alex Morgan',
    persona_headline: 'Research lead',
    persona_bio: 'Urban professional exploring e-mobility.',
    persona_profile: 'Name: Alex Morgan\nRole: Research lead',
    persona_pain_points: 'Time pressure; unclear specs',
    persona_interests: 'Cycling, design systems',
    persona_values: 'Clarity, sustainability',
    persona_goals: 'Find the right bike fast',
    existing_traits: 'curious, pragmatic',
    existing_vocabulary: 'signal, fixture, journey',
    graph_relationships_summary: '(none)',
    knowledge_context: '(none)',
    max_items: '5',
    max_suggestions: '3',
    context: 'Sample project context',
    locale: 'en',
    output_locale: 'en',
    generated_text_locale_name: 'English',
  }
}
