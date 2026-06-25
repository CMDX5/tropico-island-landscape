'use client'

import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { islandHeight, ISLAND_RADIUS } from './terrain'
import { VILLAGE_CENTERS as BUILDING_CENTERS } from './Buildings'

const VILLAGER_COUNT = 50
const WALK_SPEED = 6.0 // faster — explore the whole island
const HOME_COOLDOWN = 5.0 // seconds to "stay home" before going out again

const SHIRT_COLORS = [
  new THREE.Color('#c44a4a'), new THREE.Color('#4a6ac4'),
  new THREE.Color('#4ac46a'), new THREE.Color('#c4a44a'),
  new THREE.Color('#8a4ac4'), new THREE.Color('#4ac4a4'),
  new THREE.Color('#c47a4a'), new THREE.Color('#d4d4d4'),
  new THREE.Color('#e44a4a'), new THREE.Color('#4a8ac4'),
]
const SKIN_COLORS = [
  new THREE.Color('#c8a070'), new THREE.Color('#a07050'),
  new THREE.Color('#d4b080'), new THREE.Color('#8a5a3a'),
  new THREE.Color('#b89060'),
]
const HAT_COLORS = [
  new THREE.Color('#8a6a3a'), new THREE.Color('#6a4a2a'),
  new THREE.Color('#a08040'), new THREE.Color('#5a3a1a'),
  new THREE.Color('#7a5a30'),
]

type Villager = {
  x: number; z: number
  tx: number; tz: number
  phase: number
  villageIdx: number
  homeX: number; homeZ: number
  state: 'walking' | 'home'
  timer: number
}

/**
 * 50 Tropico 6-style villagers:
 *  - Walk ALL OVER the island (not just near villages)
 *  - Periodically return "home" (enter a house), wait, then go out again
 *  - Simplified humanoid: body + head + hat (3 instanced meshes)
 *  - 10 shirt colors, 5 skin tones, 5 hat colors
 *  - Walk animation (bob), faces direction of travel
 */
export function Villagers() {
  const bodyRef = useRef<THREE.InstancedMesh>(null!)
  const headRef = useRef<THREE.InstancedMesh>(null!)
  const hatRef = useRef<THREE.InstancedMesh>(null!)

  const [initVillagers] = useState<Villager[]>(() => {
    let seed = 999
    const rand = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296 }
    const arr: Villager[] = []
    for (let i = 0; i < VILLAGER_COUNT; i++) {
      const vi = i % BUILDING_CENTERS.length
      const [cx, cz] = BUILDING_CENTERS[vi]
      // pick random target ANYWHERE on the island (not just near village)
      const ang = rand() * Math.PI * 2
      const r = 5 + rand() * ISLAND_RADIUS * 0.75
      arr.push({
        x: cx, z: cz,
        tx: Math.cos(ang) * r,
        tz: Math.sin(ang) * r,
        phase: rand() * Math.PI * 2,
        villageIdx: vi,
        homeX: cx, homeZ: cz,
        state: 'walking',
        timer: 0,
      })
    }
    return arr
  })
  const villagers = useRef<Villager[]>(initVillagers.map((v) => ({ ...v })))

  useLayoutEffect(() => {
    villagers.current.forEach((_, i) => {
      bodyRef.current?.setColorAt(i, SHIRT_COLORS[i % SHIRT_COLORS.length])
      headRef.current?.setColorAt(i, SKIN_COLORS[i % SKIN_COLORS.length])
      hatRef.current?.setColorAt(i, HAT_COLORS[i % HAT_COLORS.length])
    })
    if (bodyRef.current?.instanceColor) bodyRef.current.instanceColor.needsUpdate = true
    if (headRef.current?.instanceColor) headRef.current.instanceColor.needsUpdate = true
    if (hatRef.current?.instanceColor) hatRef.current.instanceColor.needsUpdate = true
  }, [initVillagers])

  const mat = useMemo(() => new THREE.Matrix4(), [])
  const pos = useMemo(() => new THREE.Vector3(), [])
  const quat = useMemo(() => new THREE.Quaternion(), [])
  const scl = useMemo(() => new THREE.Vector3(1, 1, 1), [])
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), [])
  // Hidden scale for "home" state (shrink to invisible)
  const hidden = useMemo(() => new THREE.Vector3(0, 0, 0), [])

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const body = bodyRef.current
    const head = headRef.current
    const hat = hatRef.current
    if (!body || !head || !hat) return

    const vlist = villagers.current
    for (let i = 0; i < vlist.length; i++) {
      const v = vlist[i]

      if (v.state === 'home') {
        // Staying home — hidden inside house
        v.timer -= dt
        if (v.timer <= 0) {
          // Go out — pick a random far target anywhere on the island
          v.state = 'walking'
          const ang = Math.random() * Math.PI * 2
          const r = 10 + Math.random() * ISLAND_RADIUS * 0.8
          v.tx = Math.cos(ang) * r
          v.tz = Math.sin(ang) * r
        }
      } else {
        // Walking toward target
        const dx = v.tx - v.x
        const dz = v.tz - v.z
        const dist = Math.hypot(dx, dz)

        if (dist < 2.0) {
          // Reached target — chance to go home or pick new far target
          if (Math.random() < 0.3) {
            // Go home
            v.state = 'home'
            v.timer = HOME_COOLDOWN * (0.5 + Math.random())
            v.x = v.homeX
            v.z = v.homeZ
          } else {
            // Pick new far target anywhere on island
            const ang = Math.random() * Math.PI * 2
            const r = 10 + Math.random() * ISLAND_RADIUS * 0.8
            v.tx = Math.cos(ang) * r
            v.tz = Math.sin(ang) * r
          }
        } else {
          const nx = dx / dist
          const nz = dz / dist
          v.x += nx * WALK_SPEED * dt
          v.z += nz * WALK_SPEED * dt
          v.phase += dt * 10
        }
      }

      const groundY = islandHeight(v.x, v.z)
      const isHome = v.state === 'home'
      const useScale = isHome ? hidden : scl
      const bob = isHome ? 0 : Math.abs(Math.sin(v.phase)) * 0.2
      const y = groundY + bob
      const angle = Math.atan2(v.tx - v.x, v.tz - v.z)
      quat.setFromAxisAngle(up, angle)

      // Body
      pos.set(v.x, y + 0.7, v.z)
      mat.compose(pos, quat, useScale)
      body.setMatrixAt(i, mat)

      // Head
      pos.set(v.x, y + 1.2, v.z)
      mat.compose(pos, quat, useScale)
      head.setMatrixAt(i, mat)

      // Hat (sombrero-like flat cone on head)
      pos.set(v.x, y + 1.35, v.z)
      mat.compose(pos, quat, useScale)
      hat.setMatrixAt(i, mat)
    }
    body.instanceMatrix.needsUpdate = true
    head.instanceMatrix.needsUpdate = true
    hat.instanceMatrix.needsUpdate = true
  })

  return (
    <group>
      {/* body (torso) */}
      <instancedMesh ref={bodyRef} args={[undefined as never, undefined as never, VILLAGER_COUNT]}>
        <boxGeometry args={[0.4, 0.7, 0.3]} />
        <meshStandardMaterial roughness={0.9} flatShading />
      </instancedMesh>
      {/* head */}
      <instancedMesh ref={headRef} args={[undefined as never, undefined as never, VILLAGER_COUNT]}>
        <sphereGeometry args={[0.2, 6, 6]} />
        <meshStandardMaterial roughness={0.9} flatShading />
      </instancedMesh>
      {/* hat (flat cone — sombrero/tropical hat) */}
      <instancedMesh ref={hatRef} args={[undefined as never, undefined as never, VILLAGER_COUNT]}>
        <coneGeometry args={[0.35, 0.15, 8]} />
        <meshStandardMaterial roughness={0.95} flatShading />
      </instancedMesh>
    </group>
  )
}
