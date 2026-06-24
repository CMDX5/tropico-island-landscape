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
      shadows
      dpr={[1, 1]}
      gl={{ antialias: false, toneMapping: THREE.ACESFilmicToneMapping, powerPreference: 'high-performance' }}
    >
      <color attach="background" args={['#bfe9f2']} />
      <fog attach="fog" args={['#d4eef5', 1200, 3000]} />

      {/* Tropico 6 uses a PERSPECTIVE camera (distant objects shrink).
          FOV ~50°, positioned close enough that the island fills the view. */}
      <PerspectiveCamera makeDefault position={[220, 245, 220]} fov={50} near={0.5} far={6000} />

      {/* lighting */}
      <hemisphereLight args={['#fff4e0', '#4a5a3a', 1.0]} />
      <ambientLight intensity={0.55} />
      <directionalLight
        position={SUN_POSITION}
        intensity={2.6}
        color="#fff3d6"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={1}
        shadow-camera-far={1600}
        shadow-camera-left={-620}
        shadow-camera-right={620}
        shadow-camera-top={620}
        shadow-camera-bottom={-620}
        shadow-bias={-0.0004}
      />

      <Suspense fallback={null}>
        {/* Simple gradient sky dome (replaces drei <Sky> shader which was
            rendering as black/white void on some GPUs). Reliable everywhere. */}
        <mesh scale={[-1, 1, 1]}>
          <sphereGeometry args={[2500, 32, 16]} />
          <shaderMaterial
            side={THREE.BackSide}
            depthWrite={false}
            uniforms={{
              topColor: { value: new THREE.Color('#5fa8d4') },
              bottomColor: { value: new THREE.Color('#d4eef5') },
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
        <Vegetation palmCount={280} />
        <IslandClouds />
      </Suspense>

      <PostFX />

      <OrbitControls
        ref={controlsRef}
        enablePan
        panSpeed={0.8}
        enableRotate
        rotateSpeed={0.7}
        // Tropico 6: zoom via distance (perspective), not zoom property
        // Zoom range matches Tropico 6: closest shows buildings clearly,
        // farthest shows the whole island. Not as close as ground level.
        minDistance={60}
        maxDistance={520}
        // Tropico 6 tilt range (from screenshots): ~25° to ~60° from horizontal
        // (polar measured from Y axis: 0=top-down, π/2=horizontal)
        // 25° from horizontal = 65° from vertical = polar 1.13
        // 60° from horizontal = 30° from vertical = polar 0.52
        maxPolarAngle={Math.PI / 2.8}      // ~64° from vertical (low/raking view when zoomed in)
        minPolarAngle={Math.PI / 6}        // ~30° from vertical (high aerial when zoomed out)
        enableDamping
        dampingFactor={0.1}
        target={[0, 2, 0]}
      />

      {/* Tropico 6-style keyboard controls (WASD / Q-E / R-F / +-) */}
      <TropicoCamera controlsRef={controlsRef} />

      <AdaptiveDpr pixelated />
    </Canvas>
  )
}
