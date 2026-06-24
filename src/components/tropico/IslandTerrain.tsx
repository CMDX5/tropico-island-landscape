'use client'

import { useMemo } from 'react'
import * as THREE from 'three'
import { ISLAND_SIZE, islandHeight, islandColorAt } from './terrain'
import { makeSandTexture, makeGrassTexture, makeRockTexture } from './terrainTextures'

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
    const seg = 140
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
    const sand = makeSandTexture()
    const grass = makeGrassTexture()
    const rock = makeRockTexture()

    const mat = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap })
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uSand = { value: sand }
      shader.uniforms.uGrass = { value: grass }
      shader.uniforms.uRock = { value: rock }
      shader.uniforms.uTexScale = { value: 0.18 }

      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
          varying vec3 vWorldPos;
          varying vec3 vWorldNormal;`,
        )
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
          vWorldNormal = normalize(mat3(modelMatrix) * normal);`,
        )

      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
          varying vec3 vWorldPos;
          varying vec3 vWorldNormal;
          uniform sampler2D uSand;
          uniform sampler2D uGrass;
          uniform sampler2D uRock;
          uniform float uTexScale;
          float hash2(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123); }`,
        )
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
          // Discard fragments well below sea level so the terrain doesn't
          // show a yellowish square border where it meets the ocean.
          // The ocean (at y=-0.25) covers everything below ~-0.4.
          if (vWorldPos.y < -0.5) discard;
          {
            vec2 uv = vWorldPos.xz * uTexScale;
            vec3 sandC = texture2D(uSand, uv).rgb;
            vec3 grassC = texture2D(uGrass, uv).rgb;
            vec3 rockC = texture2D(uRock, uv).rgb;
            float h = vWorldPos.y;
            float slope = vWorldNormal.y; // 1 flat, 0 vertical
            float sandW = smoothstep(1.8, 0.2, h);
            float rockW = smoothstep(7.5, 11.0, h);
            float steep = smoothstep(0.78, 0.5, slope);
            rockW = max(rockW, steep);
            sandW *= (1.0 - steep);
            float grassW = clamp(1.0 - sandW - rockW, 0.0, 1.0) * (1.0 - steep);
            vec3 splat = sandC * sandW + grassC * grassW + rockC * rockW;
            // real snow cap on the highest peaks
            float snowW = smoothstep(8.5, 12.0, h) * (1.0 - steep * 0.6);
            splat = mix(splat, vec3(1.0), snowW);
            diffuseColor.rgb = mix(diffuseColor.rgb, splat, 0.55);
          }`,
        )
    }
    return mat
  }, [gradientMap])

  return (
    <mesh geometry={geometry} material={material} receiveShadow castShadow />
  )
}
