'use client'

import { EffectComposer, Bloom, Vignette, SMAA } from '@react-three/postprocessing'
import { KernelSize } from 'postprocessing'

/**
 * Lightweight post-processing stack (SSAO removed for perf — it was
 * dropping the frame rate to ~2fps with hundreds of trees).
 *  - Bloom  : soft glow on foam, snow and sun glitter
 *  - Vignette : subtle edge darkening for focus
 *  - SMAA   : antialiasing
 */
export function PostFX() {
  return (
    <EffectComposer multisampling={0}>
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
