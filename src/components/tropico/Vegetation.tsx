'use client'

import { useMemo } from 'react'
import * as THREE from 'three'
import { scatter, type Placement } from './terrain'
import { PalmTree } from './PalmTree'
import { VILLAGE_CENTERS } from './Buildings'

/* -------------------------------------------------------------------------- */
/*  Rocks                                                                      */
/* -------------------------------------------------------------------------- */

function Rock({ p }: { p: Placement }) {
  return (
    <mesh
      position={p.position}
      scale={[p.scale, p.scale * 0.7, p.scale]}
      rotation={[p.rotation * 0.4, p.rotation, p.rotation * 0.6]}
     
      receiveShadow
    >
      <dodecahedronGeometry args={[0.6, 0]} />
      <meshStandardMaterial color="#8a7d6b" roughness={1} flatShading />
    </mesh>
  )
}

/* -------------------------------------------------------------------------- */
/*  Bushes                                                                     */
/* -------------------------------------------------------------------------- */

function Bush({ p }: { p: Placement }) {
  return (
    <group position={p.position} scale={p.scale} rotation={[0, p.rotation, 0]}>
      <mesh position={[0, 0.35, 0]}>
        <icosahedronGeometry args={[0.42, 1]} />
        <meshStandardMaterial color="#2f7d2a" roughness={0.9} flatShading />
      </mesh>
      <mesh position={[0.3, 0.28, 0.15]}>
        <icosahedronGeometry args={[0.28, 1]} />
        <meshStandardMaterial color="#358f2e" roughness={0.9} flatShading />
      </mesh>
      <mesh position={[-0.25, 0.3, -0.1]}>
        <icosahedronGeometry args={[0.26, 1]} />
        <meshStandardMaterial color="#2a7326" roughness={0.9} flatShading />
      </mesh>
    </group>
  )
}

/* -------------------------------------------------------------------------- */
/*  Beach grass tufts                                                          */
/* -------------------------------------------------------------------------- */

function GrassTuft({ p }: { p: Placement }) {
  const blades = useMemo(() => {
    const arr: Array<[number, number, number, number]> = []
    for (let i = 0; i < 5; i++) {
      arr.push([
        (Math.random() - 0.5) * 0.3,
        0,
        (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.5,
      ])
    }
    return arr
  }, [])
  return (
    <group position={p.position} scale={p.scale} rotation={[0, p.rotation, 0]}>
      {blades.map((b, i) => (
        <mesh key={i} position={[b[0], 0.18, b[2]]} rotation={[b[3], 0, b[3]]}>
          <coneGeometry args={[0.04, 0.4, 4]} />
          <meshStandardMaterial color="#7fae3a" roughness={0.9} />
        </mesh>
      ))}
    </group>
  )
}

/* -------------------------------------------------------------------------- */
/*  Vegetation collection                                                      */
/* -------------------------------------------------------------------------- */

export function Vegetation({ palmCount = 500 }: { palmCount?: number }) {
  // keep trees away from the beach villages so houses stay visible
  const avoid = useMemo(() => VILLAGE_CENTERS.map(([x, z]) => ({ x, z, r: 35 })), [])
  // palm trees on beaches and sandy lowlands (more, bigger, visible on sand)
  const palms = useMemo(
    () => scatter(palmCount, { minH: 0.2, maxH: 4, maxSlope: 1.2, seed: 7, minScale: 1.5, maxScale: 2.5, biome: ['sand', 'plain'], avoid }),
    [palmCount, avoid],
  )
  // second cluster of palms specifically on sand (denser beaches, bigger)
  const beachPalms = useMemo(
    () => scatter(300, { minH: 0.2, maxH: 2.5, maxSlope: 1.0, seed: 42, minScale: 1.3, maxScale: 2.2, biome: 'sand', avoid }),
    [avoid],
  )
  // broadleaf trees now rendered via InstancedForest (IslandScene) for density
  // bushes scattered on plains, hills, jungle AND sand (variety)
  const bushes = useMemo(
    () => scatter(500, { minH: 0.5, maxH: 8, maxSlope: 1.6, seed: 21, minScale: 0.7, maxScale: 1.4, biome: ['plain', 'hill', 'jungle', 'sand'], avoid }),
    [avoid],
  )
  // rocks scattered on beaches, slopes, mountains and plateaus
  const rocks = useMemo(
    () => scatter(120, { minH: -0.5, maxH: 52, maxSlope: 2.8, seed: 99, minScale: 0.6, maxScale: 2.4, biome: ['sand', 'mountain', 'hill', 'plateau'] }),
    [],
  )
  // beach grass near the shore (more)
  const grass = useMemo(
    () => scatter(400, { minH: 0.2, maxH: 1.6, maxSlope: 1.0, seed: 5, minScale: 0.7, maxScale: 1.3, biome: 'sand' }),
    [],
  )

  return (
    <group>
      {palms.map((p, i) => (
        <PalmProxy key={`p${i}`} p={p} index={i} />
      ))}
      {beachPalms.map((p, i) => (
        <PalmProxy key={`bp${i}`} p={p} index={i + 1000} />
      ))}
      {bushes.map((p, i) => (
        <Bush key={`b${i}`} p={p} />
      ))}
      {rocks.map((p, i) => (
        <Rock key={`r${i}`} p={p} />
      ))}
      {grass.map((p, i) => (
        <GrassTuft key={`g${i}`} p={p} />
      ))}
    </group>
  )
}

// Wrapper so each palm gets a stable `variant` without re-randomising
function PalmProxy({ p, index }: { p: Placement; index: number }) {
  return <PalmTree position={p.position} scale={p.scale} rotation={p.rotation} variant={index} />
}
