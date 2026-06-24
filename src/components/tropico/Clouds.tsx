'use client'

import { Cloud, Clouds } from '@react-three/drei'
import * as THREE from 'three'

/** A few fluffy cumulus clouds drifting high above the island. */
export function IslandClouds() {
  return (
    <Clouds material={THREE.MeshBasicMaterial} limit={200}>
      <Cloud
        seed={1}
        segments={28}
        bounds={[60, 12, 60]}
        volume={26}
        color="#ffffff"
        opacity={0.7}
        fade={120}
        speed={0.15}
        position={[-20, 34, -18]}
      />
      <Cloud
        seed={4}
        segments={22}
        bounds={[50, 10, 50]}
        volume={20}
        color="#fff7ee"
        opacity={0.6}
        fade={120}
        speed={0.12}
        position={[28, 40, 14]}
      />
      <Cloud
        seed={9}
        segments={18}
        bounds={[40, 8, 40]}
        volume={14}
        color="#ffffff"
        opacity={0.55}
        fade={120}
        speed={0.1}
        position={[6, 46, 30]}
      />
    </Clouds>
  )
}
