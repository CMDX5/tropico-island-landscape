'use client'

import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Sky, AdaptiveDpr } from '@react-three/drei'
import * as THREE from 'three'
import { IslandTerrain } from './IslandTerrain'
import { Ocean } from './Ocean'
import { Vegetation } from './Vegetation'
import { IslandClouds } from './Clouds'

const SUN_POSITION: [number, number, number] = [60, 55, -30]

/**
 * The full Tropico-style island landscape: terrain, ocean, vegetation,
 * sky and sun, with orbit controls so you can fly around the island.
 */
export function IslandScene() {
  return (
    <Canvas
      shadows
      dpr={[1, 1.8]}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
      camera={{ position: [70, 42, 70], fov: 45, near: 0.1, far: 1200 }}
    >
      <color attach="background" args={['#bfe9f2']} />
      <fog attach="fog" args={['#bfe9f2', 140, 380]} />

      {/* lighting */}
      <hemisphereLight args={['#cfefff', '#3d6b3a', 0.7]} />
      <ambientLight intensity={0.25} />
      <directionalLight
        position={SUN_POSITION}
        intensity={2.1}
        color="#fff3d6"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={1}
        shadow-camera-far={300}
        shadow-camera-left={-90}
        shadow-camera-right={90}
        shadow-camera-top={90}
        shadow-camera-bottom={-90}
        shadow-bias={-0.0004}
      />

      <Suspense fallback={null}>
        <Sky
          sunPosition={SUN_POSITION}
          turbidity={6}
          rayleigh={1.2}
          mieCoefficient={0.005}
          mieDirectionalG={0.9}
        />
        <IslandTerrain />
        <Ocean />
        <Vegetation palmCount={70} />
        <IslandClouds />
      </Suspense>

      <OrbitControls
        enablePan
        panSpeed={0.6}
        minDistance={25}
        maxDistance={220}
        maxPolarAngle={Math.PI / 2.15}
        minPolarAngle={0.15}
        enableDamping
        dampingFactor={0.08}
        target={[0, 2, 0]}
      />

      <AdaptiveDpr pixelated />
    </Canvas>
  )
}
