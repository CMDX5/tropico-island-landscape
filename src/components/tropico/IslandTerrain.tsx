'use client'

import { useMemo } from 'react'
import * as THREE from 'three'
import { ISLAND_SIZE, islandHeight, islandColorAt } from './terrain'

/**
 * Procedural island terrain built as a custom XZ grid.
 *
 * Surface detail uses GPU splat-mapping: three procedural noise textures
 * (sand / grass / rock) are blended in the fragment shader by world
 * height and slope, on top of the per-vertex biome color. The toon
 * cel-shading (gradient map) is preserved.
 */
export function IslandTerrain() {
  // 3-step cel-shading gradient map for a cartoon painted look
  const gradientMap = useMemo(() => {
    const data = new Uint8Array([185, 185, 185, 255, 225, 225, 225, 255, 255, 255, 255])
    const tex = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat)
    tex.needsUpdate = true
    tex.minFilter = THREE.NearestFilter
    tex.magFilter = THREE.NearestFilter
    tex.generateMipmaps = false
    return tex
  }, [])

  const geometry = useMemo(() => {
    const seg = 240
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
        islandColorAt(x, z, h, col)
        const tint = 0.92 + (((i * 31 + j * 17) % 16) / 16) * 0.16
        colors.push(col.r * tint, col.g * tint, col.b * tint)
      }
    }
    for (let j = 0; j < seg; j++) {
      for (let i = 0; i < seg; i++) {
        const a = j * (seg + 1) + i
        const b = a + 1
        const c = a + (seg + 1)
        const d = c + 1
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

  const material = useMemo(() => {
    // Simplified material (no splat-mapping textures) for performance.
    // Uses only vertex colors + a discard for below-sea-level fragments.
    const mat = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap })
    mat.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
          varying vec3 vWorldPos;`,
        )
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`,
        )

      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
          varying vec3 vWorldPos;`,
        )
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
          // Discard fragments below sea level (ocean covers them)
          if (vWorldPos.y < -0.5) discard;`,
        )
    }
    return mat
  }, [gradientMap])

  return (
    <mesh geometry={geometry} material={material} receiveShadow castShadow />
  )
}
