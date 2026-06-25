'use client'

import { useEffect, useRef, useState } from 'react'
import { Volume2, VolumeX } from 'lucide-react'

/**
 * Tropical ambient sound system using the Web Audio API.
 * Generates procedural audio (no external files needed):
 *  - Ocean waves: filtered brown noise with slow volume oscillation
 *  - Wind: filtered white noise, very low volume
 *  - Tropical birds: occasional chirp synthesis (sine sweeps)
 *  - Cricket/insects: high-freq intermittent pulses
 *
 * Inspired by Hawaiian/Mexican tropical ambience.
 */

export function AmbientSound() {
  const [enabled, setEnabled] = useState(false)
  const ctxRef = useRef<AudioContext | null>(null)
  const masterRef = useRef<GainNode | null>(null)
  const nodesRef = useRef<{ stop: () => void } | null>(null)

  useEffect(() => {
    if (!enabled) {
      // stop all sounds
      nodesRef.current?.stop()
      nodesRef.current = null
      return
    }

    // Create AudioContext (lazy, on user interaction)
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    ctxRef.current = ctx

    const master = ctx.createGain()
    master.gain.value = 0.5
    master.connect(ctx.destination)
    masterRef.current = master

    // ---- 1. OCEAN WAVES (brown noise + lowpass + slow LFO) ----
    const bufferSize = 4096
    const noiseNode = ctx.createScriptProcessor(bufferSize, 1, 1)
    let lastBrown = 0
    noiseNode.onaudioprocess = (e) => {
      const out = e.outputBuffer.getChannelData(0)
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1
        lastBrown = (lastBrown + 0.02 * white) / 1.02
        out[i] = lastBrown * 3.5
      }
    }

    const waveFilter = ctx.createBiquadFilter()
    waveFilter.type = 'lowpass'
    waveFilter.frequency.value = 500
    waveFilter.Q.value = 1

    const waveGain = ctx.createGain()
    waveGain.gain.value = 0.15

    // Slow LFO for wave volume (sounds like waves coming in/out)
    const waveLFO = ctx.createOscillator()
    waveLFO.frequency.value = 0.15 // very slow (one wave every ~6s)
    const waveLFOGain = ctx.createGain()
    waveLFOGain.gain.value = 0.12
    waveLFO.connect(waveLFOGain)
    waveLFOGain.connect(waveGain.gain)

    noiseNode.connect(waveFilter)
    waveFilter.connect(waveGain)
    waveGain.connect(master)
    waveLFO.start()

    // ---- 2. WIND (white noise + bandpass, very low) ----
    const windNoise = ctx.createScriptProcessor(bufferSize, 1, 1)
    windNoise.onaudioprocess = (e) => {
      const out = e.outputBuffer.getChannelData(0)
      for (let i = 0; i < bufferSize; i++) {
        out[i] = (Math.random() * 2 - 1) * 0.3
      }
    }
    const windFilter = ctx.createBiquadFilter()
    windFilter.type = 'bandpass'
    windFilter.frequency.value = 200
    windFilter.Q.value = 0.5
    const windGain = ctx.createGain()
    windGain.gain.value = 0.04

    const windLFO = ctx.createOscillator()
    windLFO.frequency.value = 0.08
    const windLFOGain = ctx.createGain()
    windLFOGain.gain.value = 0.02
    windLFO.connect(windLFOGain)
    windLFOGain.connect(windGain.gain)

    windNoise.connect(windFilter)
    windFilter.connect(windGain)
    windGain.connect(master)
    windLFO.start()

    // ---- 3. TROPICAL BIRDS (occasional chirp synthesis) ----
    let birdTimer = 0
    const birdInterval = ctx.createScriptProcessor(1024, 1, 1)
    birdInterval.onaudioprocess = () => {
      birdTimer++
      // chirp every ~2-5 seconds (at 44100/1024 ≈ 43 calls/sec)
      if (birdTimer > 86 + Math.random() * 129) {
        birdTimer = 0
        playBirdChirp(ctx, master)
      }
    }
    birdInterval.connect(ctx.destination) // needed to keep processing

    // ---- 4. INSECTS/CRICKETS (intermittent high-freq pulse) ----
    const insectTimer = ctx.createScriptProcessor(1024, 1, 1)
    let insectPhase = 0
    insectTimer.onaudioprocess = () => {
      insectPhase++
      // brief burst every ~0.5s
      if (insectPhase % 22 === 0 && Math.random() < 0.6) {
        playInsectPulse(ctx, master)
      }
    }
    insectTimer.connect(ctx.destination)

    nodesRef.current = {
      stop: () => {
        try {
          waveLFO.stop()
          windLFO.stop()
          noiseNode.disconnect()
          waveFilter.disconnect()
          waveGain.disconnect()
          windNoise.disconnect()
          windFilter.disconnect()
          windGain.disconnect()
          birdInterval.disconnect()
          insectTimer.disconnect()
          master.disconnect()
          ctx.close()
        } catch {
          // already closed
        }
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
      title={enabled ? 'Couper le son' : 'Activer les bruits de la nature (vagues, oiseaux, vent)'}
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
/*  Bird chirp — sine frequency sweep                                         */
/* -------------------------------------------------------------------------- */

function playBirdChirp(ctx: AudioContext, dest: GainNode) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  // random start freq + sweep up then down
  const startFreq = 1500 + Math.random() * 2000
  const peakFreq = startFreq + 500 + Math.random() * 1000
  const now = ctx.currentTime
  osc.frequency.setValueAtTime(startFreq, now)
  osc.frequency.exponentialRampToValueAtTime(peakFreq, now + 0.05)
  osc.frequency.exponentialRampToValueAtTime(startFreq * 0.8, now + 0.15)
  gain.gain.setValueAtTime(0, now)
  gain.gain.linearRampToValueAtTime(0.08, now + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2)
  osc.connect(gain)
  gain.connect(dest)
  osc.start(now)
  osc.stop(now + 0.25)
  // sometimes do a double chirp
  if (Math.random() < 0.4) {
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(startFreq * 1.1, now + 0.3)
    osc2.frequency.exponentialRampToValueAtTime(peakFreq * 1.05, now + 0.35)
    gain2.gain.setValueAtTime(0, now + 0.3)
    gain2.gain.linearRampToValueAtTime(0.06, now + 0.32)
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5)
    osc2.connect(gain2)
    gain2.connect(dest)
    osc2.start(now + 0.3)
    osc2.stop(now + 0.55)
  }
}

/* -------------------------------------------------------------------------- */
/*  Insect pulse — short high-freq buzz                                       */
/* -------------------------------------------------------------------------- */

function playInsectPulse(ctx: AudioContext, dest: GainNode) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'square'
  osc.frequency.value = 4000 + Math.random() * 2000
  const now = ctx.currentTime
  gain.gain.setValueAtTime(0, now)
  gain.gain.linearRampToValueAtTime(0.015, now + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08)
  osc.connect(gain)
  gain.connect(dest)
  osc.start(now)
  osc.stop(now + 0.1)
}
