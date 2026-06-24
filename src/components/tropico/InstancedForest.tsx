'use client'

import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { scatter } from './terrain'

/**
 * Dense instanced forest of broadleaf-style tropical trees, rendered
 * with InstancedMesh (one draw call per part) so we can push the count
 * to ~1500 without tanking the frame rate. Each instance gets a random
 * per-tree scale + rotation, and the whole canopy wobbles gently.
 *
 * Uses three instanced meshes (trunk + 2 canopy blobs) sharing the same
 * transform matrix per instance.
 */
export function InstancedForest({ count = 1500 }: { count?: number }) {
  const trunkRef = useRef<THREE.InstancedMesh>(null!)
  const canopyRef = useRef<THREE.InstancedMesh>(null!)
  const canopy2Ref = useRef<THREE.InstancedMesh>(null!)

  const placements = useMemo(
    () =>
      scatter(count, {
        minH: 1.5,
        maxH: 10,
        maxSlope: 1.4,
        seed: 88,
        minScale: 0.6,
        maxScale: 1.4,
      }),
    [count],
  )

  // Per-instance matrices (composed once)
  const matrices = useMemo(() => {
    const m = new THREE.Matrix4()
    const pos = new THREE.Vector3()
    const quat = new THREE.Quaternion()
    const scl = new THREE.Vector3()
    const up = new THREE.Vector3(0, 1, 0)
    const arr: THREE.Matrix4[] = []
    for (const p of placements) {
      pos.set(p.position[0], p.position[1], p.position[2])
      quat.setFromAxisAngle(up, p.rotation)
      const s = p.scale
      scl.set(s, s, s)
      m.compose(pos, quat, scl)
      arr.push(m.clone())
    }
    return arr
  }, [placements])

  // Apply matrices once the instanced meshes are mounted
  useLayoutEffect(() => {
    matrices.forEach((m, i) => {
      trunkRef.current?.setMatrixAt(i, m)
      canopyRef.current?.setMatrixAt(i, m)
      canopy2Ref.current?.setMatrixAt(i, m)
    })
    if (trunkRef.current) trunkRef.current.instanceMatrix.needsUpdate = true
    if (canopyRef.current) canopyRef.current.instanceMatrix.needsUpdate = true
    if (canopy2Ref.current) canopy2Ref.current.instanceMatrix.needsUpdate = true
  }, [matrices])

  // Gentle canopy wobble (applied to the canopy groups, not per-instance)
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (canopyRef.current) {
      canopyRef.current.rotation.z = Math.sin(t * 0.8) * 0.015
      canopyRef.current.rotation.x = Math.cos(t * 0.6) * 0.01
    }
    if (canopy2Ref.current) {
      canopy2Ref.current.rotation.z = Math.sin(t * 0.7 + 1) * 0.012
      canopy2Ref.current.rotation.x = Math.cos(t * 0.5 + 0.5) * 0.008
    }
  })

  return (
    <group>
      <instancedMesh
        ref={trunkRef}
        args={[undefined as never, undefined as never, matrices.length]}
        castShadow
        receiveShadow
      >
        <cylinderGeometry args={[0.14, 0.22, 2.2, 5]} />
        <meshStandardMaterial color="#6e4f2c" roughness={0.95} flatShading />
      </instancedMesh>
      <instancedMesh
        ref={canopyRef}
        args={[undefined as never, undefined as never, matrices.length]}
        castShadow
      >
        <icosahedronGeometry args={[0.95, 1]} />
        <meshStandardMaterial color="#1f8a1a" roughness={0.85} flatShading />
      </instancedMesh>
      <instancedMesh
        ref={canopy2Ref}
        args={[undefined as never, undefined as never, matrices.length]}
        castShadow
      >
        <icosahedronGeometry args={[0.6, 1]} />
        <meshStandardMaterial color="#238f24" roughness={0.85} flatShading />
      </instancedMesh>
    </group>
  )
}
