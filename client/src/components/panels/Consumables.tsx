import React from 'react'
import { useTelemetry } from '../../context/TelemetryContext'

export const Consumables: React.FC = () => {
  const { telemetry } = useTelemetry()

  return (
    <div className="p-3 bg-black/50 h-full">
      <h2 className="text-sm font-bold mb-4 border-b border-houston-muted pb-1">CONSUMABLES</h2>

      <div className="space-y-6">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span>FUEL</span>
            <span className="tabular-nums">{telemetry.fuel.toFixed(1)}%</span>
          </div>
          <div className="h-2 bg-houston-muted w-full overflow-hidden">
            <div className="h-full bg-houston-green transition-all duration-1000" style={{ width: `${telemetry.fuel}%` }} />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1">
            <span>OXYGEN</span>
            <span className="tabular-nums">{telemetry.o2.toFixed(1)}%</span>
          </div>
          <div className="h-2 bg-houston-muted w-full overflow-hidden">
            <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${telemetry.o2}%` }} />
          </div>
        </div>
      </div>
    </div>
  )
}
