'use client'

import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { scatter } from './terrain'

/**
 * Dense instanced forest of broadleaf-style tropical trees, rendered
 * with InstancedMesh (one draw call per part) so we can push the count
 * very high without tanking the frame rate.
 *
 * Three instanced meshes (trunk + 2 canopy blobs) share the same
 * transform matrix per instance.
 */
export function InstancedForest({ count = 6000 }: { count?: number }) {
  const trunkRef = useRef<THREE.InstancedMesh>(null!)
  const canopyRef = useRef<THREE.InstancedMesh>(null!)
  const canopy2Ref = useRef<THREE.InstancedMesh>(null!)

  const placements = useMemo(
    () =>
      scatter(count, {
        minH: 1.0,
        maxH: 16,
        maxSlope: 1.8,
        seed: 88,
        minScale: 2.5,
        maxScale: 4.5,
      }),
    [count],
  )

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

  return (
    <group>
      <instancedMesh
        ref={trunkRef}
        args={[undefined as never, undefined as never, matrices.length]}
      >
        <cylinderGeometry args={[0.18, 0.28, 3.0, 6]} />
        <meshStandardMaterial color="#6e4f2c" roughness={0.95} flatShading />
      </instancedMesh>
      <instancedMesh
        ref={canopyRef}
        args={[undefined as never, undefined as never, matrices.length]}
      >
        <icosahedronGeometry args={[1.4, 1]} />
        <meshStandardMaterial color="#1f8a1a" roughness={0.85} flatShading />
      </instancedMesh>
      <instancedMesh
        ref={canopy2Ref}
        args={[undefined as never, undefined as never, matrices.length]}
      >
        <icosahedronGeometry args={[0.85, 1]} />
        <meshStandardMaterial color="#2da028" roughness={0.85} flatShading />
      </instancedMesh>
    </group>
  )
}
