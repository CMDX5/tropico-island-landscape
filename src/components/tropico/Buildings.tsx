'use client'

import { useMemo } from 'react'
import * as THREE from 'three'
import { islandHeight, scatter, type Placement } from './terrain'

/* -------------------------------------------------------------------------- */
/*  Caribbean house                                                            */
/* -------------------------------------------------------------------------- */

const WALL_COLORS = ['#ff8fa3', '#ffd166', '#06d6a0', '#ff9f1c', '#73d2de', '#ef476f']
const ROOF_COLORS = ['#b23a48', '#7a4419', '#1d6b6b', '#8a2c0a', '#2a6f97', '#7a1c40']

type HouseProps = {
  position: [number, number, number]
  rotation?: number
  variant?: number
  scale?: number
}

/**
 * A small colorful Caribbean-style house: concrete base, painted walls,
 * a steep pyramidal terracotta roof, a door and windows. Flat-shaded
 * to match the toon terrain.
 */
export function CaribbeanHouse({ position, rotation = 0, variant = 0, scale = 1 }: HouseProps) {
  const wall = WALL_COLORS[variant % WALL_COLORS.length]
  const roof = ROOF_COLORS[variant % ROOF_COLORS.length]

  return (
    <group position={position} rotation={[0, rotation, 0]} scale={scale}>
      {/* concrete plinth */}
      <mesh position={[0, 0.15, 0]} receiveShadow>
        <boxGeometry args={[2.4, 0.3, 2.4]} />
        <meshStandardMaterial color="#d9d2c5" roughness={1} flatShading />
      </mesh>
      {/* walls */}
      <mesh position={[0, 1.1, 0]} receiveShadow>
        <boxGeometry args={[2.0, 1.6, 2.0]} />
        <meshStandardMaterial color={wall} roughness={0.85} flatShading />
      </mesh>
      {/* pyramidal roof */}
      <mesh position={[0, 2.5, 0]} receiveShadow>
        <coneGeometry args={[1.7, 1.2, 4]} />
        <meshStandardMaterial color={roof} roughness={0.8} flatShading />
      </mesh>
      {/* door */}
      <mesh position={[0, 0.7, 1.01]}>
        <boxGeometry args={[0.5, 0.9, 0.05]} />
        <meshStandardMaterial color="#3a2418" roughness={0.9} />
      </mesh>
      {/* windows (front) */}
      <mesh position={[-0.6, 1.2, 1.01]}>
        <boxGeometry args={[0.4, 0.4, 0.05]} />
        <meshStandardMaterial color="#bfe9f2" roughness={0.3} metalness={0.2} />
      </mesh>
      <mesh position={[0.6, 1.2, 1.01]}>
        <boxGeometry args={[0.4, 0.4, 0.05]} />
        <meshStandardMaterial color="#bfe9f2" roughness={0.3} metalness={0.2} />
      </mesh>
    </group>
  )
}

/* -------------------------------------------------------------------------- */
/*  Village placement                                                          */
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
    const r = 2 + rand() * 9
    const x = center[0] + Math.cos(ang) * r
    const z = center[1] + Math.sin(ang) * r
    const h = islandHeight(x, z)
    // sit right on the beach sand, clearly visible from above
    if (h < 0.8 || h > 1.8) continue
    const hx = islandHeight(x + 0.8, z)
    const hz = islandHeight(x, z + 0.8)
    const slope = Math.abs(hx - h) + Math.abs(hz - h)
    if (slope > 0.9) continue
    result.push({
      position: [x, h, z],
      scale: 4.5 + rand() * 1.5,
      rotation: rand() * Math.PI * 2,
    })
  }
  return result
}

/** Village centers (shared with Vegetation so trees are cleared around houses). */
export const VILLAGE_CENTERS: Array<[number, number]> = [
  [400, -240],
  [-340, 280],
  [120, 440],
]

/**
 * Three small Caribbean villages dotted along the beaches.
 */
export function Buildings() {
  const villages = useMemo(
    () => [
      placeVillage(VILLAGE_CENTERS[0], 7, 142),
      placeVillage(VILLAGE_CENTERS[1], 6, 311),
      placeVillage(VILLAGE_CENTERS[2], 5, 489),
    ],
    [],
  )

  return (
    <group>
      {villages.flatMap((v, vi) =>
        v.map((p, i) => (
          <CaribbeanHouse
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
