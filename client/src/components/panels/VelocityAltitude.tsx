import React from 'react'
import { useTelemetry } from '../../context/TelemetryContext'

export const VelocityAltitude: React.FC = () => {
  const { telemetry } = useTelemetry()

  return (
    <div className="grid grid-cols-2 gap-4 h-full">
      <div className="border border-houston-muted p-3 bg-black/50">
        <h2 className="text-sm font-bold border-b border-houston-muted pb-1 mb-2">VELOCITY</h2>
        <div className="text-4xl font-bold tabular-nums">{telemetry.velocity.toFixed(1)} <span className="text-sm text-houston-muted">m/s</span></div>
      </div>
      <div className="border border-houston-muted p-3 bg-black/50">
        <h2 className="text-sm font-bold border-b border-houston-muted pb-1 mb-2">ALTITUDE</h2>
        <div className="text-4xl font-bold tabular-nums">{(telemetry.altitude / 1000).toFixed(2)} <span className="text-sm text-houston-muted">km</span></div>
      </div>
    </div>
  )
}
