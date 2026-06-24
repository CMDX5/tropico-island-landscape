'use client'

import { Suspense, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Sky, AdaptiveDpr, OrthographicCamera } from '@react-three/drei'
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
      dpr={[1, 1.5]}
      gl={{ antialias: false, toneMapping: THREE.ACESFilmicToneMapping }}
    >
      <color attach="background" args={['#bfe9f2']} />
      <fog attach="fog" args={['#bfe9f2', 280, 620]} />

      {/* isometric / orthographic camera — zoomed out for the larger island */}
      <OrthographicCamera makeDefault position={[150, 190, 150]} zoom={6} near={-1000} far={3000} />

      {/* lighting */}
      <hemisphereLight args={['#fff4e0', '#4a5a3a', 1.0]} />
      <ambientLight intensity={0.55} />
      <directionalLight
        position={SUN_POSITION}
        intensity={2.6}
        color="#fff3d6"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={1}
        shadow-camera-far={600}
        shadow-camera-left={-220}
        shadow-camera-right={220}
        shadow-camera-top={220}
        shadow-camera-bottom={-220}
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
        <Vegetation palmCount={180} />
        <IslandClouds />
      </Suspense>

      <PostFX />

      <OrbitControls
        ref={controlsRef}
        enablePan
        panSpeed={0.6}
        enableRotate
        minZoom={3}
        maxZoom={16}
        maxPolarAngle={Math.PI / 2.3}
        minPolarAngle={Math.PI / 7}
        enableDamping
        dampingFactor={0.08}
        target={[0, 2, 0]}
      />

      {/* Tropico 6-style keyboard controls (WASD / Q-E / R-F / +-) */}
      <TropicoCamera controlsRef={controlsRef} />

      <AdaptiveDpr pixelated />
    </Canvas>
  )
}
