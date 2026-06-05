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

  const TransformControls = ({ itemKey }: { itemKey: keyof typeof overlayConfig }) => {
    // @ts-ignore
    const transform: { x: number, y: number, scale: number } = overlayConfig[itemKey] || { x: 0, y: 0, scale: 100 }
    
    const update = (changes: any) => {
      updateOverlayConfig({ [itemKey]: { ...transform, ...changes } })
    }
    
    return (
      <div className="flex flex-col gap-2 p-3 bg-black/30 border-x-2 border-b-2 border-houston-muted rounded-b -mt-1">
        <div className="grid grid-cols-3 gap-4">
          <label className="flex flex-col text-[10px] uppercase text-houston-muted">
            <span className="mb-1">Pos X ({transform.x}%)</span>
            <input type="range" min="-100" max="100" value={transform.x} onChange={e => update({x: parseInt(e.target.value)})} className="accent-houston-green" />
          </label>
          <label className="flex flex-col text-[10px] uppercase text-houston-muted">
            <span className="mb-1">Pos Y ({transform.y}%)</span>
            <input type="range" min="-100" max="100" value={transform.y} onChange={e => update({y: parseInt(e.target.value)})} className="accent-houston-green" />
          </label>
          <label className="flex flex-col text-[10px] uppercase text-houston-muted">
            <span className="mb-1">Scale ({transform.scale}%)</span>
            <input type="range" min="10" max="300" value={transform.scale} onChange={e => update({scale: parseInt(e.target.value)})} className="accent-houston-green" />
          </label>
        </div>
      </div>
    )
  }

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
          <div className="flex flex-col">
            <Toggle label="Badge Mission & Lanceur" checked={overlayConfig.showMission} onChange={(c) => updateOverlayConfig({ showMission: c })} />
            {overlayConfig.showMission && <TransformControls itemKey="missionTransform" />}
          </div>
          <div className="flex flex-col">
            <Toggle label="Chronomètre / MET" checked={overlayConfig.showCountdown} onChange={(c) => updateOverlayConfig({ showCountdown: c })} />
            {overlayConfig.showCountdown && <TransformControls itemKey="countdownTransform" />}
          </div>
          <div className="flex flex-col">
            <Toggle label="Indicateur de Statut (In Flight / Hold)" checked={overlayConfig.showStatus} onChange={(c) => updateOverlayConfig({ showStatus: c })} />
            {overlayConfig.showStatus && <TransformControls itemKey="statusTransform" />}
          </div>
          <div className="flex flex-col">
            <Toggle label="Données de vol (Altitude, Vitesse)" checked={overlayConfig.showFlightData} onChange={(c) => updateOverlayConfig({ showFlightData: c })} />
            {overlayConfig.showFlightData && <TransformControls itemKey="flightDataTransform" />}
          </div>
          <div className="flex flex-col">
            <Toggle label="Checklist & Flight Timeline" checked={overlayConfig.showChecklist} onChange={(c) => updateOverlayConfig({ showChecklist: c })} />
            {overlayConfig.showChecklist && <TransformControls itemKey="checklistTransform" />}
          </div>
        </div>

        <div className="mt-8 p-6 border-2 border-houston-muted rounded bg-black/50">
          <label className="flex flex-col gap-4 cursor-pointer">
            <div className="flex justify-between items-center">
              <span className="font-bold tracking-widest uppercase text-sm">Échelle de l'Overlay (Taille)</span>
              <span className="font-mono text-houston-green">{overlayConfig.overlayScale || 100}%</span>
            </div>
            <input
              type="range"
              min="50"
              max="200"
              step="5"
              value={overlayConfig.overlayScale || 100}
              onChange={(e) => updateOverlayConfig({ overlayScale: parseInt(e.target.value) })}
              className="w-full accent-houston-green"
            />
          </label>
        </div>

        <div className="mt-12 text-xs text-houston-muted uppercase text-center">
          Terminal de configuration OBS // NASA-JSC
        </div>
      </div>
    </div>
  )
}
