'use client'

import * as THREE from 'three'

type BroadleafProps = {
  position: [number, number, number]
  scale?: number
  rotation?: number
  variant?: number
}

/**
 * Cartoon-style tropical broadleaf tree (mango/fig silhouette):
 * a straight tapered trunk topped with 3 overlapping round foliage
 * blobs. (Wind sway removed for perf.)
 */
export function BroadleafTree({ position, scale = 1, rotation = 0, variant = 0 }: BroadleafProps) {
  // varied foliage colors per variant so the forest isn't uniform
  const palette = [
    ['#1f8a1a', '#2da028'],
    ['#176a14', '#1f7a18'],
    ['#2a9d22', '#3aa832'],
    ['#1a7d12', '#248a1c'],
    ['#0f6a0e', '#1a7d14'],
  ]
  const [foliageShade, foliageShade2] = palette[variant % palette.length]

  return (
    <group position={position} scale={scale} rotation={[0, rotation, 0]}>
      {/* trunk */}
      <mesh position={[0, 1.1, 0]}>
        <cylinderGeometry args={[0.16, 0.26, 2.4, 6]} />
        <meshStandardMaterial color="#6e4f2c" roughness={0.95} flatShading />
      </mesh>

      {/* canopy */}
      <group position={[0, 2.7, 0]}>
        <mesh position={[0, 0, 0]}>
          <icosahedronGeometry args={[1.05, 1]} />
          <meshStandardMaterial color={foliageShade} roughness={0.85} flatShading />
        </mesh>
        <mesh position={[0.7, 0.35, 0.3]}>
          <icosahedronGeometry args={[0.7, 1]} />
          <meshStandardMaterial color={foliageShade2} roughness={0.85} flatShading />
        </mesh>
        <mesh position={[-0.65, 0.3, -0.25]}>
          <icosahedronGeometry args={[0.66, 1]} />
          <meshStandardMaterial color={foliageShade} roughness={0.85} flatShading />
        </mesh>
        <mesh position={[0.1, 0.85, -0.2]}>
          <icosahedronGeometry args={[0.55, 1]} />
          <meshStandardMaterial color={foliageShade2} roughness={0.85} flatShading />
        </mesh>
      </group>
    </group>
  )
}
