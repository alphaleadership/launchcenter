import React from 'react'
import { useTelemetry } from '../context/TelemetryContext'
import { cn } from '../utils/cn'

export const ObsControlPanel: React.FC = () => {
  const { overlayConfig, updateOverlayConfig } = useTelemetry()

  const Toggle = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (c: boolean) => void }) => (
    <label className="flex items-center justify-between p-4 border-2 border-houston-muted rounded hover:border-houston-green cursor-pointer transition-all bg-black/50">
      <span className="font-bold tracking-widest uppercase text-sm">{label}</span>
      <div className={cn('w-12 h-6 rounded-full p-1 transition-colors', checked ? 'bg-houston-green' : 'bg-gray-800')}>
        <div className={cn('w-4 h-4 rounded-full bg-black transition-transform', checked ? 'translate-x-6' : 'translate-x-0')} />
      </div>
      <input type="checkbox" className="hidden" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  )

  return (
    <div className="min-h-screen bg-houston-dark text-houston-green p-8 font-mono crt">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-black uppercase mb-8 border-b-2 border-houston-green pb-4">
          ⚙️ OBS Overlay Control
        </h1>
        
        <p className="text-houston-muted mb-8 text-sm uppercase">
          Activer ou désactiver les éléments affichés en direct sur l'overlay OBS (source navigateur).
        </p>

        <div className="flex flex-col gap-4">
          <Toggle
            label="Badge Mission & Lanceur"
            checked={overlayConfig.showMission}
            onChange={(c) => updateOverlayConfig({ showMission: c })}
          />
          <Toggle
            label="Chronomètre / MET"
            checked={overlayConfig.showCountdown}
            onChange={(c) => updateOverlayConfig({ showCountdown: c })}
          />
          <Toggle
            label="Indicateur de Statut (In Flight / Hold)"
            checked={overlayConfig.showStatus}
            onChange={(c) => updateOverlayConfig({ showStatus: c })}
          />
          <Toggle
            label="Données de vol (Altitude, Vitesse) post-décollage"
            checked={overlayConfig.showFlightData}
            onChange={(c) => updateOverlayConfig({ showFlightData: c })}
          />
        </div>

        <div className="mt-12 text-xs text-houston-muted uppercase text-center">
          Terminal de configuration OBS // NASA-JSC
        </div>
      </div>
    </div>
  )
}
