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

export const ISLAND_SIZE = 620 // world units covered by the terrain grid (much larger)
export const ISLAND_RADIUS = 260 // radius where the island fades into the sea (much larger)

/* -------------------------------------------------------------------------- */
/*  Spatial biome masks (large-scale regions)                                  */
/* -------------------------------------------------------------------------- */

export type Biome = 'sand' | 'plain' | 'jungle' | 'mountain' | 'hill' | 'volcano' | 'plateau'

/**
 * Central volcano mask: strong near the island center, fades out.
 * Returns 0..1 (1 at the very center).
 */
function volcanoMask(x: number, z: number): number {
  const d = Math.sqrt(x * x + z * z)
  // volcano cone within ~22% of island radius from center
  const r = ISLAND_RADIUS * 0.22
  return Math.max(0, 1 - Math.pow(d / r, 2.0))
}

/**
 * Low-frequency mask that localises mountain ranges to specific regions
 * of the island (not everywhere). Returns 0..1.
 */
function mountainMask(x: number, z: number): number {
  const n = fbm(x * 0.013 + 200, z * 0.013 + 200, 3)
  return Math.max(0, smoothstep(0.48, 0.6, n))
}

/**
 * Low-frequency mask that localises dense jungle to specific regions.
 * Wider threshold for lush coverage (very wet climate).
 */
function jungleMask(x: number, z: number): number {
  const n = fbm(x * 0.018 + 500, z * 0.018 + 500, 3)
  // wide threshold so jungle covers ~60% of the island (very wet climate)
  return Math.max(0, smoothstep(0.35, 0.5, n))
}

/**
 * Low-frequency mask for rocky plateaus on high ground (arid zones).
 */
function plateauMask(x: number, z: number): number {
  const n = fbm(x * 0.016 + 900, z * 0.016 + 900, 3)
  return Math.max(0, smoothstep(0.55, 0.7, n))
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
 * that sand / plain / jungle / mountain / volcano / plateau / hill occupy
 * different regions of the island.
 */
export function biomeAt(x: number, z: number, height: number): Biome {
  // Coastline is always white sand (extended to cover the beach strip)
  if (height < 1.5) return 'sand'
  // Central volcano takes priority
  if (volcanoMask(x, z) > 0.3 && height > 6) return 'volcano'
  // Rocky plateaus on high ground
  if (height > 8 && plateauMask(x, z) > 0.5) return 'plateau'
  // Mountains
  const m = mountainMask(x, z)
  if (m > 0.5 && height > 4) return 'mountain'
  // Dense jungle (very wet climate)
  const j = jungleMask(x, z)
  if (j > 0.5) return 'jungle'
  // Rolling hills
  const hh = hillMask(x, z)
  if (hh > 0.5) return 'hill'
  return 'plain'
}

/**
 * Terrain height at a given world (x, z) coordinate.
 * Mostly flat with a CENTRAL VOLCANO (tall cone + snow cap), localised
 * mountains, plateaus, and gentle hills.
 *
 * The island has a STEEP coastal dropoff: inside the island disc the
 * terrain stays above sea level (no blue holes); outside the disc the
 * terrain plunges well below sea level so the ocean covers it directly
 * (no flat sandy plateau around the island).
 */
export function islandHeight(x: number, z: number): number {
  const d = Math.sqrt(x * x + z * z)
  // IRREGULAR ORGANIC SHAPE: modulate the radius by angular noise so the
  // island is not a perfect oval — has bays, peninsulas, lobes.
  const angle = Math.atan2(z, x)
  const radiusNoise = 0.78 + 0.22 * fbm(Math.cos(angle) * 1.5 + 10, Math.sin(angle) * 1.5 + 10, 3)
  const effectiveRadius = ISLAND_RADIUS * radiusNoise
  const falloff = Math.max(0, 1 - Math.pow(d / effectiveRadius, 2.3))
  const base = fbm(x * 0.045, z * 0.045, 5)
  // base relief: raised so interior stays above sea level (no blue holes)
  let h = falloff * 3.0 + (base - 0.5) * falloff * 2.0 + 0.2
  // CENTRAL VOLCANO: taller cone with crater rim (height ~52)
  const vMask = volcanoMask(x, z)
  if (vMask > 0) {
    const volcanoD = Math.sqrt(x * x + z * z)
    const volcanoR = ISLAND_RADIUS * 0.22
    const cone = Math.max(0, 1 - volcanoD / volcanoR)
    const crater = volcanoD < volcanoR * 0.22 ? Math.cos(volcanoD / (volcanoR * 0.22) * Math.PI * 0.5) * 5 : 0
    h += cone * cone * 52 - crater
  }
  // localised mountains (only in mountain regions)
  const mMask = mountainMask(x, z)
  if (mMask > 0) {
    const ridge = 1 - Math.abs(fbm(x * 0.03 + 50, z * 0.03 + 50, 4) * 2 - 1)
    h += ridge * ridge * mMask * falloff * 18
  }
  // rocky plateaus: flat-topped elevated zones
  const pMask = plateauMask(x, z)
  if (pMask > 0 && h > 4) {
    h += pMask * 6
  }
  // gentle hills in hill regions
  const hMask = hillMask(x, z)
  if (hMask > 0) {
    h += (base - 0.5) * hMask * falloff * 4
  }
  // CLAMP: inside the island disc, terrain must stay above sea level
  // (sea level ~0.0; ocean surface at y=-0.25). Raise to +0.8 minimum
  // so beaches/land read as solid, never as water holes.
  if (falloff > 0.02 && h < 0.8) {
    h = 0.8
  }
  // BEACH: a clearly visible sandy strip near the coast (falloff 0.05-0.25)
  // stays low and flat so sand reads as a beach around the whole island.
  if (falloff > 0.02 && falloff < 0.22 && h < 1.4) {
    h = 0.8 + falloff * 2.5
  }
  // STEEP COASTAL DROPOFF: outside the island disc, plunge the terrain
  // deep underwater so the ocean covers it directly (no flat sandy plateau).
  // The further from the island, the deeper it goes.
  if (falloff <= 0.02) {
    // beyond the island: drop to -8 (well below the ocean surface at -0.25)
    // so the discard shader hides it and the ocean renders on top.
    h = -8 - Math.min(20, Math.max(0, (d - ISLAND_RADIUS) * 0.3))
  }
  return h
}

/* -------------------------------------------------------------------------- */
/*  Terrain coloring (Tropico-style bright tropical palette)                  */
/* -------------------------------------------------------------------------- */

// Saturated cartoon palette (Tropico 6 vibe) — white sand, lush jungle, dark volcano
const C_WET_SAND = new THREE.Color('#e8dcc4')
const C_SAND = new THREE.Color('#fdf3d4')      // white sand (Tropico 6)
const C_GRASS = new THREE.Color('#5ed638')      // vibrant prairie
const C_GRASS_DARK = new THREE.Color('#2e9a1e')
const C_FOREST = new THREE.Color('#0f7a10')     // dense jungle (saturated)
const C_ROCK = new THREE.Color('#b89878')
const C_ROCK_DARK = new THREE.Color('#7a6248')
const C_VOLCANO = new THREE.Color('#4a3a30')    // dark volcanic rock
const C_LAVA = new THREE.Color('#ff5a1e')       // lava glow at crater
const C_SNOW = new THREE.Color('#ffffff')

const _tmp = new THREE.Color()

/**
 * Terrain color at a position. Uses the spatial biome so each region
 * (white sand, prairie, jungle, mountain, volcano, plateau, hill) has a
 * distinct color. Volcano crater glows with lava.
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
    case 'jungle':
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
    case 'plateau':
      // arid rocky plateau: tan rock with sparse vegetation tint
      out.copy(C_ROCK).lerp(C_ROCK_DARK, Math.min(1, (height - 8) / 6))
      break
    case 'volcano': {
      const vd = Math.sqrt(x * x + z * z)
      const vr = ISLAND_RADIUS * 0.22
      if (vd < vr * 0.22 && height > 30) {
        // crater: lava glow
        out.copy(C_LAVA)
      } else if (height > 30) {
        // snow cap on the volcano summit
        out.copy(C_VOLCANO).lerp(C_SNOW, Math.min(1, (height - 30) / 15))
      } else {
        // volcanic slopes: dark rock, lighter toward base
        const t = Math.min(1, (vd - vr * 0.22) / (vr * 0.78))
        out.copy(C_VOLCANO).lerp(C_ROCK_DARK, t * 0.7)
      }
      break
    }
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
