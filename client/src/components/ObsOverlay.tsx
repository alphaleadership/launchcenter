import React, { useState, useEffect } from 'react'
import { useTelemetry } from '../context/TelemetryContext'
import { cn } from '../utils/cn'

export const ObsOverlay: React.FC = () => {
  const {
    telemetry,
    formatCountdown,
    formatMET,
    overlayConfig,
    updateOverlayConfig,
    status,
    launcherDetails
  } = useTelemetry()
  const [activeControl, setActiveControl] = useState<keyof typeof overlayConfig | null>(null)

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (!activeControl) return

      let dx = 0
      let dy = 0
      if (e.key === 'ArrowUp') dy = -1
      if (e.key === 'ArrowDown') dy = 1
      if (e.key === 'ArrowLeft') dx = -1
      if (e.key === 'ArrowRight') dx = 1

      if (dx !== 0 || dy !== 0) {
        e.preventDefault()
        const shiftMultiplier = e.shiftKey ? 5 : 1
        const currentTransform = (overlayConfig[activeControl] as any) || {
          x: 85,
          y: 50,
          scale: 100
        }

        updateOverlayConfig({
          [activeControl]: {
            ...currentTransform,
            x: Math.max(0, Math.min(100, currentTransform.x + dx * shiftMultiplier)),
            y: Math.max(0, Math.min(100, currentTransform.y + dy * shiftMultiplier))
          }
        })
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [activeControl, overlayConfig, updateOverlayConfig])

  const config = launcherDetails[telemetry.launcher] || {
    payloadMass: 10,
    stages: [{ deltaV: 3000, burnTime: 150, fuelMass: 100, dryMass: 10 }]
  }

  const flightEvents = React.useMemo(() => {
    if (!config.stages) return []
    const evts = [
      { name: 'LIFT OFF', time: 0 },
      { name: 'MAX-Q', time: 60 }
    ]
    let t = 0
    if (config.stages[0]) {
      t += config.stages[0].burnTime
      evts.push({ name: 'MECO', time: t })
      evts.push({ name: 'STAGE SEP', time: t + 2 })
    }
    if (config.stages[1]) {
      t += config.stages[1].burnTime
      evts.push({ name: 'SECO', time: t })
      evts.push({ name: 'ORBIT', time: t + 10 })
    }
    return evts
  }, [config])

  const maxFlightTime = flightEvents.length > 0 ? flightEvents[flightEvents.length - 1].time : 600

  const isFinalCountdown =
    !telemetry.hasLaunched && telemetry.countdown >= -10 && telemetry.isCounting

  const activeEvent = React.useMemo(() => {
    if (!telemetry.hasLaunched) {
      if (telemetry.isCounting && telemetry.countdown >= -10 && telemetry.countdown <= 0) {
        return { name: 'LIFT OFF', timeLeft: Math.abs(telemetry.countdown) }
      }
      return null
    }

    const nextEvent = flightEvents.find(
      (evt) => evt.time > telemetry.met && evt.time - telemetry.met <= 10
    )
    if (nextEvent) {
      return { name: nextEvent.name, timeLeft: nextEvent.time - telemetry.met }
    }
    return null
  }, [
    telemetry.hasLaunched,
    telemetry.isCounting,
    telemetry.countdown,
    telemetry.met,
    flightEvents
  ])

  // Overlay has a transparent background by default for OBS
  return (
    <div
      className="w-screen h-screen bg-transparent overflow-hidden relative font-mono"
      onClick={(e) => {
        if (e.target === e.currentTarget) setActiveControl(null)
      }}
    >
      <div
        className="w-full h-full relative transition-transform duration-300"
        style={{
          transform: `scale(${(overlayConfig.overlayScale || 100) / 100})`,
          transformOrigin: 'center'
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) setActiveControl(null)
        }}
      >
        {/* Upcoming Event Alert (Centered) */}
        <div
          className={cn(
            'transition-all duration-300 ease-in-out absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center pointer-events-none z-50',
            activeEvent ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
          )}
        >
          {activeEvent && (
            <div className="bg-black/90 border-2 border-yellow-500 px-12 py-6 rounded-2xl flex flex-col items-center shadow-[0_0_40px_rgba(234,179,8,0.4)] animate-pulse">
              <span className="text-yellow-500 font-bold tracking-widest text-lg uppercase mb-2">
                APPROACHING EVENT
              </span>
              <span className="text-white font-black tracking-tighter text-6xl uppercase drop-shadow-lg text-center">
                {activeEvent.name}
              </span>
              <span className="text-yellow-500/90 font-bold tracking-widest text-2xl mt-4">
                T-MINUS {activeEvent.timeLeft}S
              </span>
            </div>
          )}
        </div>
        {/* Mission Info Badge */}
        <div
          onClick={(e) => {
            e.stopPropagation()
            setActiveControl('missionTransform')
          }}
          className={cn(
            'transition-all duration-500 ease-in-out absolute flex flex-col items-center justify-center cursor-pointer',
            overlayConfig.showMission ? 'opacity-100' : 'opacity-0 pointer-events-none',
            activeControl === 'missionTransform'
              ? 'ring-2 ring-houston-green ring-offset-4 ring-offset-transparent rounded-lg'
              : ''
          )}
          style={{
            left: `${overlayConfig.missionTransform?.x ?? 85}%`,
            top: `${overlayConfig.missionTransform?.y ?? 70}%`,
            transform: `translate(-50%, -50%) scale(${(overlayConfig.missionTransform?.scale || 100) / 100})`,
            transformOrigin: 'center'
          }}
        >
          <div className="bg-black/80 border-2 border-houston-green text-houston-green px-3 py-1.5 rounded-tl-lg rounded-br-lg shadow-[0_0_15px_rgba(0,255,0,0.2)] flex items-center gap-3">
            <span className="font-bold tracking-widest text-xs uppercase">
              {telemetry.launcher}
            </span>
            <span className="text-houston-muted text-xs">||</span>
            <span className="font-bold tracking-widest text-xs uppercase">{telemetry.mission}</span>
          </div>
        </div>

        {/* Countdown Display */}
        <div
          onClick={(e) => {
            e.stopPropagation()
            setActiveControl('countdownTransform')
          }}
          className={cn(
            'transition-all duration-500 ease-in-out absolute flex flex-col items-center justify-center cursor-pointer',
            overlayConfig.showCountdown ? 'opacity-100' : 'opacity-0 pointer-events-none',
            activeControl === 'countdownTransform'
              ? 'ring-2 ring-houston-green ring-offset-4 ring-offset-transparent rounded-xl'
              : ''
          )}
          style={{
            left: `${overlayConfig.countdownTransform?.x ?? 85}%`,
            top: `${overlayConfig.countdownTransform?.y ?? 80}%`,
            transform: `translate(-50%, -50%) scale(${(overlayConfig.countdownTransform?.scale || 100) / 100})`,
            transformOrigin: 'center'
          }}
        >
          <div
            className={cn(
              'bg-black/80 border-2 px-4 py-2.5 rounded-tl-xl rounded-br-xl flex flex-col items-end shadow-lg transition-colors duration-300',
              telemetry.hasLaunched
                ? 'border-houston-green text-houston-green'
                : isFinalCountdown
                  ? 'border-red-500 text-red-500 animate-pulse'
                  : 'border-yellow-500 text-yellow-500'
            )}
          >
            <div className="text-xs font-bold opacity-80 uppercase tracking-widest mb-0.5">
              {telemetry.hasLaunched ? 'MISSION ELAPSED TIME' : 'T-MINUS'}
            </div>
            <div className="text-4xl font-black tabular-nums tracking-tighter drop-shadow-md">
              {telemetry.hasLaunched
                ? formatMET(telemetry.met)
                : formatCountdown(telemetry.countdown)}
            </div>
          </div>
        </div>

        {/* Status Indicator */}
        <div
          onClick={(e) => {
            e.stopPropagation()
            setActiveControl('statusTransform')
          }}
          className={cn(
            'transition-all duration-500 ease-in-out absolute flex flex-col items-center justify-center cursor-pointer',
            overlayConfig.showStatus ? 'opacity-100' : 'opacity-0 pointer-events-none',
            activeControl === 'statusTransform'
              ? 'ring-2 ring-houston-green ring-offset-4 ring-offset-transparent rounded'
              : ''
          )}
          style={{
            left: `${overlayConfig.statusTransform?.x ?? 85}%`,
            top: `${overlayConfig.statusTransform?.y ?? 90}%`,
            transform: `translate(-50%, -50%) scale(${(overlayConfig.statusTransform?.scale || 100) / 100})`,
            transformOrigin: 'center'
          }}
        >
          <div className="flex gap-2 items-center mt-0.5">
            <div
              className={cn(
                'w-2 h-2 rounded-full animate-pulse',
                telemetry.hasLaunched
                  ? 'bg-houston-green'
                  : telemetry.isCounting
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
              )}
            ></div>
            <span className="text-white text-[10px] font-bold uppercase drop-shadow-md bg-black/50 px-1.5 py-0.5 rounded">
              {telemetry.hasLaunched
                ? 'IN FLIGHT'
                : telemetry.isCounting
                  ? 'COUNTDOWN ACTIVE'
                  : 'HOLD / WAITING'}
            </span>
          </div>
        </div>

        {/* Flight Data Display - Only shown after launch */}
        <div
          onClick={(e) => {
            e.stopPropagation()
            setActiveControl('flightDataTransform')
          }}
          className={cn(
            'transition-all duration-700 ease-in-out absolute flex flex-col items-center justify-center cursor-pointer',
            telemetry.hasLaunched && overlayConfig.showFlightData
              ? 'opacity-100'
              : 'opacity-0 pointer-events-none',
            activeControl === 'flightDataTransform'
              ? 'ring-2 ring-houston-green ring-offset-4 ring-offset-transparent rounded-xl'
              : ''
          )}
          style={{
            left: `${overlayConfig.flightDataTransform?.x ?? 85}%`,
            top: `${overlayConfig.flightDataTransform?.y ?? 80}%`,
            transform: `translate(-50%, -50%) scale(${(overlayConfig.flightDataTransform?.scale || 100) / 100})`,
            transformOrigin: 'center'
          }}
        >
          <div className="bg-black/80 border-2 border-houston-green/50 px-4 py-2 rounded-xl flex gap-6 shadow-[0_0_10px_rgba(0,255,0,0.1)]">
            <div className="flex flex-col items-end">
              <span className="text-[9px] text-houston-green/80 font-bold uppercase tracking-widest">
                Altitude
              </span>
              <span className="text-xl font-black tabular-nums text-white">
                {((telemetry.altitude || 0) / 1000).toFixed(1)}{' '}
                <span className="text-[10px] text-houston-green/80">km</span>
              </span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[9px] text-houston-green/80 font-bold uppercase tracking-widest">
                Velocity
              </span>
              <span className="text-xl font-black tabular-nums text-white">
                {Math.round(telemetry.velocity || 0)}{' '}
                <span className="text-[10px] text-houston-green/80">km/h</span>
              </span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[9px] text-houston-green/80 font-bold uppercase tracking-widest">
                Stage
              </span>
              <span className="text-xl font-black tabular-nums text-white">
                {telemetry.stage}
                <span className="text-[10px] text-houston-green/80">/{telemetry.maxStages}</span>
              </span>
            </div>
          </div>
        </div>

        {/* System Checklist - Disappears at T-7s */}
        <div
          onClick={(e) => {
            e.stopPropagation()
            setActiveControl('checklistTransform')
          }}
          className={cn(
            'transition-all duration-700 ease-in-out absolute flex flex-col items-center justify-center cursor-pointer',
            overlayConfig.showChecklist &&
              !telemetry.hasLaunched &&
              (!telemetry.isCounting || telemetry.countdown < -7)
              ? 'opacity-100'
              : 'opacity-0 pointer-events-none',
            activeControl === 'checklistTransform'
              ? 'ring-2 ring-houston-green ring-offset-4 ring-offset-transparent rounded-xl'
              : ''
          )}
          style={{
            left: `${overlayConfig.checklistTransform?.x ?? 85}%`,
            top: `${overlayConfig.checklistTransform?.y ?? 50}%`,
            transform: `translate(-50%, -50%) scale(${(overlayConfig.checklistTransform?.scale || 100) / 100})`,
            transformOrigin: 'center'
          }}
        >
          <div className="bg-black/80 border-2 border-houston-muted p-2 rounded-xl flex flex-col gap-0.5 shadow-lg w-48">
            <div className="text-[9px] font-bold uppercase tracking-widest border-b border-houston-muted pb-1 mb-1 opacity-80">
              GO / NO-GO POLL
            </div>
            {Object.keys(status).length > 0 ? (
              Object.entries(status).map(([system, sysStatus]) => (
                <div key={system} className="flex justify-between items-center text-xs">
                  <span className="font-bold">{system}</span>
                  <span
                    className={cn(
                      'px-1.5 py-px text-[10px] font-black rounded uppercase',
                      sysStatus === 'GO'
                        ? 'bg-houston-green text-black'
                        : sysStatus === 'NO-GO'
                          ? 'bg-red-500 text-white animate-pulse'
                          : 'bg-yellow-500 text-black'
                    )}
                  >
                    {sysStatus}
                  </span>
                </div>
              ))
            ) : (
              <>
                {['GUIDANCE', 'GROUND', 'RANGE', 'WEATHER'].map((system) => (
                  <div
                    key={system}
                    className="flex justify-between items-center text-xs opacity-50"
                  >
                    <span className="font-bold">{system}</span>
                    <span className="px-1.5 py-px text-[10px] font-black rounded uppercase bg-yellow-500 text-black">
                      WAITING
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Flight Timeline - Only shown after launch */}
        <div
          onClick={(e) => {
            e.stopPropagation()
            setActiveControl('checklistTransform')
          }}
          className={cn(
            'transition-all duration-700 ease-in-out absolute flex flex-col items-center justify-center cursor-pointer',
            overlayConfig.showChecklist && telemetry.hasLaunched
              ? 'opacity-100'
              : 'opacity-0 pointer-events-none',
            activeControl === 'checklistTransform'
              ? 'ring-2 ring-houston-green ring-offset-4 ring-offset-transparent rounded-xl'
              : ''
          )}
          style={{
            left: `${overlayConfig.checklistTransform?.x ?? 85}%`,
            top: `${overlayConfig.checklistTransform?.y ?? 50}%`,
            transform: `translate(-50%, -50%) scale(${(overlayConfig.checklistTransform?.scale || 100) / 100})`,
            transformOrigin: 'center'
          }}
        >
          <div className="bg-black/80 border-2 border-houston-green/50 p-2 rounded-xl flex flex-col gap-1 shadow-[0_0_10px_rgba(0,255,0,0.1)] w-80">
            <div className="text-[9px] font-bold uppercase tracking-widest border-b border-houston-green/30 pb-1 mb-1 text-houston-green opacity-80">
              FLIGHT TIMELINE
            </div>
            <div className="relative h-12 w-full flex items-center mt-2 px-2">
              <div className="absolute left-2 right-2 h-px bg-houston-muted top-1/2 -translate-y-1/2" />
              <div
                className="absolute left-2 h-1 bg-yellow-500 top-1/2 -translate-y-1/2 transition-all duration-1000 ease-linear"
                style={{
                  width: `calc(${Math.min(100, Math.max(0, (telemetry.met / maxFlightTime) * 100))}% - 4px)`
                }}
              />

              <div className="w-full h-full relative z-10">
                {flightEvents.map((evt, idx) => {
                  const passed = telemetry.met >= evt.time
                  const isCurrent =
                    telemetry.met >= evt.time &&
                    (idx === flightEvents.length - 1 || telemetry.met < flightEvents[idx + 1].time)
                  return (
                    <div
                      key={evt.name}
                      className="absolute flex flex-col items-center -translate-x-1/2"
                      style={{ left: `${(evt.time / maxFlightTime) * 100}%`, top: '-2px' }}
                    >
                      <div
                        className={cn(
                          'w-2 h-2 rounded-full border bg-black transition-colors',
                          passed ? 'border-houston-green bg-houston-green' : 'border-gray-500',
                          isCurrent &&
                            'bg-yellow-500 border-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.8)]'
                        )}
                      />
                      <div
                        className={cn(
                          'text-[8px] mt-1 text-center whitespace-nowrap transition-colors',
                          isCurrent
                            ? 'text-yellow-500 font-bold'
                            : passed
                              ? 'text-houston-green'
                              : 'text-gray-500'
                        )}
                      >
                        {evt.name}
                      </div>
                    </div>
                  )
                })}
              </div>
              <div
                className="absolute -top-3 text-[10px] text-yellow-500 transition-all duration-1000 ease-linear"
                style={{
                  left: `calc(${Math.min(100, Math.max(0, (telemetry.met / maxFlightTime) * 100))}% + 4px)`,
                  transform: 'translateX(-50%)'
                }}
              >
                ▼
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
