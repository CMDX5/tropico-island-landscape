'use client'

import * as THREE from 'three'
import { EffectComposer, Bloom, SSAO, DepthOfField, Vignette, SMAA } from '@react-three/postprocessing'
import { BlendFunction, KernelSize } from 'postprocessing'

/**
 * Cinematic post-processing stack tuned for the isometric island:
 *  - SSAO   : ambient occlusion in tree/rock crevices and cliff folds
 *  - DoF    : gentle tilt-shift blur at the frame edges (miniature vibe)
 *  - Bloom  : soft glow on foam, snow and sun glitter
 *  - Vignette : subtle edge darkening for focus
 *  - SMAA   : antialiasing (MSAA is off with the composer)
 */
export function PostFX() {
  return (
    <EffectComposer multisampling={0} enableNormalPass>
      <SSAO
        blendFunction={BlendFunction.MULTIPLY}
        samples={21}
        radius={0.03}
        intensity={18}
        luminanceInfluence={0.5}
        color={new THREE.Color('#243a24')}
      />
      <DepthOfField focusDistance={0.32} focalLength={0.025} bokehScale={2.5} />
      <Bloom
        luminanceThreshold={0.6}
        luminanceSmoothing={0.25}
        intensity={0.7}
        mipmapBlur
        kernelSize={KernelSize.LARGE}
      />
      <Vignette offset={0.25} darkness={0.55} />
      <SMAA />
    </EffectComposer>
  )
}
