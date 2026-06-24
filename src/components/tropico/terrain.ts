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

export const ISLAND_SIZE = 110 // world units covered by the terrain grid
export const ISLAND_RADIUS = 46 // radius where the island fades into the sea

/**
 * Terrain height at a given world (x, z) coordinate.
 * Uses a radial falloff so the island sits in the middle of the ocean,
 * layered fBm noise for hills, and a ridge term for mountain crests.
 */
export function islandHeight(x: number, z: number): number {
  const d = Math.sqrt(x * x + z * z)
  const falloff = Math.max(0, 1 - Math.pow(d / ISLAND_RADIUS, 2.3))
  const base = fbm(x * 0.045, z * 0.045, 5)
  const ridge = 1 - Math.abs(fbm(x * 0.03 + 50, z * 0.03 + 50, 4) * 2 - 1)
  // Boosted relief: taller ridges + stronger hills for visible mountains
  let h = falloff * 10 + (base - 0.5) * falloff * 8 + ridge * ridge * falloff * 14 - 2.2
  return h
}

/* -------------------------------------------------------------------------- */
/*  Terrain coloring (Tropico-style bright tropical palette)                  */
/* -------------------------------------------------------------------------- */

// Saturated cartoon palette (Tropico 6 vibe) — warm bright rocks
const C_WET_SAND = new THREE.Color('#c6a868')
const C_SAND = new THREE.Color('#f5dc94')
const C_GRASS = new THREE.Color('#5ec638')
const C_GRASS_DARK = new THREE.Color('#3a9a26')
const C_FOREST = new THREE.Color('#1f7a1a')
const C_ROCK = new THREE.Color('#c09877')
const C_ROCK_DARK = new THREE.Color('#9a7654')
const C_SNOW = new THREE.Color('#ffffff')

const _tmp = new THREE.Color()

export function islandColor(height: number, out: THREE.Color = _tmp): THREE.Color {
  if (height < -1.4) {
    out.copy(C_WET_SAND)
  } else if (height < 0.3) {
    out.copy(C_WET_SAND).lerp(C_SAND, (height + 1.4) / 1.7)
  } else if (height < 1.8) {
    out.copy(C_SAND).lerp(C_GRASS, (height - 0.3) / 1.5)
  } else if (height < 4.5) {
    out.copy(C_GRASS).lerp(C_GRASS_DARK, (height - 1.8) / 2.7)
  } else if (height < 7.5) {
    out.copy(C_GRASS_DARK).lerp(C_FOREST, (height - 4.5) / 3)
  } else if (height < 9.5) {
    out.copy(C_FOREST).lerp(C_ROCK, (height - 7.5) / 2)
  } else if (height < 10.5) {
    out.copy(C_ROCK).lerp(C_ROCK_DARK, (height - 9.5) / 1)
  } else {
    out.copy(C_ROCK_DARK).lerp(C_SNOW, Math.min(1, (height - 10.5) / 2))
  }
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
  },
): Placement[] {
  const rand = makeRng(opts.seed)
  const area = opts.area ?? ISLAND_RADIUS * 2
  const maxSlope = opts.maxSlope ?? 1.4
  const result: Placement[] = []
  let attempts = 0
  while (result.length < count && attempts < count * 30) {
    attempts++
    const x = (rand() - 0.5) * area
    const z = (rand() - 0.5) * area
    const h = islandHeight(x, z)
    if (h < opts.minH || h > opts.maxH) continue
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
