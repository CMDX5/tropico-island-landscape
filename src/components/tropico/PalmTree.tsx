'use client'

import * as THREE from 'three'

type PalmProps = {
  position: [number, number, number]
  scale?: number
  rotation?: number
  variant?: number
}

const FROND_COUNT = 14

/**
 * Tropico 6-style palm tree:
 *  - trunk with a strong natural curve (3 segments, bends more toward top)
 *  - large drooping fronds that hang down toward the ground
 *  - tall (crown sits at ~5 units, 3x a building's height)
 *  - placed on beaches and forest edges
 */
export function PalmTree({ position, scale = 1, rotation = 0, variant = 0 }: PalmProps) {
  // strong curve — never a straight trunk (Tropico 6 style)
  const bend = 0.22 + (variant % 3) * 0.08
  const trunkColor = ['#8a6a43', '#7a5c3a', '#6e4f2c'][variant % 3]
  const frondColors = ['#2f8f2a', '#358f2c', '#277d22', '#3aa030']

  // trunk segment offsets (each bends more — natural palm curve)
  const s1x = Math.sin(bend) * 1.3
  const s2x = s1x + Math.sin(bend * 1.8) * 1.1
  const crownX = s2x + Math.sin(bend * 2.4) * 0.5

  return (
    <group position={position} scale={scale} rotation={[0, rotation, 0]}>
      {/* trunk — 3 segments with increasing bend (natural curve) */}
      <mesh position={[0, 1.3, 0]} rotation={[0, 0, bend]}>
        <cylinderGeometry args={[0.16, 0.28, 2.8, 7]} />
        <meshStandardMaterial color={trunkColor} roughness={0.95} />
      </mesh>
      <mesh position={[s1x, 2.7, 0]} rotation={[0, 0, bend * 1.8]}>
        <cylinderGeometry args={[0.12, 0.16, 1.6, 7]} />
        <meshStandardMaterial color={trunkColor} roughness={0.95} />
      </mesh>
      <mesh position={[s2x, 3.9, 0]} rotation={[0, 0, bend * 2.4]}>
        <cylinderGeometry args={[0.09, 0.12, 1.2, 7]} />
        <meshStandardMaterial color={trunkColor} roughness={0.95} />
      </mesh>

      {/* crown — sits high (~5 units), large drooping fronds */}
      <group position={[crownX, 4.8, 0]}>
        {Array.from({ length: FROND_COUNT }).map((_, i) => {
          const a = (i / FROND_COUNT) * Math.PI * 2
          // strong droop — fronds hang down (Tropico 6 style)
          const droop = 0.7 + (i % 3) * 0.12
          return (
            <group key={i} rotation={[0, a, 0]}>
              {/* main frond — long and drooping */}
              <mesh
                position={[1.6, -0.3, 0]}
                rotation={[0, 0, -Math.PI / 2 - droop]}
              >
                <coneGeometry args={[0.42, 3.2, 4, 1, false]} />
                <meshStandardMaterial
                  color={frondColors[i % frondColors.length]}
                  roughness={0.8}
                  side={THREE.DoubleSide}
                  flatShading
                />
              </mesh>
              {/* frond tip — droops further down */}
              <mesh position={[2.8, -0.8, 0]} rotation={[0, 0, -1.5]}>
                <coneGeometry args={[0.16, 1.4, 4]} />
                <meshStandardMaterial color="#277d22" roughness={0.85} flatShading />
              </mesh>
            </group>
          )
        })}

        {/* coconuts */}
        <mesh position={[0.15, -0.25, 0.1]}>
          <sphereGeometry args={[0.15, 8, 8]} />
          <meshStandardMaterial color="#5a3a1a" roughness={0.85} />
        </mesh>
        <mesh position={[-0.08, -0.28, -0.12]}>
          <sphereGeometry args={[0.13, 8, 8]} />
          <meshStandardMaterial color="#52341a" roughness={0.85} />
        </mesh>
      </group>
    </group>
  )
}
