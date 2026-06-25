'use client'

import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { scatter } from './terrain'

/**
 * Dense instanced forest — two layers:
 *  1. Jungle: very dense dark-green broadleaf trees packed tightly,
 *     forming a continuous green carpet (no ground visible beneath).
 *  2. Mountain: sparse smaller dark trees on high ground.
 *
 * Uses InstancedMesh (3 meshes per layer: trunk + 2 canopy blobs) so
 * we can push 3000+ trees without performance loss.
 */
export function InstancedForest({ count = 3000 }: { count?: number }) {
  return (
    <group>
      <ForestLayer
        count={Math.floor(count * 0.8)}
        seed={88}
        minH={1.0}
        maxH={14}
        maxSlope={1.6}
        minScale={1.8}
        maxScale={3.2}
        canopyColor="#0f6a0e"
        canopy2Color="#1a7d14"
        trunkScale={1.2}
      />
      <ForestLayer
        count={Math.floor(count * 0.2)}
        seed={142}
        minH={6}
        maxH={20}
        maxSlope={2.2}
        minScale={1.0}
        maxScale={1.8}
        canopyColor="#1a5e14"
        canopy2Color="#0f4a0e"
        trunkScale={0.8}
      />
    </group>
  )
}

function ForestLayer({
  count,
  seed,
  minH,
  maxH,
  maxSlope,
  minScale,
  maxScale,
  canopyColor,
  canopy2Color,
  trunkScale,
}: {
  count: number
  seed: number
  minH: number
  maxH: number
  maxSlope: number
  minScale: number
  maxScale: number
  canopyColor: string
  canopy2Color: string
  trunkScale: number
}) {
  const trunkRef = useRef<THREE.InstancedMesh>(null!)
  const canopyRef = useRef<THREE.InstancedMesh>(null!)
  const canopy2Ref = useRef<THREE.InstancedMesh>(null!)

  const placements = useMemo(
    () =>
      scatter(count, {
        minH,
        maxH,
        maxSlope,
        seed,
        minScale,
        maxScale,
      }),
    [count, seed, minH, maxH, maxSlope, minScale, maxScale],
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
        <cylinderGeometry args={[0.18 * trunkScale, 0.28 * trunkScale, 3.0 * trunkScale, 6]} />
        <meshStandardMaterial color="#6e4f2c" roughness={0.95} flatShading />
      </instancedMesh>
      <instancedMesh
        ref={canopyRef}
        args={[undefined as never, undefined as never, matrices.length]}
      >
        <icosahedronGeometry args={[1.6, 1]} />
        <meshStandardMaterial color={canopyColor} roughness={0.85} flatShading />
      </instancedMesh>
      <instancedMesh
        ref={canopy2Ref}
        args={[undefined as never, undefined as never, matrices.length]}
      >
        <icosahedronGeometry args={[1.0, 1]} />
        <meshStandardMaterial color={canopy2Color} roughness={0.85} flatShading />
      </instancedMesh>
    </group>
  )
}
