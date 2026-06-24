import * as THREE from 'three'
import { fbm } from './terrain'

/**
 * Procedurally-generated tileable surface textures (DataTextures) used
 * for terrain splat-mapping. Each is a 128×128 RGBA noise field tuned
 * for its biome: warm grainy sand, blade-varied grass, cracked rock.
 */

function makeNoiseTexture(
  size: number,
  fn: (u: number, v: number) => [number, number, number],
): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const [r, g, b] = fn(x / size, y / size)
      const i = (y * size + x) * 4
      data[i] = Math.max(0, Math.min(255, Math.round(r * 255)))
      data[i + 1] = Math.max(0, Math.min(255, Math.round(g * 255)))
      data[i + 2] = Math.max(0, Math.min(255, Math.round(b * 255)))
      data[i + 3] = 255
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.UnsignedByteType)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.needsUpdate = true
  return tex
}

/** Warm grainy sand with fine sparkle. */
export function makeSandTexture(size = 128): THREE.DataTexture {
  return makeNoiseTexture(size, (u, v) => {
    const n = fbm(u * 12, v * 12, 4)
    const grain = fbm(u * 45, v * 45, 2)
    const k = 0.82 + n * 0.22 + grain * 0.1
    return [0.96 * k, 0.85 * k, 0.57 * k]
  })
}

/** Green grass with blade-like medium-frequency variation. */
export function makeGrassTexture(size = 128): THREE.DataTexture {
  return makeNoiseTexture(size, (u, v) => {
    const n = fbm(u * 9, v * 9, 4)
    const blade = fbm(u * 32, v * 32, 2)
    const k = 0.72 + n * 0.34 + blade * 0.16
    return [0.28 * k, 0.6 * k, 0.16 * k]
  })
}

/** Warm tan-brown rock with low-frequency cracks. */
export function makeRockTexture(size = 128): THREE.DataTexture {
  return makeNoiseTexture(size, (u, v) => {
    const n = fbm(u * 6, v * 6, 5)
    const crack = 1 - Math.abs(fbm(u * 15, v * 15, 3) * 2 - 1)
    const k = 0.8 + n * 0.2 - crack * 0.22
    return [0.78 * k, 0.6 * k, 0.42 * k]
  })
}
