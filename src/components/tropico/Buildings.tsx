'use client'

import { useMemo } from 'react'
import * as THREE from 'three'
import { islandHeight, scatter, type Placement } from './terrain'

/* -------------------------------------------------------------------------- */
/*  Tropico 6-style village houses                                            */
/* -------------------------------------------------------------------------- */

// Vibrant Caribbean wall colors (faded/worn look)
const WALL_COLORS = [
  '#3a8a8a', // teal
  '#8a4a6a', // purple/magenta
  '#c4a030', // yellow ochre
  '#8a3a2a', // red brick
  '#4a6a8a', // blue
  '#6a8a4a', // green
  '#a08040', // brown/tan
  '#7a5a3a', // dark wood
]
// Roof colors: corrugated metal, thatch, tile
const ROOF_COLORS = [
  '#5a5a5a', // corrugated gray metal
  '#7a4a2a', // rust metal
  '#9a8040', // thatch/straw
  '#8a3a2a', // red tile
  '#4a6a5a', // green metal
  '#3a3a3a', // dark metal
]

type HouseProps = {
  position: [number, number, number]
  rotation?: number
  variant?: number
  scale?: number
}

/**
 * Tropico 6-style village house:
 *  - Small rectangular box (shack/cottage)
 *  - Roof: flat corrugated metal OR gabled thatch/tile (alternates)
 *  - Vibrant faded wall colors
 *  - Small door + window
 *  - Weathered, compact, Caribbean look
 * 3-4 meshes per house for performance.
 */
export function TropicoHouse({ position, rotation = 0, variant = 0, scale = 1 }: HouseProps) {
  const wall = WALL_COLORS[variant % WALL_COLORS.length]
  const roof = ROOF_COLORS[variant % ROOF_COLORS.length]
  const isGabled = variant % 3 === 0 // 1/3 have gabled roofs, rest flat

  return (
    <group position={position} rotation={[0, rotation, 0]} scale={scale}>
      {/* concrete/plinth base */}
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[2.6, 0.2, 2.0]} />
        <meshStandardMaterial color="#b8a890" roughness={1} flatShading />
      </mesh>
      {/* walls — small rectangular box */}
      <mesh position={[0, 0.9, 0]}>
        <boxGeometry args={[2.2, 1.4, 1.8]} />
        <meshStandardMaterial color={wall} roughness={0.9} flatShading />
      </mesh>
      {/* roof — either flat corrugated or gabled */}
      {isGabled ? (
        <mesh position={[0, 1.9, 0]} rotation={[0, Math.PI / 4, 0]}>
          <coneGeometry args={[1.8, 1.0, 4]} />
          <meshStandardMaterial color={roof} roughness={0.85} flatShading />
        </mesh>
      ) : (
        <mesh position={[0, 1.7, 0]}>
          <boxGeometry args={[2.4, 0.25, 2.0]} />
          <meshStandardMaterial color={roof} roughness={0.85} flatShading />
        </mesh>
      )}
      {/* door */}
      <mesh position={[0, 0.55, 0.91]}>
        <boxGeometry args={[0.45, 0.8, 0.05]} />
        <meshStandardMaterial color="#3a2418" roughness={0.9} />
      </mesh>
      {/* window */}
      <mesh position={[-0.6, 0.9, 0.91]}>
        <boxGeometry args={[0.35, 0.35, 0.05]} />
        <meshStandardMaterial color="#a8d0e0" roughness={0.3} metalness={0.2} />
      </mesh>
    </group>
  )
}

/* -------------------------------------------------------------------------- */
/*  Village placement — 50 houses across multiple villages                    */
/* -------------------------------------------------------------------------- */

function placeVillage(
  center: [number, number],
  count: number,
  seed: number,
): Placement[] {
  let s = seed >>> 0
  const rand = () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 4294967296
  }
  const result: Placement[] = []
  let attempts = 0
  while (result.length < count && attempts < count * 40) {
    attempts++
    const ang = rand() * Math.PI * 2
    const r = 3 + rand() * 18
    const x = center[0] + Math.cos(ang) * r
    const z = center[1] + Math.sin(ang) * r
    const h = islandHeight(x, z)
    if (h < 0.8 || h > 3.0) continue
    const hx = islandHeight(x + 0.8, z)
    const hz = islandHeight(x, z + 0.8)
    const slope = Math.abs(hx - h) + Math.abs(hz - h)
    if (slope > 0.9) continue
    result.push({
      position: [x, h, z],
      scale: 2.5 + rand() * 1.5,
      rotation: rand() * Math.PI * 2,
    })
  }
  return result
}

/** Village centers spread around the island coast */
export const VILLAGE_CENTERS: Array<[number, number]> = [
  [400, -240],
  [-340, 280],
  [120, 440],
  [-440, -180],
  [320, 380],
]

/**
 * Multiple villages with ~50 houses total spread around the island.
 */
export function Buildings() {
  const villages = useMemo(
    () => [
      placeVillage(VILLAGE_CENTERS[0], 12, 142),
      placeVillage(VILLAGE_CENTERS[1], 10, 311),
      placeVillage(VILLAGE_CENTERS[2], 10, 489),
      placeVillage(VILLAGE_CENTERS[3], 9, 627),
      placeVillage(VILLAGE_CENTERS[4], 9, 753),
    ],
    [],
  )

  return (
    <group>
      {villages.flatMap((v, vi) =>
        v.map((p, i) => (
          <TropicoHouse
            key={`h${vi}-${i}`}
            position={p.position}
            scale={p.scale}
            rotation={p.rotation}
            variant={(vi * 3 + i) % WALL_COLORS.length}
          />
        )),
      )}
    </group>
  )
}
