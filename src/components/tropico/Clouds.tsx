'use client'

import { Cloud, Clouds } from '@react-three/drei'
import * as THREE from 'three'

/**
 * Volumetric white cumulus clouds scattered around the island, slowly
 * drifting. Tinted warm/golden on the sun-facing side to match the
 * tropical Caribbean sunny-day atmosphere of Tropico 6.
 */
export function IslandClouds() {
  return (
    <Clouds material={THREE.MeshBasicMaterial} limit={140}>
      <Cloud
        seed={1}
        segments={18}
        bounds={[40, 7, 40]}
        volume={18}
        color="#fff8e8"
        opacity={0.7}
        fade={200}
        speed={0.08}
        position={[-180, 120, -140]}
      />
      <Cloud
        seed={4}
        segments={16}
        bounds={[36, 6, 36]}
        volume={16}
        color="#ffffff"
        opacity={0.65}
        fade={200}
        speed={0.07}
        position={[200, 140, 120]}
      />
      <Cloud
        seed={9}
        segments={14}
        bounds={[30, 5, 30]}
        volume={13}
        color="#fff5d8"
        opacity={0.6}
        fade={200}
        speed={0.06}
        position={[60, 160, 220]}
      />
      <Cloud
        seed={14}
        segments={12}
        bounds={[26, 5, 26]}
        volume={11}
        color="#ffffff"
        opacity={0.55}
        fade={220}
        speed={0.05}
        position={[-220, 130, 180]}
      />
      <Cloud
        seed={21}
        segments={10}
        bounds={[22, 4, 22]}
        volume={9}
        color="#fff8e8"
        opacity={0.5}
        fade={220}
        speed={0.09}
        position={[240, 150, -180]}
      />
    </Clouds>
  )
}
