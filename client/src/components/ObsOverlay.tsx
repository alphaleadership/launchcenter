import React from 'react'
import { useTelemetry } from '../context/TelemetryContext'
import { cn } from '../utils/cn'

export const ObsOverlay: React.FC = () => {
  const { telemetry, formatCountdown, formatMET, overlayConfig } = useTelemetry()

  const isFinalCountdown =
    !telemetry.hasLaunched && telemetry.countdown >= -10 && telemetry.isCounting

  // Overlay has a transparent background by default for OBS
  return (
    <div className="w-screen h-screen bg-transparent overflow-hidden flex flex-col justify-end p-8 font-mono">
      <div className="flex flex-col items-end gap-2">
        {/* Mission Info Badge */}
        <div className={cn(
          "transition-all duration-500 ease-in-out origin-bottom",
          overlayConfig.showMission ? "opacity-100 scale-100 max-h-20" : "opacity-0 scale-95 max-h-0 !m-0 overflow-hidden pointer-events-none"
        )}>
          <div className="bg-black/80 border-2 border-houston-green text-houston-green px-4 py-2 rounded-tl-lg rounded-br-lg shadow-[0_0_15px_rgba(0,255,0,0.2)] flex items-center gap-4">
            <span className="font-bold tracking-widest text-sm uppercase">
              {telemetry.launcher}
            </span>
            <span className="text-houston-muted text-sm">||</span>
            <span className="font-bold tracking-widest text-sm uppercase">
              {telemetry.mission}
            </span>
          </div>
        </div>

        {/* Countdown Display */}
        <div className={cn(
          "transition-all duration-500 ease-in-out origin-bottom",
          overlayConfig.showCountdown ? "opacity-100 scale-100 max-h-40" : "opacity-0 scale-95 max-h-0 !m-0 overflow-hidden pointer-events-none"
        )}>
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
        </div>

        {/* Status Indicator */}
        <div className={cn(
          "transition-all duration-500 ease-in-out origin-bottom",
          overlayConfig.showStatus ? "opacity-100 scale-100 max-h-10 mt-1" : "opacity-0 scale-95 max-h-0 !m-0 overflow-hidden pointer-events-none"
        )}>
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

        {/* Flight Data Display - Only shown after launch */}
        <div className={cn(
          "transition-all duration-700 ease-in-out origin-bottom",
          (telemetry.hasLaunched && overlayConfig.showFlightData) ? "opacity-100 scale-100 max-h-32 mt-2" : "opacity-0 scale-95 max-h-0 !m-0 overflow-hidden pointer-events-none"
        )}>
          <div className="bg-black/80 border-2 border-houston-green/50 px-5 py-3 rounded-xl flex gap-8 shadow-[0_0_10px_rgba(0,255,0,0.1)]">
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-houston-green/80 font-bold uppercase tracking-widest">Altitude</span>
              <span className="text-2xl font-black tabular-nums text-white">{(telemetry.altitude / 1000).toFixed(1)} <span className="text-xs text-houston-green/80">km</span></span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-houston-green/80 font-bold uppercase tracking-widest">Velocity</span>
              <span className="text-2xl font-black tabular-nums text-white">{Math.round(telemetry.velocity)} <span className="text-xs text-houston-green/80">km/h</span></span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-houston-green/80 font-bold uppercase tracking-widest">Stage</span>
              <span className="text-2xl font-black tabular-nums text-white">{telemetry.stage}<span className="text-xs text-houston-green/80">/{telemetry.maxStages}</span></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
