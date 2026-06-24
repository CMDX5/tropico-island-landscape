import * as THREE from 'three'

/* -------------------------------------------------------------------------- */
/*  Value-noise based fractal Brownian motion (fBm)                            */
/* -------------------------------------------------------------------------- */

function hash(x: number, y: number): number {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t)
}

export function valueNoise(x: number, y: number): number {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const xf = x - xi
  const yf = y - yi
  const a = hash(xi, yi)
  const b = hash(xi + 1, yi)
  const c = hash(xi, yi + 1)
  const d = hash(xi + 1, yi + 1)
  const u = smooth(xf)
  const v = smooth(yf)
  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v
}

export function fbm(x: number, y: number, octaves = 5): number {
  let value = 0
  let amp = 0.5
  let freq = 1
  for (let i = 0; i < octaves; i++) {
    value += amp * valueNoise(x * freq, y * freq)
    freq *= 2
    amp *= 0.5
  }
  return value
}

/* -------------------------------------------------------------------------- */
/*  Island shape                                                               */
/* -------------------------------------------------------------------------- */

export const ISLAND_SIZE = 340 // world units covered by the terrain grid (enlarged)
export const ISLAND_RADIUS = 142 // radius where the island fades into the sea (enlarged)

/* -------------------------------------------------------------------------- */
/*  Spatial biome masks (large-scale regions)                                  */
/* -------------------------------------------------------------------------- */

export type Biome = 'sand' | 'plain' | 'forest' | 'mountain' | 'hill'

/**
 * Low-frequency mask that localises mountain ranges to specific regions
 * of the island (not everywhere). Returns 0..1.
 */
function mountainMask(x: number, z: number): number {
  const n = fbm(x * 0.013 + 200, z * 0.013 + 200, 3)
  return Math.max(0, smoothstep(0.48, 0.6, n))
}

/**
 * Low-frequency mask that localises dense forest to specific regions.
 */
function forestMask(x: number, z: number): number {
  const n = fbm(x * 0.018 + 500, z * 0.018 + 500, 3)
  return Math.max(0, smoothstep(0.48, 0.6, n))
}

/**
 * Low-frequency mask for rolling hill regions (gentle elevated grassland).
 */
function hillMask(x: number, z: number): number {
  const n = fbm(x * 0.02 + 800, z * 0.02 + 800, 3)
  return Math.max(0, smoothstep(0.48, 0.62, n))
}

function smoothstep(a: number, b: number, t: number): number {
  const x = Math.max(0, Math.min(1, (t - a) / (b - a)))
  return x * x * (3 - 2 * x)
}

/**
 * Returns the dominant biome at a world position, using spatial masks so
 * that sand / plain / forest / mountain / hill occupy different regions
 * of the island rather than being stacked by altitude.
 */
export function biomeAt(x: number, z: number, height: number): Biome {
  // Coastline is always sand
  if (height < 0.6) return 'sand'
  const m = mountainMask(x, z)
  if (m > 0.5 && height > 4) return 'mountain'
  const f = forestMask(x, z)
  if (f > 0.5) return 'forest'
  const hh = hillMask(x, z)
  if (hh > 0.5) return 'hill'
  return 'plain'
}

/**
 * Terrain height at a given world (x, z) coordinate.
 * Mostly FLAT (per user request) with localised relief:
 *  - gentle base lift from the radial falloff
 *  - mild hills everywhere
 *  - strong mountain ridges ONLY where the mountain mask is high
 */
export function islandHeight(x: number, z: number): number {
  const d = Math.sqrt(x * x + z * z)
  const falloff = Math.max(0, 1 - Math.pow(d / ISLAND_RADIUS, 2.3))
  const base = fbm(x * 0.045, z * 0.045, 5)
  // very gentle base relief (flat island)
  let h = falloff * 2.5 + (base - 0.5) * falloff * 2.5 - 1.6
  // localised mountains (only in mountain regions)
  const mMask = mountainMask(x, z)
  if (mMask > 0) {
    const ridge = 1 - Math.abs(fbm(x * 0.03 + 50, z * 0.03 + 50, 4) * 2 - 1)
    h += ridge * ridge * mMask * falloff * 18
  }
  // gentle hills in hill regions
  const hMask = hillMask(x, z)
  if (hMask > 0) {
    h += (base - 0.5) * hMask * falloff * 4
  }
  return h
}

/* -------------------------------------------------------------------------- */
/*  Terrain coloring (Tropico-style bright tropical palette)                  */
/* -------------------------------------------------------------------------- */

// Saturated cartoon palette (Tropico 6 vibe) — vibrant tropical colors
const C_WET_SAND = new THREE.Color('#d9b878')
const C_SAND = new THREE.Color('#f5d488')
const C_GRASS = new THREE.Color('#4ec638')
const C_GRASS_DARK = new THREE.Color('#2a8a1e')
const C_FOREST = new THREE.Color('#1a6a14')
const C_ROCK = new THREE.Color('#c09877')
const C_ROCK_DARK = new THREE.Color('#9a7654')
const C_SNOW = new THREE.Color('#ffffff')

const _tmp = new THREE.Color()

/**
 * Terrain color at a position. Uses the spatial biome (so sand / plain /
 * forest / mountain / hill occupy distinct regions) combined with altitude
 * for snow caps on the highest peaks.
 */
export function islandColorAt(x: number, z: number, height: number, out: THREE.Color = _tmp): THREE.Color {
  const biome = biomeAt(x, z, height)
  // subtle per-position tint
  const tint = 0.92 + (fbm(x * 0.3, z * 0.3, 2) - 0.5) * 0.16
  switch (biome) {
    case 'sand':
      out.copy(height < -0.5 ? C_WET_SAND : C_SAND)
      break
    case 'plain':
      out.copy(C_GRASS).lerp(C_GRASS_DARK, Math.min(1, height / 4) * 0.5)
      break
    case 'hill':
      out.copy(C_GRASS_DARK).lerp(C_GRASS, 0.3)
      break
    case 'forest':
      out.copy(C_FOREST).lerp(C_GRASS_DARK, 0.3)
      break
    case 'mountain':
      if (height > 13) {
        out.copy(C_ROCK_DARK).lerp(C_SNOW, Math.min(1, (height - 13) / 3))
      } else if (height > 9) {
        out.copy(C_ROCK).lerp(C_ROCK_DARK, (height - 9) / 4)
      } else {
        out.copy(C_GRASS_DARK).lerp(C_ROCK, Math.min(1, (height - 4) / 5))
      }
      break
  }
  out.multiplyScalar(tint)
  return out
}

/* -------------------------------------------------------------------------- */
/*  Rivers (downhill descent tracing)                                         */
/* -------------------------------------------------------------------------- */

/**
 * Trace a river from a high seed point downhill to the coast using
 * greedy gradient descent on the island height field. Returns the
 * path as a list of [x, z] world coordinates.
 */
export function traceRiver(sx: number, sz: number, maxSteps = 400): Array<[number, number]> {
  const path: Array<[number, number]> = [[sx, sz]]
  let x = sx
  let z = sz
  const step = 0.9
  for (let i = 0; i < maxSteps; i++) {
    const h = islandHeight(x, z)
    if (h < 0.3) break // reached the beach / sea
    const hL = islandHeight(x - step, z)
    const hR = islandHeight(x + step, z)
    const hD = islandHeight(x, z - step)
    const hU = islandHeight(x, z + step)
    const gx = (hR - hL) / (2 * step)
    const gz = (hU - hD) / (2 * step)
    const len = Math.hypot(gx, gz)
    if (len < 0.002) {
      // stalled on a flat spot — nudge with a tiny random walk downhill
      x += (Math.random() - 0.5) * step
      z += (Math.random() - 0.5) * step
      path.push([x, z])
      continue
    }
    x -= (gx / len) * step
    z -= (gz / len) * step
    path.push([x, z])
  }
  return path
}

/* -------------------------------------------------------------------------- */
/*  Deterministic placement helpers                                            */
/* -------------------------------------------------------------------------- */

export type Placement = {
  position: [number, number, number]
  scale: number
  rotation: number
}

/** Small seeded PRNG so the landscape is stable between renders. */
function makeRng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 4294967296
  }
}

/**
 * Scatter objects across walkable terrain (gentle grassy slopes).
 * Used for palm trees, bushes, rocks, etc.
 */
export function scatter(
  count: number,
  opts: {
    minH: number
    maxH: number
    maxSlope?: number
    seed: number
    area?: number
    minScale?: number
    maxScale?: number
    avoid?: Array<{ x: number; z: number; r: number }>
    biome?: Biome | Biome[]
  },
): Placement[] {
  const rand = makeRng(opts.seed)
  const area = opts.area ?? ISLAND_RADIUS * 2
  const maxSlope = opts.maxSlope ?? 1.4
  const biomeList = opts.biome ? (Array.isArray(opts.biome) ? opts.biome : [opts.biome]) : null
  const result: Placement[] = []
  let attempts = 0
  while (result.length < count && attempts < count * 30) {
    attempts++
    const x = (rand() - 0.5) * area
    const z = (rand() - 0.5) * area
    const h = islandHeight(x, z)
    if (h < opts.minH || h > opts.maxH) continue
    if (biomeList) {
      const b = biomeAt(x, z, h)
      if (!biomeList.includes(b)) continue
    }
    const hx = islandHeight(x + 0.8, z)
    const hz = islandHeight(x, z + 0.8)
    const slope = Math.abs(hx - h) + Math.abs(hz - h)
    if (slope > maxSlope) continue
    if (opts.avoid) {
      let blocked = false
      for (const a of opts.avoid) {
        const dx = a.x - x
        const dz = a.z - z
        if (dx * dx + dz * dz < a.r * a.r) {
          blocked = true
          break
        }
      }
      if (blocked) continue
    }
    const sMin = opts.minScale ?? 1
    const sMax = opts.maxScale ?? 1
    result.push({
      position: [x, h - 0.1, z],
      scale: sMin + rand() * (sMax - sMin),
      rotation: rand() * Math.PI * 2,
    })
  }
  return result
}
