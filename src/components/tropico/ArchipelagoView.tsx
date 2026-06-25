'use client'

import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'

const SATELLITE_HEIGHT = 1400 // very high, shows the whole island
const SATELLITE_POLAR = (3 * Math.PI) / 180 // almost straight down
const TRANSITION_SPEED = 2.5 // lerp speed (higher = faster)

type Props = {
  controlsRef: React.RefObject<OrbitControlsImpl | null>
  forcedArchipelago: boolean // from HUD button
}

/**
 * Archipelago view controller — Tropico 6 style:
 *  - SPACE bar toggles between normal isometric view and satellite view
 *  - HUD button also toggles (synced via forcedArchipelago prop)
 *  - Saves the previous camera position/angle and restores it on return
 *  - Smooth animated transition (lerp) between the two views
 *  - Satellite view: camera goes very high + looks straight down
 */
export function ArchipelagoView({ controlsRef, forcedArchipelago }: Props) {
  const { camera } = useThree()
  const camRef = useRef<THREE.Camera | null>(null)
  const inArchipelago = useRef(false)
  const transitionT = useRef(0) // 0 = normal, 1 = archipelago

  // Saved camera state (to restore on return)
  const savedPos = useRef(new THREE.Vector3())
  const savedTarget = useRef(new THREE.Vector3())
  const savedPolar = useRef(0)
  const savedAzimuth = useRef(0)
  const hasSaved = useRef(false)

  useEffect(() => {
    camRef.current = camera
  }, [camera])

  // Toggle archipelago view (called by SPACE bar + HUD button)
  const toggleArchipelago = () => {
    const c = controlsRef.current
    const cam = camRef.current
    if (!c || !cam) return

    if (!inArchipelago.current) {
      // ENTER archipelago: save current camera state
      savedPos.current.copy(cam.position)
      savedTarget.current.copy(c.target)
      savedPolar.current = c.getPolarAngle()
      savedAzimuth.current = c.getAzimuthalAngle()
      hasSaved.current = true
      inArchipelago.current = true
    } else {
      // EXIT archipelago: restore saved state
      inArchipelago.current = false
    }
  }

  // SPACE bar = toggle archipelago (Tropico 6 official)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault()
        toggleArchipelago()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // HUD button sync
  useEffect(() => {
    if (forcedArchipelago !== inArchipelago.current) {
      toggleArchipelago()
    }
  }, [forcedArchipelago])

  useFrame((_, dtRaw) => {
    const c = controlsRef.current
    const cam = camRef.current
    if (!c || !cam) return
    const dt = Math.min(dtRaw, 0.05)

    const target = inArchipelago.current ? 1 : 0
    transitionT.current = THREE.MathUtils.lerp(transitionT.current, target, dt * TRANSITION_SPEED)
    const t = transitionT.current

    if (t > 0.01 && t < 0.99) {
      // In transition — interpolate between saved position and satellite
      if (hasSaved.current) {
        // satellite position: directly above target, very high
        const satPos = new THREE.Vector3(
          savedTarget.current.x,
          savedTarget.current.y + SATELLITE_HEIGHT,
          savedTarget.current.z + 1, // tiny offset so polar isn't exactly 0
        )
        // lerp camera position
        cam.position.lerpVectors(savedPos.current, satPos, t)
        // lerp target (stays roughly the same)
        c.target.lerpVectors(savedTarget.current, savedTarget.current, t)
        // lerp polar angle toward straight-down
        const curPolar = c.getPolarAngle()
        const newPolar = THREE.MathUtils.lerp(savedPolar.current, SATELLITE_POLAR, t)
        if (Math.abs(newPolar - curPolar) > 0.001) {
          c.setPolarAngle(newPolar)
        }
        c.update()
      }
    } else if (t >= 0.99) {
      // Fully in archipelago — keep camera at satellite position
      const satPos = new THREE.Vector3(
        c.target.x,
        c.target.y + SATELLITE_HEIGHT,
        c.target.z + 1,
      )
      cam.position.copy(satPos)
      c.setPolarAngle(SATELLITE_POLAR)
      c.update()
    } else if (t <= 0.01 && hasSaved.current) {
      // Fully returned — restore exact saved position
      cam.position.copy(savedPos.current)
      c.target.copy(savedTarget.current)
      c.setPolarAngle(savedPolar.current)
      c.setAzimuthalAngle(savedAzimuth.current)
      c.update()
      hasSaved.current = false // prevent re-applying every frame
    }
  })

  return null
}
