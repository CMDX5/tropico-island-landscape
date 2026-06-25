'use client'

import { Cloud, Clouds } from '@react-three/drei'
import * as THREE from 'three'

/**
 * Volumetric white cumulus clouds floating HIGH in the sky (y=280-340),
 * well above the volcano (52) and visible from the camera (y=245).
 * Slowly drifting, sparse, tinted warm/golden on the sun-facing side.
 */
export function IslandClouds() {
  return (
    <Clouds material={THREE.MeshBasicMaterial} limit={160}>
      <Cloud
        seed={1}
        segments={20}
        bounds={[50, 6, 50]}
        volume={20}
        color="#ffffff"
        opacity={0.85}
        fade={400}
        speed={0.05}
        position={[-120, 180, -90]}
      />
      <Cloud
        seed={4}
        segments={18}
        bounds={[44, 6, 44]}
        volume={18}
        color="#fff8e8"
        opacity={0.8}
        fade={400}
        speed={0.04}
        position={[140, 200, 110]}
      />
      <Cloud
        seed={9}
        segments={16}
        bounds={[38, 5, 38]}
        volume={15}
        color="#fff5d8"
        opacity={0.75}
        fade={420}
        speed={0.06}
        position={[30, 220, 160]}
      />
      <Cloud
        seed={14}
        segments={14}
        bounds={[32, 5, 32]}
        volume={13}
        color="#ffffff"
        opacity={0.7}
        fade={420}
        speed={0.05}
        position={[-160, 190, 120]}
      />
      <Cloud
        seed={21}
        segments={12}
        bounds={[28, 4, 28]}
        volume={11}
        color="#fff8e8"
        opacity={0.65}
        fade={440}
        speed={0.07}
        position={[170, 210, -120]}
      />
    </Clouds>
  )
}
