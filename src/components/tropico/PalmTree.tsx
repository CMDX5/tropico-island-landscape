'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

type PalmProps = {
  position: [number, number, number]
  scale?: number
  rotation?: number
  variant?: number
}

const FROND_COUNT = 8

/**
 * Procedural palm tree: a slightly curved segmented trunk, a crown of
 * drooping fronds and a couple of coconuts. The crown gently sways
 * in the wind.
 */
export function PalmTree({ position, scale = 1, rotation = 0, variant = 0 }: PalmProps) {
  const crown = useRef<THREE.Group>(null)
  const phase = useRef(variant * 1.7)

  useFrame(({ clock }) => {
    if (!crown.current) return
    const t = clock.getElapsedTime() + phase.current
    crown.current.rotation.z = Math.sin(t * 0.9) * 0.06
    crown.current.rotation.x = Math.cos(t * 0.7) * 0.04
  })

  const bend = 0.12 + (variant % 3) * 0.04

  return (
    <group position={position} scale={scale} rotation={[0, rotation, 0]}>
      {/* trunk - two segments to fake a gentle curve */}
      <mesh position={[0, 1.1, 0]} rotation={[0, 0, bend]} castShadow>
        <cylinderGeometry args={[0.13, 0.22, 2.4, 7]} />
        <meshStandardMaterial color="#8a6a43" roughness={0.95} />
      </mesh>
      <mesh
        position={[Math.sin(bend) * 1.2, 2.35, 0]}
        rotation={[0, 0, bend * 1.6]}
        castShadow
      >
        <cylinderGeometry args={[0.09, 0.13, 1.3, 7]} />
        <meshStandardMaterial color="#7a5c3a" roughness={0.95} />
      </mesh>

      {/* crown */}
      <group ref={crown} position={[Math.sin(bend) * 1.2 + Math.sin(bend * 1.6) * 0.6, 3.0, 0]}>
        {Array.from({ length: FROND_COUNT }).map((_, i) => {
          const a = (i / FROND_COUNT) * Math.PI * 2
          const droop = 0.45 + (i % 2) * 0.18
          return (
            <group key={i} rotation={[0, a, 0]}>
              <mesh
                position={[1.15, 0.05, 0]}
                rotation={[0, 0, -Math.PI / 2 - droop]}
                castShadow
              >
                <coneGeometry args={[0.34, 2.4, 4, 1, false]} />
                <meshStandardMaterial
                  color={i % 2 ? '#2f8f2a' : '#358f2c'}
                  roughness={0.8}
                  side={THREE.DoubleSide}
                  flatShading
                />
              </mesh>
              {/* small leaflets detail */}
              <mesh position={[1.9, -0.15, 0]} rotation={[0, 0, -1.2]}>
                <coneGeometry args={[0.12, 0.9, 4]} />
                <meshStandardMaterial color="#277d22" roughness={0.85} flatShading />
              </mesh>
            </group>
          )
        })}

        {/* coconuts */}
        <mesh position={[0.12, -0.18, 0.08]} castShadow>
          <sphereGeometry args={[0.12, 8, 8]} />
          <meshStandardMaterial color="#5a3a1a" roughness={0.85} />
        </mesh>
        <mesh position={[-0.06, -0.2, -0.1]} castShadow>
          <sphereGeometry args={[0.11, 8, 8]} />
          <meshStandardMaterial color="#52341a" roughness={0.85} />
        </mesh>
        <mesh position={[0.0, -0.22, 0.12]} castShadow>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshStandardMaterial color="#4e3018" roughness={0.85} />
        </mesh>
      </group>
    </group>
  )
}
