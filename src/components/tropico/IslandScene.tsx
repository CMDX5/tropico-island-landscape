'use client'

import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Sky, AdaptiveDpr, OrthographicCamera } from '@react-three/drei'
import * as THREE from 'three'
import { IslandTerrain } from './IslandTerrain'
import { Ocean } from './Ocean'
import { Vegetation } from './Vegetation'
import { IslandClouds } from './Clouds'
import { Rivers } from './Rivers'
import { PostFX } from './PostFX'

const SUN_POSITION: [number, number, number] = [60, 70, -30]

/**
 * The full Tropico-style island landscape: terrain, rivers, ocean,
 * dense vegetation, sky and sun, viewed through an isometric
 * (orthographic) camera — strategy-game map style. Orbit controls are
 * kept so you can still rotate and zoom the view.
 */
export function IslandScene() {
  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
      gl={{ antialias: false, toneMapping: THREE.ACESFilmicToneMapping }}
    >
      <color attach="background" args={['#bfe9f2']} />
      <fog attach="fog" args={['#bfe9f2', 180, 460]} />

      {/* isometric / orthographic camera */}
      <OrthographicCamera makeDefault position={[85, 110, 85]} zoom={9} near={-500} far={1500} />

      {/* lighting */}
      <hemisphereLight args={['#dff4ff', '#3d6b3a', 0.8]} />
      <ambientLight intensity={0.3} />
      <directionalLight
        position={SUN_POSITION}
        intensity={2.2}
        color="#fff3d6"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={1}
        shadow-camera-far={400}
        shadow-camera-left={-110}
        shadow-camera-right={110}
        shadow-camera-top={110}
        shadow-camera-bottom={-110}
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
        <Vegetation palmCount={120} />
        <IslandClouds />
      </Suspense>

      <PostFX />

      <OrbitControls
        enablePan
        panSpeed={0.6}
        enableRotate
        minZoom={4.5}
        maxZoom={20}
        maxPolarAngle={Math.PI / 2.3}
        minPolarAngle={Math.PI / 7}
        enableDamping
        dampingFactor={0.08}
        target={[0, 2, 0]}
      />

      <AdaptiveDpr pixelated />
    </Canvas>
  )
}
