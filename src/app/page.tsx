'use client'

import dynamic from 'next/dynamic'
import { TropicoHUD } from '@/components/tropico/TropicoHUD'

const IslandScene = dynamic(() => import('@/components/tropico/IslandScene').then((m) => m.IslandScene), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-[#87ceeb] to-[#b8d8e8]">
      <div className="flex flex-col items-center gap-3 text-emerald-900">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
        <p className="text-sm font-medium tracking-wide">Génération de l'île…</p>
      </div>
    </div>
  ),
})

export default function Home() {
  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#87ceeb]">
      {/* 3D viewport */}
      <IslandScene />

      {/* Tropico 6-style HUD overlay (stats, time controls, action bar) */}
      <TropicoHUD />
    </div>
  )
}
