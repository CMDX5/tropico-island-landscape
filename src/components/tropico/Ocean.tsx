'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { islandHeight } from './terrain'

const SIZE = 500
const SEGMENTS = 90

/**
 * Animated tropical ocean with:
 *  - rolling wave vertex displacement
 *  - coastal foam (precomputed from terrain height below each vertex)
 *  - sun glitter (time-varying high-frequency sparkle in the shader)
 * A deep-blue base plane sits below the transparent turquoise surface.
 */
export function Ocean() {
  const surfaceRef = useRef<THREE.Mesh>(null!)
  const shaderRef = useRef<{ uniforms: Record<string, { value: unknown }> } | null>(null)
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

  // Build the plane geometry once: rotate flat, then bake a per-vertex
  // foam factor from the terrain heightfield (peaks at the shoreline).
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(SIZE, SIZE, SEGMENTS, SEGMENTS)
    g.rotateX(-Math.PI / 2)
    const pos = g.attributes.position as THREE.BufferAttribute
    const foam = new Float32Array(pos.count)
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)
      const h = islandHeight(x, z)
      // foam where terrain is near sea level; none on land or deep water
      foam[i] = Math.max(0, 1 - Math.abs(h) / 1.3)
    }
    g.setAttribute('foam', new THREE.BufferAttribute(foam, 1))
    baseRef.current = new Float32Array(pos.array)
    return g
  }, [])

  const material = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      color: '#1ea8cf',
      transparent: true,
      opacity: 0.82,
      roughness: 0.08,
      metalness: 0.35,
    })
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = { value: 0 }
      shaderRef.current = shader

      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
          attribute float foam;
          varying vec3 vWorldPos;
          varying float vFoam;`,
        )
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
          vFoam = foam;`,
        )

      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
          varying vec3 vWorldPos;
          varying float vFoam;
          uniform float uTime;
          float hash2(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123); }`,
        )
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.95, 0.98, 1.0), vFoam * 0.85);
          float gn = hash2(vWorldPos.xz * 70.0 + vec2(uTime * 3.0, -uTime * 2.0));
          float glitter = pow(gn, 60.0);
          diffuseColor.rgb += vec3(glitter * 0.9, glitter * 0.95, glitter * 1.0);`,
        )
    }
    return mat
  }, [])

  useFrame(({ clock }) => {
    const mesh = surfaceRef.current
    if (!mesh) return
    const geo = mesh.geometry as THREE.BufferGeometry
    const pos = geo.attributes.position as THREE.BufferAttribute
    const t = clock.getElapsedTime()
    const { xs, zs } = grid
    const base = baseRef.current!
    for (let i = 0; i < pos.count; i++) {
      const x = xs[i]
      const z = zs[i]
      const wave =
        Math.sin(x * 0.12 + t * 0.9) * 0.28 +
        Math.cos(z * 0.1 + t * 0.7) * 0.24 +
        Math.sin((x + z) * 0.06 + t * 0.5) * 0.18
      pos.setY(i, base[i * 3 + 1] + wave)
    }
    pos.needsUpdate = true
    geo.computeVertexNormals()
    if (shaderRef.current) {
      ;(shaderRef.current.uniforms.uTime.value as number) = t
    }
  })

  return (
    <group>
      {/* deep water */}
      <mesh position={[0, -3.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[SIZE, SIZE]} />
        <meshStandardMaterial color="#0d5b8a" roughness={0.4} metalness={0.1} />
      </mesh>
      {/* shallow animated surface */}
      <mesh ref={surfaceRef} geometry={geometry} material={material} position={[0, -0.25, 0]} receiveShadow />
    </group>
  )
}
