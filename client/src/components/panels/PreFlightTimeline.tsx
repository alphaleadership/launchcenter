import React from 'react'
import { useTelemetry } from '../../context/TelemetryContext'
import { cn } from '../../utils/cn'

export const PreFlightTimeline: React.FC = () => {
  const { telemetry, launcherDetails } = useTelemetry()

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

  return (
    <div className="p-3 bg-black/50 h-full flex flex-col">
      <h2 className="text-sm font-bold mb-3 border-b border-houston-muted pb-1">
        {telemetry.hasLaunched ? 'FLIGHT TIMELINE' : 'PRE-FLIGHT TIMELINE'}
      </h2>
      <div className="relative h-12 flex items-center">
        <div className="absolute w-full h-px bg-houston-muted top-1/2 -translate-y-1/2" />

        {!telemetry.hasLaunched ? (
          <>
            <div className="flex justify-between w-full relative z-10">
              {[-30, -20, -10, 0].map((t) => (
                <div key={t} className="flex flex-col items-center">
                  <div
                    className={cn(
                      'w-2 h-2 rounded-full border border-houston-muted bg-houston-dark',
                      telemetry.countdown >= t && 'bg-houston-green border-houston-green'
                    )}
                  />
                  <span className="text-[8px] mt-1">{t}s</span>
                </div>
              ))}
            </div>
            <div
              className="absolute h-1 bg-houston-green transition-all duration-1000 ease-linear top-1/2 -translate-y-1/2"
              style={{
                width: `${Math.min(100, Math.max(0, ((telemetry.countdown + 30) / 30) * 100))}%`
              }}
            />
            {telemetry.isCounting && !telemetry.hasLaunched && (
              <div
                className="absolute -top-6 text-[10px] text-yellow-500 animate-pulse"
                style={{ left: `${Math.max(0, Math.min(100, ((telemetry.countdown + 30) / 30) * 100))}%` }}
              >
                ▼
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex justify-between w-full relative z-10">
              {flightEvents.map((evt, idx) => {
                const passed = telemetry.met >= evt.time
                const isCurrent =
                  telemetry.met >= evt.time &&
                  (idx === flightEvents.length - 1 || telemetry.met < flightEvents[idx + 1].time)
                return (
                  <div
                    key={evt.name}
                    className="flex flex-col items-center absolute -translate-x-1/2"
                    style={{ left: `${(evt.time / maxFlightTime) * 100}%` }}
                  >
                    <div
                      className={cn(
                        'w-2 h-2 rounded-full border border-houston-muted bg-houston-dark transition-colors',
                        passed && 'bg-houston-green border-houston-green',
                        isCurrent &&
                          'bg-yellow-500 border-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.8)]'
                      )}
                    />
                    <span
                      className={cn(
                        'text-[8px] mt-1 whitespace-nowrap transition-colors',
                        isCurrent ? 'text-yellow-500 font-bold' : 'text-gray-500'
                      )}
                    >
                      {evt.name}
                    </span>
                  </div>
                )
              })}
            </div>
            <div
              className="absolute h-1 bg-yellow-500 transition-all duration-1000 ease-linear top-1/2 -translate-y-1/2"
              style={{
                width: `${Math.min(100, Math.max(0, (telemetry.met / maxFlightTime) * 100))}%`
              }}
            />
            <div
              className="absolute -top-6 text-[10px] text-yellow-500"
              style={{
                left: `${Math.min(100, Math.max(0, (telemetry.met / maxFlightTime) * 100))}%`,
                transform: 'translateX(-50%)'
              }}
            >
              ▼
            </div>
          </>
        )}
      </div>
    </div>
  )
}
