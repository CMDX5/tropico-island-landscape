'use client'

import * as THREE from 'three'
import { EffectComposer, Bloom, SSAO, Vignette, SMAA } from '@react-three/postprocessing'
import { BlendFunction, KernelSize } from 'postprocessing'

/**
 * Post-processing stack tuned for the isometric island:
 *  - SSAO   : gentle ambient occlusion in tree/rock crevices
 *  - Bloom  : soft glow on foam, snow and sun glitter
 *  - Vignette : subtle edge darkening for focus
 *  - SMAA   : antialiasing (MSAA is off with the composer)
 * (DoF removed — it was blurring the central mountain and muting snow caps)
 */
export function PostFX() {
  return (
    <EffectComposer multisampling={0} enableNormalPass>
      <SSAO
        blendFunction={BlendFunction.MULTIPLY}
        samples={16}
        radius={0.02}
        intensity={6}
        luminanceInfluence={0.5}
        color={new THREE.Color('#3a4a3a')}
      />
      <Bloom
        luminanceThreshold={0.7}
        luminanceSmoothing={0.25}
        intensity={0.55}
        mipmapBlur
        kernelSize={KernelSize.LARGE}
      />
      <Vignette offset={0.3} darkness={0.35} />
      <SMAA />
    </EffectComposer>
  )
}
