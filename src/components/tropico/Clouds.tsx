'use client'

import { Cloud, Clouds } from '@react-three/drei'
import * as THREE from 'three'

/**
 * A couple of light cumulus wisps kept at the far edges of the scene so
 * they never obscure the island terrain underneath.
 */
export function IslandClouds() {
  return (
    <Clouds material={THREE.MeshBasicMaterial} limit={80}>
      <Cloud
        seed={1}
        segments={10}
        bounds={[22, 4, 22]}
        volume={8}
        color="#ffffff"
        opacity={0.45}
        fade={140}
        speed={0.12}
        position={[-40, 44, -32]}
      />
      <Cloud
        seed={4}
        segments={8}
        bounds={[18, 4, 18]}
        volume={6}
        color="#fff7ee"
        opacity={0.4}
        fade={140}
        speed={0.1}
        position={[42, 50, 30]}
      />
    </Clouds>
  )
}
