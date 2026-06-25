'use client'

import { Cloud, Clouds } from '@react-three/drei'
import * as THREE from 'three'

/**
 * Volumetric white cumulus clouds floating HIGH in the sky (well above
 * the terrain and volcano), slowly drifting. Sparse so they don't cover
 * the island. Tinted warm/golden on the sun-facing side.
 *
 * Clouds are placed at y=300-400 (far above the volcano summit ~52 and
 * the camera at y=245) so they NEVER clip through the terrain.
 */
export function IslandClouds() {
  return (
    <Clouds material={THREE.MeshBasicMaterial} limit={120}>
      <Cloud
        seed={1}
        segments={14}
        bounds={[28, 4, 28]}
        volume={10}
        color="#fff8e8"
        opacity={0.75}
        fade={300}
        speed={0.06}
        position={[-280, 340, -200]}
      />
      <Cloud
        seed={4}
        segments={12}
        bounds={[24, 4, 24]}
        volume={9}
        color="#ffffff"
        opacity={0.7}
        fade={300}
        speed={0.05}
        position={[300, 360, 180]}
      />
      <Cloud
        seed={9}
        segments={10}
        bounds={[20, 3, 20]}
        volume={7}
        color="#fff5d8"
        opacity={0.65}
        fade={320}
        speed={0.04}
        position={[80, 380, 320]}
      />
      <Cloud
        seed={14}
        segments={9}
        bounds={[18, 3, 18]}
        volume={6}
        color="#ffffff"
        opacity={0.6}
        fade={320}
        speed={0.07}
        position={[-320, 350, 260]}
      />
    </Clouds>
  )
}
