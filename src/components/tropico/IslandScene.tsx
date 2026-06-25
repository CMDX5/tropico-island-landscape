'use client'

import { Suspense, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, AdaptiveDpr, PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { IslandTerrain } from './IslandTerrain'
import { Ocean } from './Ocean'
import { Vegetation } from './Vegetation'
import { IslandClouds } from './Clouds'
import { Rivers } from './Rivers'
import { PostFX } from './PostFX'
import { TropicoCamera } from './TropicoCamera'
import { Buildings, VILLAGE_CENTERS } from './Buildings'
import { InstancedForest } from './InstancedForest'

const SUN_POSITION: [number, number, number] = [60, 70, -30]

/**
 * The full Tropico-style island landscape: terrain, rivers, ocean,
 * dense vegetation, sky and sun, viewed through an isometric
 * (orthographic) camera — strategy-game map style. Orbit controls are
 * kept so you can still rotate and zoom the view.
 */
export function IslandScene() {
  const controlsRef = useRef<OrbitControlsImpl>(null)
  return (
    <Canvas
      dpr={[1, 1]}
      gl={{ antialias: false, toneMapping: THREE.NoToneMapping, powerPreference: 'high-performance' }}
    >
      <color attach="background" args={['#87ceeb']} />
      <fog attach="fog" args={['#7ab8dc', 4000, 8000]} />

      {/* Tropico 6 uses a PERSPECTIVE camera (distant objects shrink).
          FOV ~50°, positioned close enough that the island fills the view. */}
      <PerspectiveCamera makeDefault position={[600, 430, 600]} fov={55} near={0.5} far={12000} />

      {/* lighting — warm golden tropical sunlight from the right */}
      <hemisphereLight args={['#ffeec8', '#4a5a3a', 1.1]} />
      <ambientLight intensity={0.6} />
      <directionalLight
        position={SUN_POSITION}
        intensity={2.8}
        color="#ffe4a8"
      />

      <Suspense fallback={null}>
        {/* Sky dome: large sphere with vertical blue gradient. Rendered on
            BackSide so we see its interior. No fog/toneMapping so it stays
            vivid blue. */}
        <mesh renderOrder={-1} frustumCulled={false}>
          <sphereGeometry args={[5000, 32, 16]} />
          <shaderMaterial
            side={THREE.BackSide}
            depthWrite={false}
            depthTest={false}
            toneMapped={false}
            uniforms={{
              topColor: { value: new THREE.Color('#2a72c8') },
              bottomColor: { value: new THREE.Color('#c8e8ff') },
              offset: { value: 200 },
              exponent: { value: 0.6 },
            }}
            vertexShader={`
              varying vec3 vWorldPos;
              void main() {
                vec4 wp = modelMatrix * vec4(position, 1.0);
                vWorldPos = wp.xyz;
                gl_Position = projectionMatrix * viewMatrix * wp;
              }
            `}
            fragmentShader={`
              uniform vec3 topColor;
              uniform vec3 bottomColor;
              uniform float offset;
              uniform float exponent;
              varying vec3 vWorldPos;
              void main() {
                float h = normalize(vWorldPos + vec3(0.0, offset, 0.0)).y;
                float t = max(pow(max(h, 0.0), exponent), 0.0);
                gl_FragColor = vec4(mix(bottomColor, topColor, t), 1.0);
              }
            `}
          />
        </mesh>
        <IslandTerrain />
        <Rivers />
        <Ocean />
        <Buildings />
        <InstancedForest count={2000} />
        <Vegetation palmCount={300} />
        {/* Clouds disabled for perf — re-enable on faster machines */}
      </Suspense>

      {/* PostFX disabled — was forcing tone mapping that turned the sky teal */}

      <OrbitControls
        ref={controlsRef}
        enablePan
        panSpeed={0.8}
        enableRotate
        rotateSpeed={0.7}
        // Middle mouse button = free rotation (Tropico 6 official)
        mouseButtons={{
          LEFT: THREE.MOUSE.PAN,
          MIDDLE: THREE.MOUSE.ROTATE,
          RIGHT: THREE.MOUSE.PAN,
        }}
        // Tropico 6 official zoom bounds: 25 (close) to 560 (full island)
        minDistance={25}
        maxDistance={560}
        // Tropico 6 tilt: 20° (near flat) to 80° (near top-down) from horizontal
        // polar measured from Y: 0=top-down, π/2=horizontal
        // 20° from horizontal = 70° from vertical = polar 1.22
        // 80° from horizontal = 10° from vertical = polar 0.175
        maxPolarAngle={(75 * Math.PI) / 180}   // 15° from horizontal (max tilt, no clipping)
        minPolarAngle={(10 * Math.PI) / 180}   // 80° from horizontal (near top-down)
        enableDamping
        dampingFactor={0.1}
        target={[0, 20, 0]}
      />

      {/* Tropico 6-style keyboard controls (WASD / Q-E / ALT-tilt / PgUp reset) */}
      <TropicoCamera controlsRef={controlsRef} onMenuKey={() => {}} />

      <AdaptiveDpr pixelated />
    </Canvas>
  )
}
