'use client'

import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const SIZE = 500
const SEGMENTS = 90

/**
 * Animated tropical ocean. Vertex displacement gives gentle rolling
 * waves; the shallow turquoise surface sits above a deep blue plane so
 * beaches read clearly against the water.
 */
export function Ocean() {
  const surfaceRef = useRef<THREE.Mesh>(null!)
  const baseRef = useRef<Float32Array | null>(null)

  // Logical grid (x, z) used for wave math — independent of the geometry
  const grid = useMemo(() => {
    const step = SIZE / SEGMENTS
    const xs = new Float32Array((SEGMENTS + 1) * (SEGMENTS + 1))
    const zs = new Float32Array((SEGMENTS + 1) * (SEGMENTS + 1))
    let k = 0
    for (let j = 0; j <= SEGMENTS; j++) {
      for (let i = 0; i <= SEGMENTS; i++) {
        xs[k] = -SIZE / 2 + i * step
        zs[k] = -SIZE / 2 + j * step
        k++
      }
    }
    return { xs, zs }
  }, [])

  // Rotate the geometry once so it lies flat in the XZ plane, then cache
  // the base vertex heights (all zero) — we mutate via the ref each frame.
  useLayoutEffect(() => {
    const mesh = surfaceRef.current
    if (!mesh) return
    const geo = mesh.geometry as THREE.BufferGeometry
    geo.rotateX(-Math.PI / 2)
    baseRef.current = new Float32Array(geo.attributes.position.array)
  }, [])

  useFrame(({ clock }) => {
    const mesh = surfaceRef.current
    if (!mesh) return
    const geo = mesh.geometry as THREE.BufferGeometry
    const pos = geo.attributes.position as THREE.BufferAttribute
    const t = clock.getElapsedTime()
    const { xs, zs } = grid
    for (let i = 0; i < pos.count; i++) {
      const x = xs[i]
      const z = zs[i]
      const wave =
        Math.sin(x * 0.12 + t * 0.9) * 0.28 +
        Math.cos(z * 0.1 + t * 0.7) * 0.24 +
        Math.sin((x + z) * 0.06 + t * 0.5) * 0.18
      pos.setY(i, wave)
    }
    pos.needsUpdate = true
    geo.computeVertexNormals()
  })

  return (
    <group>
      {/* deep water */}
      <mesh position={[0, -3.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[SIZE, SIZE]} />
        <meshStandardMaterial color="#0d5b8a" roughness={0.4} metalness={0.1} />
      </mesh>
      {/* shallow animated surface */}
      <mesh ref={surfaceRef} position={[0, -0.25, 0]} receiveShadow>
        <planeGeometry args={[SIZE, SIZE, SEGMENTS, SEGMENTS]} />
        <meshStandardMaterial
          color="#1ea8cf"
          transparent
          opacity={0.82}
          roughness={0.12}
          metalness={0.2}
        />
      </mesh>
    </group>
  )
}
