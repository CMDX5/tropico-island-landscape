'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'
import { Palmtree, Mountain, Waves, Trees, Sparkles, Compass, Info } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

const IslandScene = dynamic(() => import('@/components/tropico/IslandScene').then((m) => m.IslandScene), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-[#bfe9f2] to-[#7fc6db]">
      <div className="flex flex-col items-center gap-3 text-emerald-900">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
        <p className="text-sm font-medium tracking-wide">Génération de l'île…</p>
      </div>
    </div>
  ),
})

const LEGEND = [
  { label: 'Sommet enneigé', color: '#f2f2f2' },
  { label: 'Roche', color: '#8a7a63' },
  { label: 'Forêt', color: '#2d6a22' },
  { label: 'Prairie', color: '#62ab44' },
  { label: 'Plage', color: '#ecd49a' },
  { label: 'Océan', color: '#1ea8cf' },
]

export default function Home() {
  const [showLegend, setShowLegend] = useState(true)

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden bg-[#bfe9f2]">
      {/* 3D viewport */}
      <div className="relative flex-1">
        <IslandScene />

        {/* Top HUD */}
        <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 p-4 sm:p-6">
          <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-white/40 bg-white/15 px-4 py-2.5 shadow-lg backdrop-blur-md">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow">
              <Palmtree className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <h1 className="text-base font-extrabold tracking-wider text-emerald-950 sm:text-lg">
                TROPICO
              </h1>
              <p className="text-[11px] font-medium text-emerald-800/80">
                Isla Paraíso · Environnement paysager
              </p>
            </div>
          </div>

          <div className="pointer-events-auto flex items-center gap-2">
            <Badge
              variant="secondary"
              className="hidden border-white/40 bg-white/15 text-emerald-900 backdrop-blur-md sm:flex"
            >
              <Sparkles className="mr-1 h-3.5 w-3.5" />
              Paysage 3D procédural
            </Badge>
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={() => setShowLegend((v) => !v)}
                    className="border-white/40 bg-white/15 text-emerald-900 backdrop-blur-md hover:bg-white/30"
                    aria-label="Afficher la légende"
                  >
                    <Info className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Légende du terrain</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </header>

        {/* Legend card */}
        {showLegend && (
          <aside className="pointer-events-auto absolute right-4 top-20 z-10 w-52 rounded-2xl border border-white/40 bg-white/15 p-3 shadow-lg backdrop-blur-md sm:right-6">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-950">
              <Compass className="h-3.5 w-3.5" /> Biomes
            </p>
            <ul className="space-y-1.5">
              {LEGEND.map((l) => (
                <li key={l.label} className="flex items-center gap-2 text-xs text-emerald-900">
                  <span
                    className="h-3 w-3 flex-shrink-0 rounded-sm ring-1 ring-black/10"
                    style={{ backgroundColor: l.color }}
                  />
                  {l.label}
                </li>
              ))}
            </ul>
          </aside>
        )}

        {/* Feature chips (bottom-left) */}
        <div className="pointer-events-none absolute bottom-4 left-4 z-10 flex flex-wrap gap-2 sm:bottom-6 sm:left-6">
          <FeatureChip icon={<Mountain className="h-3.5 w-3.5" />} label="Montagnes" />
          <FeatureChip icon={<Trees className="h-3.5 w-3.5" />} label="Palmiers" />
          <FeatureChip icon={<Waves className="h-3.5 w-3.5" />} label="Océan animé" />
        </div>
      </div>

      {/* Sticky footer */}
      <footer className="z-20 flex flex-col items-center justify-between gap-2 border-t border-emerald-900/10 bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 px-4 py-2.5 text-white/90 sm:flex-row sm:px-6">
        <p className="text-center text-[11px] font-medium sm:text-left">
          Environnement Tropico 6 · généré avec Three.js & React Three Fiber
        </p>
        <p className="flex items-center gap-2 text-[11px] text-white/70">
          <span className="hidden sm:inline">Glissez pour pivoter · molette pour zoomer · clic droit pour déplacer</span>
          <span className="sm:hidden">Touchez pour explorer</span>
        </p>
      </footer>
    </div>
  )
}

function FeatureChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/15 px-2.5 py-1 text-[11px] font-medium text-emerald-900 shadow backdrop-blur-md">
      {icon}
      {label}
    </span>
  )
}
