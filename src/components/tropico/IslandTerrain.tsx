'use client'

import { useMemo } from 'react'
import * as THREE from 'three'
import { ISLAND_SIZE, islandHeight, islandColor } from './terrain'

/**
 * Procedural island terrain built as a custom XZ grid.
 * Each vertex height + color is derived from the shared `islandHeight`
 * / `islandColor` functions so that vegetation placement matches the
 * ground exactly.
 */
export function IslandTerrain() {
  // 3-step cel-shading gradient map for a cartoon painted look
  const gradientMap = useMemo(() => {
    const data = new Uint8Array([
      110, 110, 110, 255,
      175, 175, 175, 255,
      255, 255, 255, 255,
    ])
    const tex = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat)
    tex.needsUpdate = true
    tex.minFilter = THREE.NearestFilter
    tex.magFilter = THREE.NearestFilter
    tex.generateMipmaps = false
    return tex
  }, [])

  const geometry = useMemo(() => {
    const seg = 220
    const half = ISLAND_SIZE / 2
    const step = ISLAND_SIZE / seg
    const positions: number[] = []
    const colors: number[] = []
    const indices: number[] = []

    const col = new THREE.Color()
    for (let j = 0; j <= seg; j++) {
      for (let i = 0; i <= seg; i++) {
        const x = -half + i * step
        const z = -half + j * step
        const h = islandHeight(x, z)
        positions.push(x, h, z)
        islandColor(h, col)
        // subtle per-vertex tint so it doesn't look flat
        const tint = 0.92 + ((i * 31 + j * 17) % 16) / 16 * 0.16
        colors.push(col.r * tint, col.g * tint, col.b * tint)
      }
    }
    for (let j = 0; j < seg; j++) {
      for (let i = 0; i < seg; i++) {
        const a = j * (seg + 1) + i
        const b = a + 1
        const c = a + (seg + 1)
        const d = c + 1
        // CCW from above -> normals point up
        indices.push(a, c, b)
        indices.push(b, c, d)
      }
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    geo.setIndex(indices)
    geo.computeVertexNormals()
    return geo
  }, [])

  return (
    <mesh geometry={geometry} receiveShadow castShadow>
      <meshToonMaterial vertexColors gradientMap={gradientMap} />
    </mesh>
  )
}
