import React from 'react'
import { useTelemetry } from '../context/TelemetryContext'
import { cn } from '../utils/cn'

export const ObsOverlay: React.FC = () => {
  const { telemetry, formatCountdown, formatMET } = useTelemetry()

  const isFinalCountdown =
    !telemetry.hasLaunched && telemetry.countdown >= -10 && telemetry.isCounting

  // Overlay has a transparent background by default for OBS
  return (
    <div className="w-screen h-screen bg-transparent overflow-hidden flex flex-col justify-end p-8 font-mono">
      <div className="flex flex-col items-end gap-2">
        {/* Mission Info Badge */}
        <div className="bg-black/80 border-2 border-houston-green text-houston-green px-4 py-2 rounded-tl-lg rounded-br-lg shadow-[0_0_15px_rgba(0,255,0,0.2)] flex items-center gap-4">
          <span className="font-bold tracking-widest text-sm uppercase">
            {telemetry.launcher}
          </span>
          <span className="text-houston-muted text-sm">||</span>
          <span className="font-bold tracking-widest text-sm uppercase">
            {telemetry.mission}
          </span>
        </div>

        {/* Countdown Display */}
        <div
          className={cn(
            'bg-black/80 border-2 px-6 py-4 rounded-tl-xl rounded-br-xl flex flex-col items-end shadow-lg transition-colors duration-300',
            telemetry.hasLaunched
              ? 'border-houston-green text-houston-green'
              : isFinalCountdown
                ? 'border-red-500 text-red-500 animate-pulse'
                : 'border-yellow-500 text-yellow-500'
          )}
        >
          <div className="text-sm font-bold opacity-80 uppercase tracking-widest mb-1">
            {telemetry.hasLaunched ? 'MISSION ELAPSED TIME' : 'T-MINUS'}
          </div>
          <div className="text-5xl font-black tabular-nums tracking-tighter drop-shadow-md">
            {telemetry.hasLaunched
              ? formatMET(telemetry.met)
              : formatCountdown(telemetry.countdown)}
          </div>
        </div>

        {/* Status Indicator */}
        <div className="flex gap-2 items-center mt-1">
          <div
            className={cn(
              'w-3 h-3 rounded-full animate-pulse',
              telemetry.hasLaunched
                ? 'bg-houston-green'
                : telemetry.isCounting
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
            )}
          ></div>
          <span className="text-white text-xs font-bold uppercase drop-shadow-md bg-black/50 px-2 py-1 rounded">
            {telemetry.hasLaunched
              ? 'IN FLIGHT'
              : telemetry.isCounting
                ? 'COUNTDOWN ACTIVE'
                : 'HOLD / WAITING'}
          </span>
        </div>
      </div>
    </div>
  )
}
