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

/** Warm grainy sand with strong grain contrast. */
export function makeSandTexture(size = 256): THREE.DataTexture {
  return makeNoiseTexture(size, (u, v) => {
    const n = fbm(u * 10, v * 10, 4)
    const grain = fbm(u * 50, v * 50, 2)
    const pebble = fbm(u * 100, v * 100, 2)
    const k = 0.7 + n * 0.3 + grain * 0.15 + pebble * 0.1
    return [0.98 * k, 0.84 * k, 0.52 * k]
  })
}

/** Green grass with strong blade contrast. */
export function makeGrassTexture(size = 256): THREE.DataTexture {
  return makeNoiseTexture(size, (u, v) => {
    const n = fbm(u * 8, v * 8, 4)
    const blade = fbm(u * 35, v * 35, 2)
    const tuft = fbm(u * 80, v * 80, 2)
    const k = 0.6 + n * 0.4 + blade * 0.25 + tuft * 0.1
    return [0.24 * k, 0.62 * k, 0.14 * k]
  })
}

/** Warm tan-brown rock with strong cracks. */
export function makeRockTexture(size = 256): THREE.DataTexture {
  return makeNoiseTexture(size, (u, v) => {
    const n = fbm(u * 5, v * 5, 5)
    const crack = 1 - Math.abs(fbm(u * 12, v * 12, 3) * 2 - 1)
    const detail = fbm(u * 40, v * 40, 2)
    const k = 0.75 + n * 0.25 - crack * 0.35 + detail * 0.1
    return [0.82 * k, 0.58 * k, 0.38 * k]
  })
}

/** Crisp white snow with faint blue glitter. */
export function makeSnowTexture(size = 256): THREE.DataTexture {
  return makeNoiseTexture(size, (u, v) => {
    const n = fbm(u * 18, v * 18, 3)
    const grain = fbm(u * 60, v * 60, 2)
    const k = 0.9 + n * 0.1 + grain * 0.05
    return [k, k, 0.98 * k]
  })
}
