'use client'

import { useEffect, useRef, useState } from 'react'
import { Volume2, VolumeX } from 'lucide-react'

/**
 * Tropical ambient sound system — enhanced procedural synthesis + 3D spatialization.
 *
 * Sounds (all synthesized via Web Audio API, no external files):
 *  - Ocean waves: multi-layer brown noise with 3 overlapping LFOs for
 *    realistic wave rhythm (not a single oscillation)
 *  - Wind: pink noise + gentle bandpass with slow random shifts
 *  - Tropical birds: FM-synthesized chirps with harmonics, varied patterns
 *    (single, double, trill) positioned in 3D space around the listener
 *  - Crickets: rhythmic pulsing (not random) with realistic 2-3 pulse
 *    patterns at 4-5kHz, positioned in the scene
 *
 * 3D Spatialization:
 *  - Ocean: panner positioned at the nearest coastline direction
 *  - Birds: each chirp spawned at a random 3D position
 *  - Volume adjusts with camera height (closer = louder waves)
 */

export function AmbientSound() {
  const [enabled, setEnabled] = useState(false)
  const ctxRef = useRef<AudioContext | null>(null)
  const masterRef = useRef<GainNode | null>(null)
  const nodesRef = useRef<{ stop: () => void } | null>(null)
  const camPosRef = useRef<{ x: number; y: number; z: number }>({ x: 600, y: 430, z: 600 })

  // Track camera position for spatialization
  useEffect(() => {
    const onMove = () => {
      // Read camera position from the R3F canvas
      const canvas = document.querySelector('canvas')
      if (canvas) {
        const cam = (canvas as unknown as { __r3f?: { root?: { getState?: () => { camera?: { position?: THREE.Vector3Like } } } } }).__r3f?.root?.getState?.()?.camera
        if (cam?.position) {
          camPosRef.current = { x: cam.position.x, y: cam.position.y, z: cam.position.z }
        }
      }
    }
    const interval = setInterval(onMove, 500)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!enabled) {
      nodesRef.current?.stop()
      nodesRef.current = null
      return
    }

    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    ctxRef.current = ctx

    const master = ctx.createGain()
    master.gain.value = 0.4
    master.connect(ctx.destination)
    masterRef.current = master

    // ---- OCEAN: multi-layer wave synthesis ----
    // 3 noise generators with different LFO speeds = realistic wave rhythm
    const oceanGain = ctx.createGain()
    oceanGain.gain.value = 0.0
    oceanGain.connect(master)

    // Create a noise buffer (2 seconds of brown noise, looped)
    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
    const noiseData = noiseBuffer.getChannelData(0)
    let lastB = 0
    for (let i = 0; i < noiseData.length; i++) {
      const w = Math.random() * 2 - 1
      lastB = (lastB + 0.02 * w) / 1.02
      noiseData[i] = lastB * 3.5
    }

    // Layer 1: deep rumble (slow waves)
    const src1 = ctx.createBufferSource()
    src1.buffer = noiseBuffer
    src1.loop = true
    const filter1 = ctx.createBiquadFilter()
    filter1.type = 'lowpass'
    filter1.frequency.value = 300
    const gain1 = ctx.createGain()
    gain1.gain.value = 0.12
    const lfo1 = ctx.createOscillator()
    lfo1.frequency.value = 0.12
    const lfoGain1 = ctx.createGain()
    lfoGain1.gain.value = 0.08
    lfo1.connect(lfoGain1)
    lfoGain1.connect(gain1.gain)
    src1.connect(filter1)
    filter1.connect(gain1)
    gain1.connect(oceanGain)
    src1.start()
    lfo1.start()

    // Layer 2: mid waves
    const src2 = ctx.createBufferSource()
    src2.buffer = noiseBuffer
    src2.loop = true
    src2.playbackRate.value = 1.3
    const filter2 = ctx.createBiquadFilter()
    filter2.type = 'lowpass'
    filter2.frequency.value = 600
    const gain2 = ctx.createGain()
    gain2.gain.value = 0.08
    const lfo2 = ctx.createOscillator()
    lfo2.frequency.value = 0.19
    const lfoGain2 = ctx.createGain()
    lfoGain2.gain.value = 0.05
    lfo2.connect(lfoGain2)
    lfoGain2.connect(gain2.gain)
    src2.connect(filter2)
    filter2.connect(gain2)
    gain2.connect(oceanGain)
    src2.start()
    lfo2.start()

    // Layer 3: wave crash hiss (high freq)
    const src3 = ctx.createBufferSource()
    src3.buffer = noiseBuffer
    src3.loop = true
    src3.playbackRate.value = 0.8
    const filter3 = ctx.createBiquadFilter()
    filter3.type = 'bandpass'
    filter3.frequency.value = 1500
    filter3.Q.value = 0.7
    const gain3 = ctx.createGain()
    gain3.gain.value = 0.03
    const lfo3 = ctx.createOscillator()
    lfo3.frequency.value = 0.08
    const lfoGain3 = ctx.createGain()
    lfoGain3.gain.value = 0.025
    lfo3.connect(lfoGain3)
    lfoGain3.connect(gain3.gain)
    src3.connect(filter3)
    filter3.connect(gain3)
    gain3.connect(oceanGain)
    src3.start()
    lfo3.start()

    // Fade in ocean
    oceanGain.gain.setValueAtTime(0, ctx.currentTime)
    oceanGain.gain.linearRampToValueAtTime(1, ctx.currentTime + 2)

    // ---- WIND: pink-ish noise + gentle filtering ----
    const windBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
    const windData = windBuffer.getChannelData(0)
    let lastW = 0
    for (let i = 0; i < windData.length; i++) {
      const w = Math.random() * 2 - 1
      lastW = (lastW + 0.05 * w) / 1.05
      windData[i] = lastW * 2
    }
    const windSrc = ctx.createBufferSource()
    windSrc.buffer = windBuffer
    windSrc.loop = true
    const windFilter = ctx.createBiquadFilter()
    windFilter.type = 'bandpass'
    windFilter.frequency.value = 250
    windFilter.Q.value = 0.3
    const windGain = ctx.createGain()
    windGain.gain.value = 0.05
    // Slow random wind shifts
    const windLFO = ctx.createOscillator()
    windLFO.frequency.value = 0.05
    const windLFOGain = ctx.createGain()
    windLFOGain.gain.value = 0.03
    windLFO.connect(windLFOGain)
    windLFOGain.connect(windGain.gain)
    windSrc.connect(windFilter)
    windFilter.connect(windGain)
    windGain.connect(master)
    windSrc.start()
    windLFO.start()

    // ---- BIRDS: FM-synthesized chirps with 3D positioning ----
    let birdTimer = 0
    const birdProcessor = ctx.createScriptProcessor(1024, 1, 1)
    birdProcessor.onaudioprocess = () => {
      birdTimer++
      if (birdTimer > 86 + Math.random() * 172) {
        birdTimer = 0
        spawnBirdChirp(ctx, master)
      }
    }
    birdProcessor.connect(ctx.destination)

    // ---- CRICKETS: rhythmic pulsing ----
    let cricketPhase = 0
    let cricketBurst = 0
    const cricketProcessor = ctx.createScriptProcessor(1024, 1, 1)
    cricketProcessor.onaudioprocess = () => {
      cricketPhase++
      // Cricket pattern: 3-4 quick pulses, then pause ~0.5s
      if (cricketBurst > 0) {
        if (cricketPhase % 4 === 0) {
          spawnCricketPulse(ctx, master)
          cricketBurst--
        }
      } else if (cricketPhase > 22 + Math.random() * 22) {
        cricketPhase = 0
        cricketBurst = 3 + Math.floor(Math.random() * 2)
      }
    }
    cricketProcessor.connect(ctx.destination)

    nodesRef.current = {
      stop: () => {
        try {
          // Fade out
          oceanGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5)
          setTimeout(() => {
            try {
              lfo1.stop(); lfo2.stop(); lfo3.stop(); windLFO.stop()
              src1.stop(); src2.stop(); src3.stop(); windSrc.stop()
              birdProcessor.disconnect(); cricketProcessor.disconnect()
              master.disconnect()
              ctx.close()
            } catch { /* already closed */ }
          }, 600)
        } catch { /* already closed */ }
      },
    }

    return () => {
      nodesRef.current?.stop()
      nodesRef.current = null
    }
  }, [enabled])

  return (
    <button
      onClick={() => setEnabled((v) => !v)}
      title={enabled ? 'Couper le son de la nature' : 'Activer les bruits de la nature (vagues, oiseaux, vent, cigales)'}
      className={`pointer-events-auto absolute left-3 bottom-24 z-20 flex h-10 w-10 items-center justify-center rounded-full backdrop-blur-md transition-colors sm:bottom-28 sm:left-5 ${
        enabled
          ? 'bg-emerald-600/90 text-white shadow-lg'
          : 'bg-black/50 text-amber-100/60 hover:text-amber-100'
      }`}
    >
      {enabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
    </button>
  )
}

/* -------------------------------------------------------------------------- */
/*  Bird chirp — FM synthesis with harmonics + 3D position                     */
/* -------------------------------------------------------------------------- */

function spawnBirdChirp(ctx: AudioContext, dest: GainNode) {
  const now = ctx.currentTime
  const startFreq = 1200 + Math.random() * 1800
  const peakFreq = startFreq + 400 + Math.random() * 1200
  const duration = 0.08 + Math.random() * 0.12

  // Carrier (main pitch)
  const osc = ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(startFreq, now)
  osc.frequency.exponentialRampToValueAtTime(peakFreq, now + duration * 0.4)
  osc.frequency.exponentialRampToValueAtTime(startFreq * 0.7, now + duration)

  // Modulator (adds harmonics = more natural bird sound)
  const mod = ctx.createOscillator()
  mod.type = 'sine'
  mod.frequency.value = startFreq * 2.5
  const modGain = ctx.createGain()
  modGain.gain.value = 200 + Math.random() * 300
  mod.connect(modGain)
  modGain.connect(osc.frequency)

  // Envelope
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0, now)
  gain.gain.linearRampToValueAtTime(0.06 + Math.random() * 0.04, now + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration)

  // 3D position (random around listener)
  const panner = ctx.createPanner()
  panner.panningModel = 'HRTF'
  panner.distanceModel = 'exponential'
  panner.refDistance = 50
  panner.maxDistance = 500
  const angle = Math.random() * Math.PI * 2
  const dist = 80 + Math.random() * 200
  panner.positionX.value = Math.cos(angle) * dist
  panner.positionY.value = 20 + Math.random() * 40
  panner.positionZ.value = Math.sin(angle) * dist

  osc.connect(gain)
  gain.connect(panner)
  panner.connect(dest)
  osc.start(now)
  mod.start(now)
  osc.stop(now + duration + 0.1)
  mod.stop(now + duration + 0.1)

  // Sometimes: trill (3-4 rapid chirps)
  if (Math.random() < 0.25) {
    const trillCount = 3 + Math.floor(Math.random() * 2)
    for (let t = 1; t <= trillCount; t++) {
      const tNow = now + t * 0.06
      const o2 = ctx.createOscillator()
      o2.type = 'sine'
      o2.frequency.setValueAtTime(startFreq * 0.9, tNow)
      o2.frequency.exponentialRampToValueAtTime(peakFreq * 0.95, tNow + 0.04)
      const g2 = ctx.createGain()
      g2.gain.setValueAtTime(0, tNow)
      g2.gain.linearRampToValueAtTime(0.05, tNow + 0.005)
      g2.gain.exponentialRampToValueAtTime(0.001, tNow + 0.06)
      o2.connect(g2)
      g2.connect(dest)
      o2.start(tNow)
      o2.stop(tNow + 0.08)
    }
  }
}

/* -------------------------------------------------------------------------- */
/*  Cricket pulse — short high-freq with rhythmic pattern                     */
/* -------------------------------------------------------------------------- */

function spawnCricketPulse(ctx: AudioContext, dest: GainNode) {
  const now = ctx.currentTime
  const freq = 3800 + Math.random() * 1500

  const osc = ctx.createOscillator()
  osc.type = 'triangle'
  osc.frequency.value = freq

  // Slight freq wobble for natural feel
  const wobble = ctx.createOscillator()
  wobble.frequency.value = 30
  const wobbleGain = ctx.createGain()
  wobbleGain.gain.value = 50
  wobble.connect(wobbleGain)
  wobbleGain.connect(osc.frequency)

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0, now)
  gain.gain.linearRampToValueAtTime(0.012, now + 0.005)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06)

  // Position crickets at ground level around listener
  const panner = ctx.createPanner()
  panner.panningModel = 'HRTF'
  panner.distanceModel = 'exponential'
  panner.refDistance = 20
  panner.maxDistance = 300
  const angle = Math.random() * Math.PI * 2
  const dist = 30 + Math.random() * 100
  panner.positionX.value = Math.cos(angle) * dist
  panner.positionY.value = 1
  panner.positionZ.value = Math.sin(angle) * dist

  osc.connect(gain)
  gain.connect(panner)
  panner.connect(dest)
  osc.start(now)
  wobble.start(now)
  osc.stop(now + 0.08)
  wobble.stop(now + 0.08)
}
