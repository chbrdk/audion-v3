'use client'

import React, { useMemo } from 'react'
import { DivergingBarList } from '@msqdx/ui'
import {
  categoryScoreDomain,
  formatSignedScore,
  radarPolygon,
  radarVertex,
  signedScoreToRadar01,
  sortCategoryEntries,
} from '../lib/category-score-viz'

const CX = 140
const CY = 140
const R = 88
const VIEW = 280

type Props = {
  categories: Record<string, number>
}

/** Magazine scorecard: ECHON-style spider + DS DivergingBarList. */
export function CategoryScoreChart({ categories }: Props) {
  const rows = useMemo(
    () =>
      sortCategoryEntries(
        Object.entries(categories).filter(([, v]) => typeof v === 'number') as Array<
          [string, number]
        >,
      ),
    [categories],
  )

  const domain = useMemo(
    () => categoryScoreDomain(rows.map((r) => r.value)),
    [rows],
  )

  const values01 = useMemo(
    () => rows.map((r) => signedScoreToRadar01(r.value, domain)),
    [rows, domain],
  )

  const poly = useMemo(() => radarPolygon(values01, CX, CY, R), [values01])
  const rings = useMemo(
    () =>
      [0.33, 0.5, 0.66, 1].map((level) =>
        radarPolygon(Array(rows.length).fill(level), CX, CY, R),
      ),
    [rows.length],
  )

  if (!rows.length) return null

  return (
    <div className="audion-wave-run-scoreviz">
      <div
        className="briefing-radar audion-wave-run-radar"
        role="img"
        aria-label="Category score radar"
      >
        <svg viewBox={`0 0 ${VIEW} ${VIEW}`} className="briefing-radar-svg" aria-hidden>
          {rings.map((d, i) => (
            <polygon
              key={`ring-${i}`}
              className={`briefing-radar-ring${i === 1 ? ' is-zero' : ''}`}
              points={d}
              fill="none"
            />
          ))}
          {rows.map((row, i) => {
            const tip = radarVertex(i, rows.length, 1, CX, CY, R)
            return (
              <line
                key={`axis-${row.key}`}
                className="briefing-radar-axis"
                x1={CX}
                y1={CY}
                x2={tip.x}
                y2={tip.y}
              />
            )
          })}
          <polygon className="briefing-radar-shape" points={poly} />
          {rows.map((row, i) => {
            const tip = radarVertex(i, rows.length, 1, CX, CY, R + 22)
            return (
              <text
                key={`lbl-${row.key}`}
                className="briefing-radar-label"
                x={tip.x}
                y={tip.y}
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {row.shortLabel}
              </text>
            )
          })}
        </svg>
      </div>

      <DivergingBarList
        className="audion-wave-run-divbars"
        domain={domain}
        aria-label="Category scores"
        items={rows.map((row) => ({
          id: row.key,
          label: row.label,
          value: row.value,
          display: formatSignedScore(row.value),
        }))}
      />
    </div>
  )
}
