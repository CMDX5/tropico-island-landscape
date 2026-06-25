'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { islandHeight, ISLAND_RADIUS } from './terrain'

const SIZE = 8000
const SEGMENTS = 30

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

  // Build the plane geometry once: rotate flat, then bake per-vertex
  // foam factor + wave-amplitude mask + depth (distance to shore) from
  // the terrain heightfield.
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(SIZE, SIZE, SEGMENTS, SEGMENTS)
    g.rotateX(-Math.PI / 2)
    const pos = g.attributes.position as THREE.BufferAttribute
    const foam = new Float32Array(pos.count)
    const waveAmp = new Float32Array(pos.count)
    const depth = new Float32Array(pos.count)
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)
      const h = islandHeight(x, z)
      // foam ONLY in actual water near the shore (h < 0), never on sand/land
      foam[i] = h < 0 ? Math.max(0, 1 - (-h) / 1.0) : 0
      // wave amplitude: 0 where terrain is at/above sea level (beach/land),
      // ramps up quickly offshore so the coast stays rock-solid.
      if (h > -0.5) {
        waveAmp[i] = 0 // on beach or shallow — rigid, no displacement
      } else {
        // h < -0.5 (underwater): full waves, steep ramp away from shore
        waveAmp[i] = Math.min(1, Math.max(0, (-h - 0.5) / 1.5))
      }
      // depth: 0 at the shore, 1 far out at sea (for turquoise->deep gradient)
      const d = Math.sqrt(x * x + z * z)
      depth[i] = Math.min(1, Math.max(0, (d - ISLAND_RADIUS * 0.7) / (ISLAND_RADIUS * 1.6)))
    }
    g.setAttribute('foam', new THREE.BufferAttribute(foam, 1))
    g.setAttribute('waveAmp', new THREE.BufferAttribute(waveAmp, 1))
    g.setAttribute('depth', new THREE.BufferAttribute(depth, 1))
    baseRef.current = new Float32Array(pos.array)
    return g
  }, [])

  const material = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      color: '#3fd8e8',
      transparent: true,
      opacity: 0.88,
      roughness: 0.06,
      metalness: 0.5,
    })
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = { value: 0 }
      shader.uniforms.uSunDir = { value: new THREE.Vector3(60, 70, -30).normalize() }
      shader.uniforms.uShallow = { value: new THREE.Color('#00ced1') }  // bright turquoise
      shader.uniforms.uDeep = { value: new THREE.Color('#006994') }     // deep navy blue
      shader.uniforms.uFoamColor = { value: new THREE.Color('#ffffff') }
      shaderRef.current = shader

      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
          attribute float foam;
          attribute float waveAmp;
          attribute float depth;
          varying vec3 vWorldPos;
          varying vec3 vWorldNormal;
          varying float vFoam;
          varying float vWaveAmp;
          varying float vDepth;`,
        )
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
          vWorldNormal = normalize(mat3(modelMatrix) * normal);
          vFoam = foam;
          vWaveAmp = waveAmp;
          vDepth = depth;`,
        )

      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
          varying vec3 vWorldPos;
          varying vec3 vWorldNormal;
          varying float vFoam;
          varying float vWaveAmp;
          varying float vDepth;
          uniform float uTime;
          uniform vec3 uSunDir;
          uniform vec3 uShallow;
          uniform vec3 uDeep;
          uniform vec3 uFoamColor;
          float hash2(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123); }`,
        )
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
          // discard fragments near the coast so the water surface stays
          // well off the beach — the sand reads as rigid ground.
          if (vWaveAmp < 0.15) discard;
          // Depth gradient: bright turquoise near shore -> deep navy offshore
          vec3 waterCol = mix(uShallow, uDeep, vDepth);
          // Specular sun reflection (sharp highlight)
          vec3 V = normalize(cameraPosition - vWorldPos);
          vec3 L = normalize(uSunDir);
          vec3 H = normalize(L + V);
          float spec = pow(max(dot(vWorldNormal, H), 0.0), 200.0);
          // Sun glitter: multi-sample hash for fine sparkle (no banding)
          float g1 = hash2(vWorldPos.xz * 3.7 + vec2(uTime * 0.4, -uTime * 0.3));
          float g2 = hash2(vWorldPos.xz * 9.1 + vec2(-uTime * 0.5, uTime * 0.6));
          float glitter = pow(g1 * g2, 12.0);
          // Combine: water color + specular + glitter
          diffuseColor.rgb = waterCol + vec3(spec * 1.5) + vec3(glitter * 0.7, glitter * 0.75, glitter * 0.85);
          // Coastal foam: thick white edge where ocean meets beach
          diffuseColor.rgb = mix(diffuseColor.rgb, uFoamColor, vFoam * 0.9);`,
        )
    }
    return mat
  }, [])

  useFrame(({ clock }) => {
    const mesh = surfaceRef.current
    if (!mesh) return
    const geo = mesh.geometry as THREE.BufferGeometry
    const pos = geo.attributes.position as THREE.BufferAttribute
    const waveAmpAttr = geo.attributes.waveAmp as THREE.BufferAttribute
    const t = clock.getElapsedTime()
    const { xs, zs } = grid
    const base = baseRef.current!
    for (let i = 0; i < pos.count; i++) {
      const x = xs[i]
      const z = zs[i]
      const amp = waveAmpAttr.getX(i)
      // skip rigid (on-land/shallow) vertices entirely — no displacement
      if (amp <= 0.01) {
        continue
      }
      const wave =
        (Math.sin(x * 0.12 + t * 0.9) * 0.28 +
          Math.cos(z * 0.1 + t * 0.7) * 0.24 +
          Math.sin((x + z) * 0.06 + t * 0.5) * 0.18) * amp
      pos.setY(i, base[i * 3 + 1] + wave)
    }
    pos.needsUpdate = true
    // Normals NOT recomputed every frame (perf) — waves are gentle and
    // static normals look fine. Was the single biggest perf killer.
    if (shaderRef.current) {
      ;(shaderRef.current.uniforms.uTime.value as number) = t
    }
  })

  return (
    <group>
      {/* deep water */}
      <mesh position={[0, -3.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[SIZE, SIZE]} />
        <meshStandardMaterial color="#006994" roughness={0.4} metalness={0.1} />
      </mesh>
      {/* shallow animated surface */}
      <mesh ref={surfaceRef} geometry={geometry} material={material} position={[0, -0.25, 0]} receiveShadow />
    </group>
  )
}
