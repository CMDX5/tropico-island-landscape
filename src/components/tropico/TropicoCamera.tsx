'use client'

import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'

// Tropico 6 official camera feel: smooth, damped.
const PAN_SPEED = 200 // world units / sec (keyboard) — scaled for the big island
const EDGE_SPEED = 260 // world units / sec (edge scroll)
const ROT_SPEED = 1.6 // rad / sec (azimuth)
const TILT_SPEED = 0.7 // rad / sec (polar)
const ZOOM_SPEED = 1.2 // fraction / sec
const DAMP = 8 // damping factor (higher = snappier)
const EDGE_MARGIN = 28 // px from the window border that triggers edge-scroll

// Default camera state (PgUp resets to this)
const DEFAULT_POLAR = Math.PI / 4 // 45° from vertical (isometric)
const DEFAULT_AZIMUTH = Math.PI / 4
const DEFAULT_DISTANCE = 320

type Props = {
  controlsRef: React.RefObject<OrbitControlsImpl | null>
  onMenuKey?: (key: string) => void
}

/**
 * Tropico 6-style camera controller. Official controls:
 *  - WASD              : pan the focal point
 *  - Mouse wheel       : zoom in/out (handled by OrbitControls)
 *  - Middle mouse btn  : free rotation (handled by OrbitControls)
 *  - Q / E             : rotate left / right (azimuth)
 *  - ALT + mouse move  : tilt (polar angle) — handled here via key state
 *  - PgUp              : reset camera to default 45° isometric
 *  - Edge of screen    : pan (Tropico 6 signature)
 *
 * Menu shortcuts (1-9, 0, P, Space, F5, F8) are forwarded to onMenuKey.
 */
export function TropicoCamera({ controlsRef, onMenuKey }: Props) {
  const { camera, gl } = useThree()
  const camRef = useRef<THREE.Camera | null>(null)
  const keys = useRef<Record<string, boolean>>({})
  const mouse = useRef({ x: 0, y: 0, inside: false })
  const vPan = useRef(new THREE.Vector2())
  const vRot = useRef(0)
  const vTilt = useRef(0)
  const vZoom = useRef(0)
  const wheelZoom = useRef(0) // accumulated wheel zoom velocity (inertia)

  useEffect(() => {
    camRef.current = camera
  }, [camera])

  // Clamp camera height after mouse interactions (OrbitControls 'change')
  // so the camera NEVER goes below sea level + 10 (no clipping through terrain)
  useEffect(() => {
    const c = controlsRef.current
    if (!c) return
    const onChange = () => {
      const cam = camRef.current
      if (!cam) return
      const MIN_CAM_HEIGHT = 10 // sea level (0) + 10
      if (cam.position.y < MIN_CAM_HEIGHT) {
        cam.position.y = MIN_CAM_HEIGHT
      }
    }
    c.addEventListener('change', onChange)
    return () => c.removeEventListener('change', onChange)
  }, [controlsRef])

  // track mouse position for edge-scroll + ALT-tilt
  // + intercept mouse wheel for smooth inertia zoom (Tropico 6 style)
  useEffect(() => {
    const el = gl.domElement
    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      mouse.current.x = e.clientX - rect.left
      mouse.current.y = e.clientY - rect.top
      mouse.current.inside = true
    }
    const onLeave = () => {
      mouse.current.inside = false
    }
    // Custom wheel zoom: smooth inertia + speed proportional to distance
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const delta = -e.deltaY * 0.0015
      wheelZoom.current += delta
    }
    el.addEventListener('mousemove', onMove)
    el.addEventListener('mouseleave', onLeave)
    el.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      el.removeEventListener('mousemove', onMove)
      el.removeEventListener('mouseleave', onLeave)
      el.removeEventListener('wheel', onWheel)
      window.removeEventListener('wheel', onWheel)
    }
  }, [gl])

  // Reset camera to default Tropico 6 isometric view (PgUp)
  const resetCamera = () => {
    const c = controlsRef.current
    const cam = camRef.current
    if (!c || !cam) return
    c.setAzimuthalAngle(DEFAULT_AZIMUTH)
    c.setPolarAngle(DEFAULT_POLAR)
    const p = cam as THREE.PerspectiveCamera
    const dir = p.position.clone().sub(c.target).normalize()
    p.position.copy(c.target).addScaledVector(dir, DEFAULT_DISTANCE)
    c.update()
  }

  useEffect(() => {
    const menuKeys = new Set([
      'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5',
      'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0',
      'KeyP', 'Space', 'F5', 'F8',
    ])
    const down = (e: KeyboardEvent) => {
      keys.current[e.code] = true
      // Menu shortcuts: forward to handler, don't interfere with camera
      if (menuKeys.has(e.code)) {
        e.preventDefault()
        onMenuKey?.(e.code)
        return
      }
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault()
      }
      // PgUp = reset camera
      if (e.code === 'PageUp') {
        e.preventDefault()
        resetCamera()
      }
    }
    const up = (e: KeyboardEvent) => {
      keys.current[e.code] = false
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [onMenuKey])

  useFrame((_, dtRaw) => {
    const c = controlsRef.current
    const cam = camRef.current
    if (!c || !cam) return
    const dt = Math.min(dtRaw, 0.05)
    const k = keys.current

    let panX = 0
    let panZ = 0
    let rot = 0
    let tilt = 0
    let zoom = 0
    // WASD = pan (Tropico 6 official)
    if (k['KeyW'] || k['ArrowUp']) panZ -= 1
    if (k['KeyS'] || k['ArrowDown']) panZ += 1
    if (k['KeyA'] || k['ArrowLeft']) panX -= 1
    if (k['KeyD'] || k['ArrowRight']) panX += 1
    // Q/E = rotate left/right (Tropico 6 official)
    if (k['KeyQ']) rot -= 1
    if (k['KeyE']) rot += 1
    // R/F = tilt (extra, since ALT+mouse is the official tilt)
    if (k['KeyR']) tilt -= 1
    if (k['KeyF']) tilt += 1
    // +/- = zoom (extra)
    if (k['Equal'] || k['NumpadAdd']) zoom += 1
    if (k['Minus'] || k['NumpadSubtract']) zoom -= 1

    // ALT + mouse move = tilt (Tropico 6 official)
    if (k['AltLeft'] || k['AltRight']) {
      if (mouse.current.inside) {
        const h = gl.domElement.clientHeight
        // mouse Y position maps to tilt: top = higher angle, bottom = lower
        const myNorm = (mouse.current.y / h) * 2 - 1 // -1..1
        tilt -= myNorm * 1.5
      }
    }

    // edge-of-screen panning (only when no modifier held)
    if (mouse.current.inside && !k['ShiftLeft'] && !k['AltLeft'] && !k['AltRight']) {
      const w = gl.domElement.clientWidth
      const h = gl.domElement.clientHeight
      const mx = mouse.current.x
      const my = mouse.current.y
      if (mx < EDGE_MARGIN) panX -= 1
      else if (mx > w - EDGE_MARGIN) panX += 1
      if (my < EDGE_MARGIN) panZ -= 1
      else if (my > h - EDGE_MARGIN) panZ += 1
    }

    const panMag = Math.hypot(panX, panZ)
    const panSpd = panMag > 1.5 ? EDGE_SPEED : PAN_SPEED
    const f = Math.min(dt * DAMP, 1)
    vPan.current.x = THREE.MathUtils.lerp(vPan.current.x, panX * panSpd, f)
    vPan.current.y = THREE.MathUtils.lerp(vPan.current.y, panZ * panSpd, f)
    vRot.current = THREE.MathUtils.lerp(vRot.current, rot * ROT_SPEED, f)
    vTilt.current = THREE.MathUtils.lerp(vTilt.current, tilt * TILT_SPEED, f)
    vZoom.current = THREE.MathUtils.lerp(vZoom.current, zoom * ZOOM_SPEED, f)

    if (Math.abs(vRot.current) > 1e-4) {
      c.setAzimuthalAngle(c.getAzimuthalAngle() + vRot.current * dt)
    }
    if (Math.abs(vTilt.current) > 1e-4) {
      const p = THREE.MathUtils.clamp(
        c.getPolarAngle() + vTilt.current * dt,
        c.minPolarAngle,
        c.maxPolarAngle,
      )
      c.setPolarAngle(p)
    }

    if (vPan.current.lengthSq() > 1e-4) {
      const fwd = new THREE.Vector3()
      cam.getWorldDirection(fwd)
      fwd.y = 0
      if (fwd.lengthSq() < 1e-6) fwd.set(0, 0, -1)
      fwd.normalize()
      const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize()
      const move = new THREE.Vector3()
      move.addScaledVector(right, vPan.current.x * dt)
      move.addScaledVector(fwd, -vPan.current.y * dt)
      c.target.add(move)
      cam.position.add(move)
    }

    // --- Zoom (keyboard +/- + mouse wheel with inertia) ---
    // Merge keyboard zoom + accumulated wheel zoom
    const totalZoom = vZoom.current + wheelZoom.current
    // Decay wheel zoom inertia (momentum continues after scrolling stops)
    wheelZoom.current *= Math.exp(-dt * 4) // exponential decay
    if (Math.abs(wheelZoom.current) < 0.001) wheelZoom.current = 0

    if (Math.abs(totalZoom) > 1e-4) {
      const p = cam as THREE.PerspectiveCamera
      const dir = p.position.clone().sub(c.target)
      const curDist = dir.length()
      // Speed proportional to current distance (faster when far, slower when close)
      const speedFactor = THREE.MathUtils.clamp(curDist / 300, 0.3, 3.0)
      const factor = 1 - totalZoom * dt * speedFactor
      const minD = c.minDistance ?? 1
      const maxD = c.maxDistance ?? 1000
      const nd = THREE.MathUtils.clamp(curDist * factor, minD, maxD)
      p.position.copy(c.target).addScaledVector(dir.normalize(), nd)
    }

    // CLAMP CAMERA HEIGHT: never let the camera go below sea level + 10.
    // This prevents clipping through the terrain/ocean when zooming in.
    const SEA_LEVEL = 0
    const MIN_CAM_HEIGHT = SEA_LEVEL + 10
    if (cam.position.y < MIN_CAM_HEIGHT) {
      cam.position.y = MIN_CAM_HEIGHT
    }

    c.update()
  })

  return null
}
