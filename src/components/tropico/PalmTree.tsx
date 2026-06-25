'use client'

import * as THREE from 'three'

type PalmProps = {
  position: [number, number, number]
  scale?: number
  rotation?: number
  variant?: number
}

/**
 * Tropico 6-style palm tree — SIMPLIFIED for performance (2 meshes only):
 *  - 1 curved trunk (cylinder, tilted)
 *  - 1 drooping frond crown (cone, wide and flat)
 * Tall (3x building height), curved trunk, drooping fronds.
 * Uses only 2 draw calls per tree (was 19) for smooth performance.
 */
export function PalmTree({ position, scale = 1, rotation = 0, variant = 0 }: PalmProps) {
  const bend = 0.22 + (variant % 3) * 0.08
  const trunkColor = ['#8a6a43', '#7a5c3a', '#6e4f2c'][variant % 3]
  const frondColor = ['#2f8f2a', '#358f2c', '#277d22', '#3aa030'][variant % 4]
  const crownX = Math.sin(bend) * 1.5

  return (
    <group position={position} scale={scale} rotation={[0, rotation, 0]}>
      {/* trunk — single curved cylinder */}
      <mesh position={[0, 2.0, 0]} rotation={[0, 0, bend]}>
        <cylinderGeometry args={[0.14, 0.28, 4.5, 7]} />
        <meshStandardMaterial color={trunkColor} roughness={0.95} flatShading />
      </mesh>
      {/* crown — wide flat cone simulating drooping fronds */}
      <mesh position={[crownX, 4.5, 0]} rotation={[0, 0, bend * 0.5]}>
        <coneGeometry args={[2.2, 1.8, 8, 1, false]} />
        <meshStandardMaterial color={frondColor} roughness={0.8} side={THREE.DoubleSide} flatShading />
      </mesh>
    </group>
  )
}
