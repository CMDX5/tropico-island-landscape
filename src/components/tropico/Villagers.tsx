'use client'

import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { islandHeight } from './terrain'
import { VILLAGE_CENTERS as BUILDING_CENTERS } from './Buildings'

const VILLAGER_COUNT = 50
const WALK_SPEED = 3.5 // world units / sec
const PICK_DISTANCE = 15 // max distance to pick new target from village center

const SHIRT_COLORS = [
  new THREE.Color('#c44a4a'), // red
  new THREE.Color('#4a6ac4'), // blue
  new THREE.Color('#4ac46a'), // green
  new THREE.Color('#c4a44a'), // yellow
  new THREE.Color('#8a4ac4'), // purple
  new THREE.Color('#4ac4a4'), // teal
  new THREE.Color('#c47a4a'), // orange
  new THREE.Color('#6a6a6a'), // gray
]
const SKIN_COLORS = [
  new THREE.Color('#c8a070'),
  new THREE.Color('#a07050'),
  new THREE.Color('#d4b080'),
  new THREE.Color('#8a5a3a'),
]

type Villager = {
  x: number
  z: number
  tx: number // target x
  tz: number // target z
  phase: number // walk animation phase
  villageIdx: number
}

/**
 * 50 villagers walking around the island near their villages, entering
 * and exiting houses. Uses InstancedMesh (3 meshes: body + head + legs)
 * for performance — only 3 draw calls total.
 */
export function Villagers() {
  const bodyRef = useRef<THREE.InstancedMesh>(null!)
  const headRef = useRef<THREE.InstancedMesh>(null!)
  const legsRef = useRef<THREE.InstancedMesh>(null!)

  // Initialize villagers near village centers (useState for init, ref for mutations)
  const [initVillagers] = useState<Villager[]>(() => {
    let seed = 999
    const rand = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
      return seed / 4294967296
    }
    const arr: Villager[] = []
    const centers = BUILDING_CENTERS.length
    for (let i = 0; i < VILLAGER_COUNT; i++) {
      const vi = i % centers
      const [cx, cz] = BUILDING_CENTERS[vi]
      const ang = rand() * Math.PI * 2
      const r = 2 + rand() * 12
      const x = cx + Math.cos(ang) * r
      const z = cz + Math.sin(ang) * r
      const tang = rand() * Math.PI * 2
      const tr = 2 + rand() * PICK_DISTANCE
      arr.push({
        x,
        z,
        tx: cx + Math.cos(tang) * tr,
        tz: cz + Math.sin(tang) * tr,
        phase: rand() * Math.PI * 2,
        villageIdx: vi,
      })
    }
    return arr
  })
  // Mutable copy for runtime (avoids mutating useState value)
  const villagers = useRef<Villager[]>(initVillagers.map((v) => ({ ...v })))

  // Per-instance colors
  useLayoutEffect(() => {
    villagers.current.forEach((_, i) => {
      bodyRef.current?.setColorAt(i, SHIRT_COLORS[i % SHIRT_COLORS.length])
      headRef.current?.setColorAt(i, SKIN_COLORS[i % SKIN_COLORS.length])
      legsRef.current?.setColorAt(i, new THREE.Color('#3a2a1a'))
    })
    if (bodyRef.current?.instanceColor) bodyRef.current.instanceColor.needsUpdate = true
    if (headRef.current?.instanceColor) headRef.current.instanceColor.needsUpdate = true
    if (legsRef.current?.instanceColor) legsRef.current.instanceColor.needsUpdate = true
  }, [initVillagers])

  // Reusable temp objects
  const mat = useMemo(() => new THREE.Matrix4(), [])
  const pos = useMemo(() => new THREE.Vector3(), [])
  const quat = useMemo(() => new THREE.Quaternion(), [])
  const scl = useMemo(() => new THREE.Vector3(1, 1, 1), [])
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), [])

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const body = bodyRef.current
    const head = headRef.current
    const legs = legsRef.current
    if (!body || !head || !legs) return

    const vlist = villagers.current
    for (let i = 0; i < vlist.length; i++) {
      const v = vlist[i]
      // Move toward target
      const dx = v.tx - v.x
      const dz = v.tz - v.z
      const dist = Math.hypot(dx, dz)

      if (dist < 1.0) {
        // Reached target — pick a new one near the village center
        const [cx, cz] = BUILDING_CENTERS[v.villageIdx]
        const ang = Math.random() * Math.PI * 2
        const r = 2 + Math.random() * PICK_DISTANCE
        v.tx = cx + Math.cos(ang) * r
        v.tz = cz + Math.sin(ang) * r
      } else {
        // Walk toward target
        const nx = dx / dist
        const nz = dz / dist
        v.x += nx * WALK_SPEED * dt
        v.z += nz * WALK_SPEED * dt
        v.phase += dt * 8 // walk animation speed
      }

      const groundY = islandHeight(v.x, v.z)
      const bob = Math.abs(Math.sin(v.phase)) * 0.15 // vertical bob (walk)
      const y = groundY + bob

      // Face direction of movement
      const angle = Math.atan2(dx, dz)
      quat.setFromAxisAngle(up, angle)

      // Body: slightly above ground
      pos.set(v.x, y + 0.6, v.z)
      mat.compose(pos, quat, scl)
      body.setMatrixAt(i, mat)

      // Head: on top of body
      pos.set(v.x, y + 1.1, v.z)
      mat.compose(pos, quat, scl)
      head.setMatrixAt(i, mat)

      // Legs: at ground level, slight sway
      pos.set(v.x, y + 0.2, v.z)
      mat.compose(pos, quat, scl)
      legs.setMatrixAt(i, mat)
    }
    body.instanceMatrix.needsUpdate = true
    head.instanceMatrix.needsUpdate = true
    legs.instanceMatrix.needsUpdate = true
  })

  return (
    <group>
      {/* body (torso) */}
      <instancedMesh ref={bodyRef} args={[undefined as never, undefined as never, VILLAGER_COUNT]}>
        <boxGeometry args={[0.35, 0.6, 0.25]} />
        <meshStandardMaterial roughness={0.9} flatShading />
      </instancedMesh>
      {/* head */}
      <instancedMesh ref={headRef} args={[undefined as never, undefined as never, VILLAGER_COUNT]}>
        <sphereGeometry args={[0.18, 6, 6]} />
        <meshStandardMaterial roughness={0.9} flatShading />
      </instancedMesh>
      {/* legs */}
      <instancedMesh ref={legsRef} args={[undefined as never, undefined as never, VILLAGER_COUNT]}>
        <boxGeometry args={[0.28, 0.4, 0.2]} />
        <meshStandardMaterial roughness={0.9} flatShading />
      </instancedMesh>
    </group>
  )
}
