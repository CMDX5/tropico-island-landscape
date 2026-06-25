'use client'

import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'

// Tuned to feel like Tropico 6's strategy camera: smooth, damped, with
// keyboard pan/rotate/tilt/zoom + edge-of-screen panning on top of the
// mouse controls.
const PAN_SPEED = 110 // world units / sec (keyboard)
const EDGE_SPEED = 140 // world units / sec (edge scroll)
const ROT_SPEED = 1.6 // rad / sec (azimuth)
const TILT_SPEED = 0.6 // rad / sec (polar)
const ZOOM_SPEED = 1.0 // fraction / sec
const DAMP = 8 // damping factor (higher = snappier)
const EDGE_MARGIN = 28 // px from the window border that triggers edge-scroll

type Props = {
  controlsRef: React.RefObject<OrbitControlsImpl | null>
}

/**
 * Tropico 6-style camera controller (keyboard) that drives the same
 * OrbitControls target used by the mouse. Adds:
 *  - WASD / arrows : pan the focal point in the camera-facing XZ plane
 *  - Q / E         : rotate the view (azimuth) smoothly
 *  - R / F         : tilt the view (polar angle) up / down
 *  - + / -         : zoom in / out
 * All motions are damped so the camera glides rather than snaps.
 *
 * Camera mutations go through a mutable ref (not the value returned by
 * useThree) to keep the react-hooks/immutability lint rule happy.
 */
export function TropicoCamera({ controlsRef }: Props) {
  const { camera, gl } = useThree()
  // mutable handle to the camera so we can mutate it each frame
  const camRef = useRef<THREE.Camera | null>(null)
  const keys = useRef<Record<string, boolean>>({})
  const mouse = useRef({ x: 0, y: 0, inside: false })
  const vPan = useRef(new THREE.Vector2()) // x = strafe, y = forward/back
  const vRot = useRef(0)
  const vTilt = useRef(0)
  const vZoom = useRef(0)

  // keep the mutable handle in sync with the current camera
  useEffect(() => {
    camRef.current = camera
  }, [camera])

  // track mouse position for edge-scroll panning (Tropico 6 signature)
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
    el.addEventListener('mousemove', onMove)
    el.addEventListener('mouseleave', onLeave)
    return () => {
      el.removeEventListener('mousemove', onMove)
      el.removeEventListener('mouseleave', onLeave)
    }
  }, [gl])

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.current[e.code] = true
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault()
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
  }, [])

  useFrame((_, dtRaw) => {
    const c = controlsRef.current
    const cam = camRef.current
    if (!c || !cam) return
    const dt = Math.min(dtRaw, 0.05)
    const k = keys.current

    // desired input direction (-1 / 0 / 1)
    let panX = 0
    let panZ = 0
    let rot = 0
    let tilt = 0
    let zoom = 0
    if (k['KeyW'] || k['ArrowUp']) panZ -= 1
    if (k['KeyS'] || k['ArrowDown']) panZ += 1
    if (k['KeyA'] || k['ArrowLeft']) panX -= 1
    if (k['KeyD'] || k['ArrowRight']) panX += 1
    if (k['KeyQ']) rot -= 1
    if (k['KeyE']) rot += 1
    if (k['KeyR'] || k['PageUp']) tilt -= 1
    if (k['KeyF'] || k['PageDown']) tilt += 1
    if (k['Equal'] || k['NumpadAdd'] || k['BracketRight']) zoom += 1
    if (k['Minus'] || k['NumpadSubtract'] || k['BracketLeft']) zoom -= 1

    // edge-of-screen panning (Tropico 6 style) — only when no modifier key
    // is held and the pointer is over the canvas
    if (mouse.current.inside && !k['ShiftLeft']) {
      const w = gl.domElement.clientWidth
      const h = gl.domElement.clientHeight
      const mx = mouse.current.x
      const my = mouse.current.y
      if (mx < EDGE_MARGIN) panX -= 1
      else if (mx > w - EDGE_MARGIN) panX += 1
      if (my < EDGE_MARGIN) panZ -= 1
      else if (my > h - EDGE_MARGIN) panZ += 1
    }

    // damped velocities toward the desired input
    // keyboard pan uses PAN_SPEED, edge-scroll uses EDGE_SPEED
    const panMag = Math.hypot(panX, panZ)
    const panSpd = panMag > 1.5 ? EDGE_SPEED : PAN_SPEED // edge-scroll is faster
    const f = Math.min(dt * DAMP, 1)
    vPan.current.x = THREE.MathUtils.lerp(vPan.current.x, panX * panSpd, f)
    vPan.current.y = THREE.MathUtils.lerp(vPan.current.y, panZ * panSpd, f)
    vRot.current = THREE.MathUtils.lerp(vRot.current, rot * ROT_SPEED, f)
    vTilt.current = THREE.MathUtils.lerp(vTilt.current, tilt * TILT_SPEED, f)
    vZoom.current = THREE.MathUtils.lerp(vZoom.current, zoom * ZOOM_SPEED, f)

    // azimuth (rotate around target)
    if (Math.abs(vRot.current) > 1e-4) {
      c.setAzimuthalAngle(c.getAzimuthalAngle() + vRot.current * dt)
    }
    // polar (tilt)
    if (Math.abs(vTilt.current) > 1e-4) {
      const p = THREE.MathUtils.clamp(
        c.getPolarAngle() + vTilt.current * dt,
        c.minPolarAngle,
        c.maxPolarAngle,
      )
      c.setPolarAngle(p)
    }

    // pan: move target + camera together in the camera-facing XZ plane
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

    // zoom: orthographic -> adjust zoom property; perspective -> adjust distance
    if (Math.abs(vZoom.current) > 1e-4) {
      const factor = 1 - vZoom.current * dt
      const o = cam as THREE.OrthographicCamera
      if (o.isOrthographicCamera) {
        o.zoom = THREE.MathUtils.clamp(o.zoom * factor, c.minZoom ?? 0.1, c.maxZoom ?? 20)
        o.updateProjectionMatrix()
      } else {
        const p = cam as THREE.PerspectiveCamera
        const dir = p.position.clone().sub(c.target)
        // clamp to OrbitControls minDistance/maxDistance so we can zoom
        // very close to the terrain (Tropico 6 lets you get near ground)
        const minD = c.minDistance ?? 1
        const maxD = c.maxDistance ?? 1000
        const nd = THREE.MathUtils.clamp(dir.length() * factor, minD, maxD)
        p.position.copy(c.target).addScaledVector(dir.normalize(), nd)
      }
    }

    c.update()
  })

  return null
}
