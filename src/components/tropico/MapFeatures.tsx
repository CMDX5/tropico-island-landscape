'use client'

import { useMemo } from 'react'
import * as THREE from 'three'
import { islandHeight, ISLAND_RADIUS } from './terrain'
import { VILLAGE_CENTERS } from './Buildings'

/* -------------------------------------------------------------------------- */
/*  Dirt roads connecting villages                                            */
/* -------------------------------------------------------------------------- */

function buildRoadPath(from: [number, number], to: [number, number], segments = 40): THREE.Vector3[] {
  const pts: THREE.Vector3[] = []
  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    // add slight curve via perpendicular offset
    const mid = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2]
    const perpX = -(to[1] - from[1]) * 0.15
    const perpZ = (to[0] - from[0]) * 0.15
    const x = THREE.MathUtils.lerp(from[0], to[0], t) + perpX * Math.sin(t * Math.PI)
    const z = THREE.MathUtils.lerp(from[1], to[1], t) + perpZ * Math.sin(t * Math.PI)
    const y = islandHeight(x, z) + 0.05
    pts.push(new THREE.Vector3(x, y, z))
  }
  return pts
}

export function Roads() {
  const geometries = useMemo(() => {
    const roads: THREE.BufferGeometry[] = []
    // connect each village to the next (circular)
    for (let i = 0; i < VILLAGE_CENTERS.length; i++) {
      const from = VILLAGE_CENTERS[i]
      const to = VILLAGE_CENTERS[(i + 1) % VILLAGE_CENTERS.length]
      const pts = buildRoadPath(from, to)
      const curve = new THREE.CatmullRomCurve3(pts)
      const geo = new THREE.TubeGeometry(curve, 50, 0.8, 4, false)
      roads.push(geo)
    }
    // also connect village 0 to center (road to the volcano area)
    const centerRoad = buildRoadPath(VILLAGE_CENTERS[0], [0, 0], 30)
    const centerCurve = new THREE.CatmullRomCurve3(centerRoad)
    roads.push(new THREE.TubeGeometry(centerCurve, 30, 0.8, 4, false))
    return roads
  }, [])

  return (
    <group>
      {geometries.map((geo, i) => (
        <mesh key={i} geometry={geo}>
          <meshStandardMaterial color="#9a8050" roughness={1} flatShading />
        </mesh>
      ))}
    </group>
  )
}

/* -------------------------------------------------------------------------- */
/*  Inland lake at the center of the island                                   */
/* -------------------------------------------------------------------------- */

export function InlandLake() {
  const geometry = useMemo(() => {
    const seg = 32
    const positions: number[] = []
    const indices: number[] = []
    const lakeRadius = ISLAND_RADIUS * 0.08
    for (let j = 0; j <= seg; j++) {
      for (let i = 0; i <= seg; i++) {
        const x = -lakeRadius + (i / seg) * lakeRadius * 2
        const z = -lakeRadius + (j / seg) * lakeRadius * 2
        positions.push(x, 0.3, z) // slightly above sea level
      }
    }
    for (let j = 0; j < seg; j++) {
      for (let i = 0; i < seg; i++) {
        const a = j * (seg + 1) + i
        const b = a + 1
        const c = a + (seg + 1)
        const d = c + 1
        indices.push(a, c, b)
        indices.push(b, c, d)
      }
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geo.setIndex(indices)
    geo.computeVertexNormals()
    return geo
  }, [])

  return (
    <mesh geometry={geometry} position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <meshStandardMaterial
        color="#1ea8cf"
        transparent
        opacity={0.85}
        roughness={0.08}
        metalness={0.3}
      />
    </mesh>
  )
}

/* -------------------------------------------------------------------------- */
/*  Agricultural fields near villages                                         */
/* -------------------------------------------------------------------------- */

export function FarmFields() {
  const fields = useMemo(() => {
    const arr: Array<{ pos: [number, number, number]; rot: number; color: string }> = []
    const fieldColors = ['#7a9a3a', '#8aaa4a', '#6a8a2a', '#9aba5a']
    VILLAGE_CENTERS.forEach((vc) => {
      for (let i = 0; i < 4; i++) {
        const ang = (i / 4) * Math.PI * 2 + 0.3
        const r = 25 + Math.random() * 10
        const x = vc[0] + Math.cos(ang) * r
        const z = vc[1] + Math.sin(ang) * r
        const h = islandHeight(x, z)
        if (h > 0.8 && h < 4) {
          arr.push({
            pos: [x, h + 0.02, z],
            rot: Math.random() * Math.PI,
            color: fieldColors[i % fieldColors.length],
          })
        }
      }
    })
    return arr
  }, [])

  return (
    <group>
      {fields.map((f, i) => (
        <mesh key={i} position={f.pos} rotation={[-Math.PI / 2, 0, f.rot]}>
          <planeGeometry args={[8, 6]} />
          <meshStandardMaterial color={f.color} roughness={0.95} flatShading side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  )
}

/* -------------------------------------------------------------------------- */
/*  Wooden dock + small boat near a coastal village                           */
/* -------------------------------------------------------------------------- */

export function Dock() {
  const dockPos = useMemo<[number, number, number]>(() => {
    const vc = VILLAGE_CENTERS[0]
    const h = islandHeight(vc[0] + 20, vc[1] + 20)
    return [vc[0] + 20, Math.max(h, -0.15), vc[1] + 20]
  }, [])

  return (
    <group position={dockPos}>
      {/* dock planks */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3, 8]} />
        <meshStandardMaterial color="#8a6a3a" roughness={0.95} side={THREE.DoubleSide} />
      </mesh>
      {/* dock posts */}
      {[
        [-1.2, -3.5], [1.2, -3.5],
        [-1.2, 0], [1.2, 0],
        [-1.2, 3.5], [1.2, 3.5],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, -0.5, z]}>
          <cylinderGeometry args={[0.12, 0.12, 2, 5]} />
          <meshStandardMaterial color="#5a3a1a" roughness={0.95} flatShading />
        </mesh>
      ))}
      {/* small boat near the dock */}
      <group position={[4, -0.1, 2]} rotation={[0, 0.5, 0]}>
        <mesh>
          <boxGeometry args={[1.5, 0.5, 0.7]} />
          <meshStandardMaterial color="#6a4a2a" roughness={0.9} flatShading />
        </mesh>
        <mesh position={[0, 0.4, 0]}>
          <boxGeometry args={[0.1, 1.2, 0.6]} />
          <meshStandardMaterial color="#d4d4d4" roughness={0.8} />
        </mesh>
      </group>
    </group>
  )
}
