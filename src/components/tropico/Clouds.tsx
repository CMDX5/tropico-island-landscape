'use client'

import { Cloud, Clouds } from '@react-three/drei'
import * as THREE from 'three'

/**
 * A few fluffy cumulus clouds drifting high above the island.
 * Kept light (≈50% smaller / less dense than before) so they don't
 * obscure the terrain underneath.
 */
export function IslandClouds() {
  return (
    <Clouds material={THREE.MeshBasicMaterial} limit={120}>
      <Cloud
        seed={1}
        segments={14}
        bounds={[30, 6, 30]}
        volume={13}
        color="#ffffff"
        opacity={0.55}
        fade={120}
        speed={0.15}
        position={[-26, 40, -22]}
      />
      <Cloud
        seed={4}
        segments={11}
        bounds={[26, 5, 26]}
        volume={10}
        color="#fff7ee"
        opacity={0.5}
        fade={120}
        speed={0.12}
        position={[30, 46, 16]}
      />
      <Cloud
        seed={9}
        segments={9}
        bounds={[20, 4, 20]}
        volume={7}
        color="#ffffff"
        opacity={0.45}
        fade={120}
        speed={0.1}
        position={[8, 52, 34]}
      />
    </Clouds>
  )
}
