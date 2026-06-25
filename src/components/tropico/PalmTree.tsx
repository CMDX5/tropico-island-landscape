'use client'

import * as THREE from 'three'

type PalmProps = {
  position: [number, number, number]
  scale?: number
  rotation?: number
  variant?: number
}

/**
 * Tropico 6-style palm tree — strongly curved trunk + large drooping crown.
 * 3 meshes (trunk + crown + shadow blob) for good perf.
 * Trunk leans 40-60° from vertical. Crown is wide and flat (drooping fronds).
 */
export function PalmTree({ position, scale = 1, rotation = 0, variant = 0 }: PalmProps) {
  // strong curve: 40-60° lean (0.7-1.05 rad)
  const bend = 0.7 + (variant % 4) * 0.12
  const trunkColor = ['#a08055', '#8a6a43', '#7a5c3a', '#6e4f2c'][variant % 4]
  const frondColor = ['#2f9f2a', '#35aa2c', '#277d22', '#3ab030'][variant % 4]
  const crownX = Math.sin(bend) * 2.2
  const crownY = Math.cos(bend) * 4.0

  return (
    <group position={position} scale={scale} rotation={[0, rotation, 0]}>
      {/* trunk — strongly curved cylinder (40-60° lean) */}
      <mesh position={[Math.sin(bend) * 1.8, 2.2, 0]} rotation={[0, 0, bend]}>
        <cylinderGeometry args={[0.16, 0.30, 5.0, 6]} />
        <meshStandardMaterial color={trunkColor} roughness={0.95} flatShading />
      </mesh>
      {/* crown — wide flat cone (large drooping fronds) */}
      <mesh position={[crownX, crownY + 0.5, 0]} rotation={[0, 0, bend * 0.3]}>
        <coneGeometry args={[3.0, 2.2, 8, 1, false]} />
        <meshStandardMaterial color={frondColor} roughness={0.8} side={THREE.DoubleSide} flatShading />
      </mesh>
      {/* shadow blob beneath the tree */}
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.0, 8]} />
        <meshBasicMaterial color="#1a3a0e" transparent opacity={0.3} />
      </mesh>
    </group>
  )
}
