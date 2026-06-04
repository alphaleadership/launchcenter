import React from 'react'
import { Activity } from 'lucide-react'
import { useTelemetry } from '../../context/TelemetryContext'
import { cn } from '../../utils/cn'

export const CrewVitalSigns: React.FC = () => {
  const { telemetry } = useTelemetry()

  return (
    <div className="p-3 bg-black/50 h-full">
      <h2 className="text-sm font-bold mb-3 border-b border-houston-muted pb-1 uppercase">
        Crew Vital Signs
      </h2>
      <div className="flex items-center justify-between">
        <Activity
          className={cn(
            'text-houston-green',
            telemetry.heartRate > 100 && 'text-red-500 animate-pulse'
          )}
        />
        <div className="text-3xl font-bold tabular-nums">
          {telemetry.heartRate} <span className="text-xs">BPM</span>
        </div>
      </div>
    </div>
  )
}
