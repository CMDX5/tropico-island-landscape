'use client'

import { Cloud, Clouds } from '@react-three/drei'
import * as THREE from 'three'

/**
 * Large volumetric white cumulus clouds floating in the sky, slowly
 * drifting. Bigger and more present than before, tinted warm/golden
 * on the sun-facing side. Placed high enough to never clip the terrain.
 */
export function IslandClouds() {
  return (
    <Clouds material={THREE.MeshBasicMaterial} limit={220}>
      <Cloud
        seed={1}
        segments={28}
        bounds={[90, 10, 90]}
        volume={40}
        color="#ffffff"
        opacity={0.9}
        fade={500}
        speed={0.04}
        position={[-600, 650, -400]}
      />
      <Cloud
        seed={4}
        segments={26}
        bounds={[80, 9, 80]}
        volume={36}
        color="#fff8e8"
        opacity={0.85}
        fade={500}
        speed={0.035}
        position={[680, 720, 460]}
      />
      <Cloud
        seed={9}
        segments={24}
        bounds={[70, 8, 70]}
        volume={32}
        color="#fff5d8"
        opacity={0.8}
        fade={520}
        speed={0.05}
        position={[120, 780, 680]}
      />
      <Cloud
        seed={14}
        segments={22}
        bounds={[64, 8, 64]}
        volume={28}
        color="#ffffff"
        opacity={0.78}
        fade={520}
        speed={0.045}
        position={[-740, 680, 540]}
      />
      <Cloud
        seed={21}
        segments={20}
        bounds={[56, 7, 56]}
        volume={24}
        color="#fff8e8"
        opacity={0.72}
        fade={540}
        speed={0.06}
        position={[820, 740, -540]}
      />
      <Cloud
        seed={28}
        segments={18}
        bounds={[48, 6, 48]}
        volume={20}
        color="#ffffff"
        opacity={0.68}
        fade={540}
        speed={0.055}
        position={[-200, 820, -740]}
      />
    </Clouds>
  )
}
