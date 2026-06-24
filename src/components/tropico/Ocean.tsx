'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { islandHeight, ISLAND_RADIUS } from './terrain'

const SIZE = 500
const SEGMENTS = 110

/**
 * Premium animated tropical ocean (custom ShaderMaterial):
 *  - rolling wave vertex displacement
 *  - depth gradient: turquoise shallow -> deep blue offshore (by distance to island)
 *  - fresnel refraction tint (sky color mixes in at grazing angles)
 *  - specular sun glitter (time-varying, sharp highlights)
 *  - animated coastal foam (peaks at the shoreline, shimmers with waves)
 *  - subsurface scattering tint for shallow water glow
 */
export function Ocean() {
  const surfaceRef = useRef<THREE.Mesh>(null!)
  const uniformsRef = useRef<{ [k: string]: { value: unknown } } | null>(null)
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
  // foam factor + depth factor from the terrain heightfield.
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(SIZE, SIZE, SEGMENTS, SEGMENTS)
    g.rotateX(-Math.PI / 2)
    const pos = g.attributes.position as THREE.BufferAttribute
    const foam = new Float32Array(pos.count)
    const depth = new Float32Array(pos.count)
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)
      const h = islandHeight(x, z)
      // foam where terrain is near sea level
      foam[i] = Math.max(0, 1 - Math.abs(h) / 1.3)
      // depth: 0 at the shore, 1 far out at sea
      const d = Math.sqrt(x * x + z * z)
      depth[i] = Math.min(1, Math.max(0, (d - ISLAND_RADIUS * 0.7) / (ISLAND_RADIUS * 1.4)))
    }
    g.setAttribute('foam', new THREE.BufferAttribute(foam, 1))
    g.setAttribute('depth', new THREE.BufferAttribute(depth, 1))
    baseRef.current = new Float32Array(pos.array)
    return g
  }, [])

  const material = useMemo(() => {
    const uniforms = {
      uTime: { value: 0 },
      uSunDir: { value: new THREE.Vector3(60, 70, -30).normalize() },
      uSunColor: { value: new THREE.Color('#fff3d6') },
      uSkyColor: { value: new THREE.Color('#bfe9f2') },
      uShallow: { value: new THREE.Color('#3fd0e8') }, // turquoise shallow
      uDeep: { value: new THREE.Color('#0a4d7a') }, // deep blue offshore
      uFoamColor: { value: new THREE.Color('#ffffff') },
    }
    uniformsRef.current = uniforms

    return new THREE.ShaderMaterial({
      uniforms,
      transparent: true,
      vertexShader: /* glsl */ `
        attribute float foam;
        attribute float depth;
        varying vec3 vWorldPos;
        varying vec3 vWorldNormal;
        varying float vFoam;
        varying float vDepth;
        void main() {
          vFoam = foam;
          vDepth = depth;
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          vWorldNormal = normalize(mat3(modelMatrix) * normal);
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;
        varying vec3 vWorldPos;
        varying vec3 vWorldNormal;
        varying float vFoam;
        varying float vDepth;
        uniform float uTime;
        uniform vec3 uSunDir;
        uniform vec3 uSunColor;
        uniform vec3 uSkyColor;
        uniform vec3 uShallow;
        uniform vec3 uDeep;
        uniform vec3 uFoamColor;

        float hash2(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123); }

        void main(){
          vec3 N = normalize(vWorldNormal);
          vec3 V = normalize(cameraPosition - vWorldPos);
          vec3 L = normalize(uSunDir);

          // depth gradient: shallow turquoise -> deep blue
          vec3 waterCol = mix(uShallow, uDeep, vDepth);
          // subsurface glow on shallow water facing the sun
          float sss = pow(max(dot(N, L), 0.0), 1.5) * (1.0 - vDepth) * 0.4;
          waterCol += uSunColor * sss;

          // fresnel: sky color mixes in at grazing angles (fake refraction)
          float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
          waterCol = mix(waterCol, uSkyColor, fres * 0.55);

          // specular sun glitter (sharp, animated)
          vec3 H = normalize(L + V);
          float spec = pow(max(dot(N, H), 0.0), 180.0);
          // sparkle modulation so glitter shimmers
          float spark = hash2(vWorldPos.xz * 90.0 + vec2(uTime * 5.0, -uTime * 4.0));
          spec *= 0.5 + spark * 1.2;
          waterCol += uSunColor * spec * 2.0;

          // animated foam: thicker + shimmering near the shore
          float foamMask = vFoam;
          float foamNoise = hash2(vWorldPos.xz * 25.0 + vec2(uTime * 1.5, uTime));
          foamMask *= 0.6 + foamNoise * 0.6;
          vec3 col = mix(waterCol, uFoamColor, clamp(foamMask * 1.3, 0.0, 1.0));

          // gentle ambient lift
          col += uSkyColor * 0.05;

          gl_FragColor = vec4(col, 0.92);
        }
      `,
    })
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
    if (uniformsRef.current) {
      ;(uniformsRef.current.uTime.value as number) = t
    }
  })

  return (
    <group>
      {/* deep water base */}
      <mesh position={[0, -3.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[SIZE, SIZE]} />
        <meshStandardMaterial color="#0a4d7a" roughness={0.4} metalness={0.1} />
      </mesh>
      {/* premium animated surface */}
      <mesh ref={surfaceRef} geometry={geometry} material={material} position={[0, -0.25, 0]} receiveShadow />
    </group>
  )
}
