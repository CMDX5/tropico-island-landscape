'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { islandHeight, traceRiver } from './terrain'

type RiverProps = {
  seed: [number, number]
  width?: number
}

/**
 * A single river: a path traced downhill from a mountain seed to the
 * coast, rendered as a flat ribbon that hugs the terrain surface with
 * a gentle flowing ripple.
 */
export function River({ seed, width = 1.8 }: RiverProps) {
  const matRef = useRef<THREE.MeshStandardMaterial>(null)

  const geometry = useMemo(() => {
    const path = traceRiver(seed[0], seed[1], 500)
    if (path.length < 2) return null

    const positions: number[] = []
    const uvs: number[] = []
    const indices: number[] = []
    const lift = 0.12 // sit just above the terrain to avoid z-fighting

    for (let i = 0; i < path.length; i++) {
      const [x, z] = path[i]
      const y = islandHeight(x, z) + lift
      // path direction (central differences)
      let dx: number, dz: number
      if (i === 0) {
        dx = path[1][0] - x
        dz = path[1][1] - z
      } else if (i === path.length - 1) {
        dx = x - path[i - 1][0]
        dz = z - path[i - 1][1]
      } else {
        dx = path[i + 1][0] - path[i - 1][0]
        dz = path[i + 1][1] - path[i - 1][1]
      }
      const len = Math.hypot(dx, dz) || 1
      dx /= len
      dz /= len
      // perpendicular in XZ
      const px = -dz
      const pz = dx
      // taper width near the mouth (lower altitude -> narrower)
      const taper = Math.max(0.45, Math.min(1, (y - lift) / 4))
      const w = (width / 2) * taper
      positions.push(x + px * w, y, z + pz * w)
      positions.push(x - px * w, y, z - pz * w)
      uvs.push(0, i * 0.25)
      uvs.push(1, i * 0.25)
    }
    for (let i = 0; i < path.length - 1; i++) {
      const a = i * 2
      indices.push(a, a + 1, a + 2)
      indices.push(a + 1, a + 3, a + 2)
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    geo.setIndex(indices)
    geo.computeVertexNormals()
    return geo
  }, [seed, width])

  // subtle flowing ripple on the V coordinate so the water looks alive
  useFrame(({ clock }) => {
    if (matRef.current) {
      const t = clock.getElapsedTime()
      matRef.current.opacity = 0.82 + Math.sin(t * 1.6) * 0.04
    }
  })

  if (!geometry) return null

  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial
        ref={matRef}
        color="#39c2ec"
        transparent
        opacity={0.85}
        roughness={0.08}
        metalness={0.35}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

/**
 * Rivers seeded on the volcano slopes, flowing down to the sea in
 * different directions (Tropico 6 style).
 */
export function Rivers() {
  // seeds placed on the volcano rim (~22% of island radius from center)
  // in 4 directions so rivers radiate outward to the sea
  const seeds: Array<[number, number]> = useMemo(() => {
    const r = 52 // volcano rim distance from center
    const dirs = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]
    return dirs.map((a) => [Math.cos(a) * r, Math.sin(a) * r] as [number, number])
  }, [])
  return (
    <group>
      {seeds.map((s, i) => (
        <River key={i} seed={s} width={2.5} />
      ))}
    </group>
  )
}
