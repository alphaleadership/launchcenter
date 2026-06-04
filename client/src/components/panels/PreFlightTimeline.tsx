import React from 'react'
import { useTelemetry } from '../../context/TelemetryContext'
import { cn } from '../../utils/cn'

export const PreFlightTimeline: React.FC = () => {
  const { telemetry } = useTelemetry()

  return (
    <div className="p-3 bg-black/50 h-full flex flex-col">
      <h2 className="text-sm font-bold mb-3 border-b border-houston-muted pb-1">PRE-FLIGHT TIMELINE</h2>
      <div className="relative h-12 flex items-center">
        <div className="absolute w-full h-px bg-houston-muted top-1/2 -translate-y-1/2" />
        <div className="flex justify-between w-full relative z-10">
          {[-30, -20, -10, 0].map(t => (
            <div key={t} className="flex flex-col items-center">
              <div className={cn("w-2 h-2 rounded-full border border-houston-muted bg-houston-dark", telemetry.countdown >= t && "bg-houston-green border-houston-green")} />
              <span className="text-[8px] mt-1">{t}s</span>
            </div>
          ))}
        </div>
        <div
          className="absolute h-1 bg-houston-green transition-all duration-1000 ease-linear top-1/2 -translate-y-1/2"
          style={{ width: `${Math.min(100, Math.max(0, (telemetry.countdown + 30) / 30 * 100))}%` }}
        />
        {telemetry.isCounting && !telemetry.hasLaunched && (
          <div className="absolute -top-6 text-[10px] text-yellow-500 animate-pulse" style={{ left: `${(telemetry.countdown + 30) / 30 * 100}%` }}>
            ▼
          </div>
        )}
      </div>
    </div>
  )
}
