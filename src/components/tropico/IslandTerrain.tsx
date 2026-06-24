'use client'

import { useMemo } from 'react'
import * as THREE from 'three'
import { ISLAND_SIZE, islandHeight, islandColor } from './terrain'
import { makeSandTexture, makeGrassTexture, makeRockTexture, makeSnowTexture } from './terrainTextures'

/**
 * Procedural island terrain built as a custom XZ grid.
 *
 * Surface detail is GPU splat-mapping via a hand-written ShaderMaterial
 * (not onBeforeCompile): four procedural textures (sand / grass / rock /
 * snow) are blended by world height + slope, with 3-step cel-shading
 * (diffuse quantised into 3 bands) and a per-fragment bump-noise normal
 * perturbation for extra surface grain.
 */
export function IslandTerrain() {
  const geometry = useMemo(() => {
    const seg = 220
    const half = ISLAND_SIZE / 2
    const step = ISLAND_SIZE / seg
    const positions: number[] = []
    const colors: number[] = []
    const indices: number[] = []

    const col = new THREE.Color()
    for (let j = 0; j <= seg; j++) {
      for (let i = 0; i <= seg; i++) {
        const x = -half + i * step
        const z = -half + j * step
        const h = islandHeight(x, z)
        positions.push(x, h, z)
        islandColor(h, col)
        const tint = 0.92 + (((i * 31 + j * 17) % 16) / 16) * 0.16
        colors.push(col.r * tint, col.g * tint, col.b * tint)
      }
    }
    for (let j = 0; j < seg; j++) {
      for (let i = 0; i < seg; i++) {
        const a = j * (seg + 1) + i
        const b = a + 1
        const c = a + (seg + 1)
        const d = c + 1
        indices.push(a, c, b)
        indices.push(b, c, d)
      }
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    geo.setIndex(indices)
    geo.computeVertexNormals()
    return geo
  }, [])

  const material = useMemo(() => {
    const sand = makeSandTexture()
    const grass = makeGrassTexture()
    const rock = makeRockTexture()
    const snow = makeSnowTexture()

    const uniforms = {
      uSand: { value: sand },
      uGrass: { value: grass },
      uRock: { value: rock },
      uSnow: { value: snow },
      uTexScale: { value: 0.4 },
      uSunDir: { value: new THREE.Vector3(60, 70, -30).normalize() },
      uSunColor: { value: new THREE.Color('#fff3d6') },
      uSkyColor: { value: new THREE.Color('#fff4e0') },
      uGroundColor: { value: new THREE.Color('#4a5a3a') },
      uAmbient: { value: 0.55 },
    }

    const mat = new THREE.ShaderMaterial({
      uniforms,
      vertexColors: true,
      vertexShader: /* glsl */ `
        varying vec3 vWorldPos;
        varying vec3 vWorldNormal;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          vWorldNormal = normalize(mat3(modelMatrix) * normal);
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;
        varying vec3 vWorldPos;
        varying vec3 vWorldNormal;
        varying vec3 vColor;

        uniform sampler2D uSand;
        uniform sampler2D uGrass;
        uniform sampler2D uRock;
        uniform sampler2D uSnow;
        uniform float uTexScale;
        uniform vec3 uSunDir;
        uniform vec3 uSunColor;
        uniform vec3 uSkyColor;
        uniform vec3 uGroundColor;
        uniform float uAmbient;

        float hash2(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123); }
        float vnoise(vec2 p){
          vec2 i = floor(p); vec2 f = fract(p);
          float a = hash2(i), b = hash2(i+vec2(1,0)), c = hash2(i+vec2(0,1)), d = hash2(i+vec2(1,1));
          vec2 u = f*f*(3.0-2.0*f);
          return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
        }

        void main(){
          vec2 uv = vWorldPos.xz * uTexScale;
          vec3 sandC = texture2D(uSand, uv).rgb;
          vec3 grassC = texture2D(uGrass, uv).rgb;
          vec3 rockC = texture2D(uRock, uv).rgb;
          vec3 snowC = texture2D(uSnow, uv).rgb;

          float h = vWorldPos.y;
          float slope = vWorldNormal.y; // 1 flat, 0 vertical

          // splat weights by altitude
          float sandW = smoothstep(1.8, 0.2, h);
          float rockW = smoothstep(7.5, 11.0, h);
          float steep = smoothstep(0.78, 0.5, slope);
          rockW = max(rockW, steep);
          sandW *= (1.0 - steep);
          float grassW = clamp(1.0 - sandW - rockW, 0.0, 1.0) * (1.0 - steep);
          float snowW = smoothstep(10.5, 14.0, h) * (1.0 - steep * 0.6);

          // normalise weights
          float wsum = sandW + grassW + rockW + snowW + 1e-4;
          vec3 splat = (sandC*sandW + grassC*grassW + rockC*rockW + snowC*snowW) / wsum;

          // blend with per-vertex biome color (vertex colors carry the snow/rock tint)
          vec3 baseCol = mix(vColor, splat, 0.78);

          // per-fragment bump: perturb normal with a small noise gradient
          float e = 0.6;
          float n0 = vnoise(vWorldPos.xz * 1.2);
          float nx = vnoise((vWorldPos.xz + vec2(e,0)) * 1.2);
          float nz = vnoise((vWorldPos.xz + vec2(0,e)) * 1.2);
          vec3 bump = normalize(vec3((n0-nx)*1.6, 1.0, (n0-nz)*1.6));
          vec3 N = normalize(vWorldNormal * 0.7 + bump * 0.3);

          // lighting (Lambert + hemisphere + ambient), cel-quantised into 3 bands
          vec3 L = normalize(uSunDir);
          float ndl = max(dot(N, L), 0.0);
          // 3-step cel shading
          float cel = ndl < 0.35 ? 0.55 : (ndl < 0.7 ? 0.85 : 1.0);
          float hemi = mix(uGroundColor, uSkyColor, N.y * 0.5 + 0.5);
          vec3 lit = baseCol * (uSunColor * cel * 0.8 + hemi * 0.5 + uAmbient);

          // fine grain to break flatness
          float grain = hash2(vWorldPos.xz * 9.0) * 0.05 - 0.025;
          lit += grain;

          gl_FragColor = vec4(lit, 1.0);
        }
      `,
    })
    return mat
  }, [])

  return (
    <mesh geometry={geometry} material={material} receiveShadow castShadow />
  )
}
