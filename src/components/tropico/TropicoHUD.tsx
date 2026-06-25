'use client'

import { useState, useEffect } from 'react'
import {
  Pause,
  Play,
  FastForward,
  ChevronsRight,
  Map as MapIcon,
  User,
  Hammer,
  BookOpen,
  Layers,
  ScrollText,
  FlaskConical,
  Skull,
  Ship,
  FileText,
  Globe,
  Landmark,
  DollarSign,
  Users,
  Star,
  Gauge,
} from 'lucide-react'

/* -------------------------------------------------------------------------- */
/*  Top-left stats panel (money, population, approval, events log)            */
/* -------------------------------------------------------------------------- */

function StatPill({ icon, value, label, accent }: { icon: React.ReactNode; value: string; label: string; accent: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-black/40 px-2.5 py-1.5 backdrop-blur-sm">
      <span className={`flex h-6 w-6 items-center justify-center rounded ${accent}`}>{icon}</span>
      <div className="leading-tight">
        <div className="text-sm font-bold text-amber-50">{value}</div>
        <div className="text-[9px] uppercase tracking-wider text-amber-200/60">{label}</div>
      </div>
    </div>
  )
}

function TopLeftStats() {
  return (
    <div className="pointer-events-auto absolute left-3 top-3 z-20 flex flex-col gap-2 sm:left-5 sm:top-5">
      {/* Island title */}
      <div className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-900/90 to-emerald-800/90 px-3 py-1.5 shadow-lg backdrop-blur-sm">
        <span className="text-base">🌴</span>
        <div className="leading-tight">
          <div className="text-sm font-extrabold tracking-wider text-amber-50">ISLA PARAÍSO</div>
          <div className="text-[9px] uppercase tracking-widest text-amber-200/70">Ere Coloniale · 1850</div>
        </div>
      </div>
      {/* Stats row */}
      <div className="flex flex-wrap gap-1.5">
        <StatPill
          icon={<DollarSign className="h-3.5 w-3.5 text-amber-50" />}
          value="$25,400"
          label="Trésor"
          accent="bg-amber-600/80"
        />
        <StatPill
          icon={<Users className="h-3.5 w-3.5 text-amber-50" />}
          value="1,247"
          label="Population"
          accent="bg-emerald-700/80"
        />
        <StatPill
          icon={<Star className="h-3.5 w-3.5 text-amber-50" />}
          value="68%"
          label="Approbation"
          accent="bg-rose-700/80"
        />
      </div>
      {/* Events log */}
      <div className="hidden w-56 rounded-lg bg-black/50 p-2 text-[10px] text-amber-100/80 backdrop-blur-sm sm:block">
        <div className="mb-1 text-[9px] font-bold uppercase tracking-wider text-amber-200/60">Événements</div>
        <ul className="space-y-0.5">
          <li className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-400" />
            Bateau marchand arrivé au port
          </li>
          <li className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-400" />
            Récolte de tabac terminée
          </li>
          <li className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-rose-400" />
            Mécontentement des fermiers
          </li>
        </ul>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Bottom-center time controls (pause / play / x2 / x3)                      */
/* -------------------------------------------------------------------------- */

const SPEEDS = [
  { id: 'pause', icon: Pause, label: 'Pause (P)' },
  { id: '1x', icon: Play, label: 'Vitesse normale' },
  { id: '2x', icon: FastForward, label: 'Accélération x2' },
  { id: '3x', icon: ChevronsRight, label: 'Accélération x3' },
] as const

function TimeControls({ speed, setSpeed }: { speed: string; setSpeed: (s: string) => void }) {
  return (
    <div className="pointer-events-auto absolute bottom-16 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black/60 p-1 shadow-lg backdrop-blur-md sm:bottom-20">
      {SPEEDS.map((s) => {
        const Icon = s.icon
        const active = speed === s.id
        return (
          <button
            key={s.id}
            onClick={() => setSpeed(s.id)}
            title={s.label}
            className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
              active
                ? 'bg-amber-500 text-emerald-950 shadow'
                : 'text-amber-100/70 hover:bg-white/10 hover:text-amber-50'
            }`}
          >
            <Icon className="h-4 w-4" />
          </button>
        )
      })}
      <div className="mx-1 h-6 w-px bg-white/20" />
      <button
        title="Vue archipel (Espace)"
        className="flex h-9 w-9 items-center justify-center rounded-full text-amber-100/70 transition-colors hover:bg-white/10 hover:text-amber-50"
      >
        <MapIcon className="h-4 w-4" />
      </button>
      <button
        title="El Presidente"
        className="flex h-9 w-9 items-center justify-center rounded-full text-amber-100/70 transition-colors hover:bg-white/10 hover:text-amber-50"
      >
        <User className="h-4 w-4" />
      </button>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Bottom action bar (construction, almanac, overlays, ...)                  */
/* -------------------------------------------------------------------------- */

const ACTIONS = [
  { id: 'tasks', icon: ScrollText, label: 'Tâches', key: '1' },
  { id: 'build', icon: Hammer, label: 'Construction', key: '2' },
  { id: 'almanac', icon: BookOpen, label: 'Almanach', key: '3' },
  { id: 'overlays', icon: Layers, label: 'Calques', key: '4' },
  { id: 'edicts', icon: ScrollText, label: 'Décrets', key: '5' },
  { id: 'research', icon: FlaskConical, label: 'Recherche', key: '6' },
  { id: 'raids', icon: Skull, label: 'Raids', key: '7' },
  { id: 'trade', icon: Ship, label: 'Commerce', key: '8' },
  { id: 'constitution', icon: FileText, label: 'Constitution', key: '9' },
  { id: 'politics', icon: Globe, label: 'Politique', key: '0' },
  { id: 'broker', icon: Landmark, label: 'Banquier', key: '-' },
] as const

function ActionBar({ active, setActive }: { active: string | null; setActive: (s: string | null) => void }) {
  return (
    <div className="pointer-events-auto absolute bottom-0 left-0 right-0 z-20">
      <div className="mx-auto flex max-w-3xl items-center gap-0.5 overflow-x-auto rounded-t-xl bg-gradient-to-r from-emerald-950/95 via-emerald-900/95 to-emerald-950/95 px-2 py-1.5 shadow-2xl backdrop-blur-md sm:gap-1 sm:px-3">
        {ACTIONS.map((a) => {
          const Icon = a.icon
          const isActive = active === a.id
          return (
            <button
              key={a.id}
              onClick={() => setActive(isActive ? null : a.id)}
              title={`${a.label} (${a.key})`}
              className={`flex min-w-[52px] flex-col items-center gap-0.5 rounded-lg px-1.5 py-1 transition-colors sm:min-w-[64px] ${
                isActive
                  ? 'bg-amber-500/90 text-emerald-950'
                  : 'text-amber-100/70 hover:bg-white/10 hover:text-amber-50'
              }`}
            >
              <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="text-[8px] font-medium uppercase tracking-wide sm:text-[9px]">{a.label}</span>
              <span className="text-[7px] font-mono text-amber-300/50">{a.key}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Main HUD — holds shared state (active menu, speed) + keyboard shortcuts   */
/* -------------------------------------------------------------------------- */

// Map keyboard codes to action ids
const KEY_TO_ACTION: Record<string, string> = {
  Digit1: 'tasks',
  Digit2: 'build',
  Digit3: 'almanac',
  Digit4: 'overlays',
  Digit5: 'edicts',
  Digit6: 'research',
  Digit7: 'raids',
  Digit8: 'trade',
  Digit9: 'constitution',
  Digit0: 'politics',
  Minus: 'broker',
}

export function TropicoHUD() {
  const [active, setActive] = useState<string | null>(null)
  const [speed, setSpeed] = useState<string>('1x')
  const [perfMode, setPerfMode] = useState<boolean>(true) // default: performance ON

  // Tropico 6 keyboard shortcuts: menus (1-9,0,-), pause (P), space (archipel)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Menu shortcuts
      if (KEY_TO_ACTION[e.code]) {
        e.preventDefault()
        const id = KEY_TO_ACTION[e.code]
        setActive((cur) => (cur === id ? null : id))
        return
      }
      // P = pause toggle
      if (e.code === 'KeyP') {
        e.preventDefault()
        setSpeed((s) => (s === 'pause' ? '1x' : 'pause'))
        return
      }
      // Space = archipel view (toggle off active menu)
      if (e.code === 'Space') {
        e.preventDefault()
        setActive(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Broadcast perf mode to the 3D scene via a custom event + window flag
  useEffect(() => {
    ;(window as unknown as { __tropicoPerfMode?: boolean }).__tropicoPerfMode = perfMode
    window.dispatchEvent(new CustomEvent('tropico-perf-mode', { detail: perfMode }))
  }, [perfMode])

  return (
    <>
      <TopLeftStats />
      <TimeControls speed={speed} setSpeed={setSpeed} />
      <ActionBar active={active} setActive={setActive} />

      {/* Performance mode toggle (top-right) */}
      <button
        onClick={() => setPerfMode((v) => !v)}
        title={perfMode ? 'Mode Performance (ON) — cliquez pour la Qualité' : 'Mode Qualité (ON) — cliquez pour la Performance'}
        className={`pointer-events-auto absolute right-3 top-3 z-20 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold backdrop-blur-md transition-colors sm:right-5 sm:top-5 ${
          perfMode
            ? 'bg-emerald-700/90 text-amber-50'
            : 'bg-amber-500/90 text-emerald-950'
        }`}
      >
        <Gauge className="h-4 w-4" />
        {perfMode ? 'PERF' : 'QUALITÉ'}
      </button>
    </>
  )
}
