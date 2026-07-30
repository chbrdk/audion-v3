import React from 'react'
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  NavIconJourneys,
  NavIconPersonas,
  NavIconProjects,
  NavIconStudies,
  NavIconTargetGroups,
} from '../components/nav-icons'

describe('nav icons differentiation', () => {
  it('personas uses a single centered head; target groups uses a group silhouette', () => {
    const personas = render(<NavIconPersonas />).container
    const groups = render(<NavIconTargetGroups />).container

    expect(personas.querySelectorAll('circle')).toHaveLength(1)
    expect(personas.querySelector('circle')?.getAttribute('cx')).toBe('12')

    expect(groups.querySelectorAll('circle')).toHaveLength(1)
    expect(groups.querySelector('circle')?.getAttribute('cx')).toBe('9')
    expect(groups.querySelectorAll('path').length).toBeGreaterThan(
      personas.querySelectorAll('path').length,
    )
  })

  it('projects is a folder; journeys is a route with endpoints; studies is a clipboard', () => {
    const projects = render(<NavIconProjects />).container
    const journeys = render(<NavIconJourneys />).container
    const studies = render(<NavIconStudies />).container

    expect(projects.querySelectorAll('path')).toHaveLength(1)
    expect(journeys.querySelectorAll('circle')).toHaveLength(2)
    expect(studies.querySelector('rect')).toBeTruthy()
  })
})
