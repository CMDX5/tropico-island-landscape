'use client'

import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'

const ARCHIPELAGO_DISTANCE = 560 // triggers at max zoom-out
const SATELLITE_HEIGHT = 1200
const SATELLITE_POLAR = (8 * Math.PI) / 180 // near top-down

type Props = {
  controlsRef: React.RefObject<OrbitControlsImpl | null>
  forcedArchipelago: boolean // from HUD button
}

/**
 * Archipelago view controller: when the camera zooms out beyond
 * ARCHIPELAGO_DISTANCE (or the HUD button is toggled), smoothly
 * transitions to a top-down satellite view showing the entire island.
 * When zooming back in, returns to normal isometric view.
 *
 * Listens to OrbitControls 'change' events to detect the zoom threshold.
 */
export function ArchipelagoView({ controlsRef, forcedArchipelago }: Props) {
  const { camera } = useThree()
  const camRef = useRef<THREE.Camera | null>(null)
  const inArchipelago = useRef(false)
  const targetArchipelago = useRef(false)
  const transitionT = useRef(0) // 0 = normal, 1 = archipelago

  useEffect(() => {
    camRef.current = camera
  }, [camera])

  useEffect(() => {
    // forced toggle from HUD button
    targetArchipelago.current = forcedArchipelago
  }, [forcedArchipelago])

  useEffect(() => {
    const c = controlsRef.current
    if (!c) return
    const onChange = () => {
      const cam = camRef.current
      if (!cam) return
      const dist = cam.position.distanceTo(c.target)
      // auto-trigger archipelago at max zoom-out (unless forced off by HUD)
      if (!forcedArchipelago) {
        if (dist >= ARCHIPELAGO_DISTANCE - 10 && !inArchipelago.current) {
          targetArchipelago.current = true
        } else if (dist < ARCHIPELAGO_DISTANCE - 50 && inArchipelago.current) {
          targetArchipelago.current = false
        }
      }
    }
    c.addEventListener('change', onChange)
    return () => c.removeEventListener('change', onChange)
  }, [controlsRef, forcedArchipelago])

  useFrame((_, dtRaw) => {
    const c = controlsRef.current
    const cam = camRef.current
    if (!c || !cam) return
    const dt = Math.min(dtRaw, 0.05)

    // smooth transition
    const target = targetArchipelago.current ? 1 : 0
    transitionT.current = THREE.MathUtils.lerp(transitionT.current, target, dt * 3)
    const t = transitionT.current

    if (t > 0.02) {
      inArchipelago.current = true
      // raise the camera toward satellite position
      const curDist = cam.position.distanceTo(c.target)
      const targetDist = THREE.MathUtils.lerp(curDist, SATELLITE_HEIGHT, t * 0.1)
      const curPolar = c.getPolarAngle()
      const targetPolar = THREE.MathUtils.lerp(curPolar, SATELLITE_POLAR, t * 0.1)
      const dir = cam.position.clone().sub(c.target).normalize()
      cam.position.copy(c.target).addScaledVector(dir, targetDist)
      c.setPolarAngle(targetPolar)
      c.update()
    } else if (t < 0.02 && inArchipelago.current) {
      inArchipelago.current = false
    }
  })

  return null
}
