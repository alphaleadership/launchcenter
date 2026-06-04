import React from 'react'
import { useTelemetry } from '../../context/TelemetryContext'
import { cn } from '../../utils/cn'

export const MissionProfile: React.FC = () => {
  const { telemetry, availableMissions, selectMission } = useTelemetry()

  return (
    <div className="p-3 bg-black/50 h-full overflow-y-auto">
      <h2 className="text-sm font-bold mb-3 border-b border-houston-muted pb-1">MISSION PROFILE</h2>
      <div className="flex flex-col gap-2">
        {availableMissions.map((name) => (
          <button
            key={name}
            disabled={telemetry.hasLaunched || telemetry.isCounting}
            onClick={() => selectMission(name)}
            className={cn(
              'text-[10px] py-2 border transition-all uppercase font-bold',
              telemetry.mission === name
                ? 'bg-houston-green text-black border-houston-green'
                : 'border-houston-muted hover:border-houston-green',
              (telemetry.hasLaunched || telemetry.isCounting) && 'opacity-50 cursor-not-allowed'
            )}
          >
            {name}
          </button>
        ))}
      </div>
    </div>
  )
}
