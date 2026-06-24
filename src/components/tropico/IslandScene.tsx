'use client'

import { Suspense, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Sky, AdaptiveDpr, PerspectiveCamera } from '@react-three/drei'
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
      <color attach="background" args={['#7ec8e3']} />
      <fog attach="fog" args={['#7ec8e3', 1200, 3000]} />

      {/* Tropico 6 uses a PERSPECTIVE camera (distant objects shrink).
          FOV ~50°, positioned close enough that the island fills the view. */}
      <PerspectiveCamera makeDefault position={[120, 135, 120]} fov={50} near={0.5} far={4000} />

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
        shadow-camera-far={900}
        shadow-camera-left={-340}
        shadow-camera-right={340}
        shadow-camera-top={340}
        shadow-camera-bottom={-340}
        shadow-bias={-0.0004}
      />

      <Suspense fallback={null}>
        <Sky
          sunPosition={SUN_POSITION}
          turbidity={5}
          rayleigh={1}
          mieCoefficient={0.005}
          mieDirectionalG={0.9}
        />
        <IslandTerrain />
        <Rivers />
        <Ocean />
        <Vegetation palmCount={80} />
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
        minDistance={35}
        maxDistance={280}
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
