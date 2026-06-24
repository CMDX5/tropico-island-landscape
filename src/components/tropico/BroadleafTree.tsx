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
  // slight per-variant offsets so a forest doesn't look cloned
  const foliageShade = variant % 2 === 0 ? '#1f8a1a' : '#238f24'
  const foliageShade2 = variant % 3 === 0 ? '#2da028' : '#197d16'

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
