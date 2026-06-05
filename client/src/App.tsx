import React, { useRef, useState, useLayoutEffect } from 'react'
import { Rocket } from 'lucide-react'
import { cn } from './utils/cn'
import { TelemetryProvider, useTelemetry } from './context/TelemetryContext'
import { FlexLayoutWrapper } from './components/FlexLayoutWrapper'
import { ObsOverlay } from './components/ObsOverlay'

const AppContent: React.FC = () => {
  const {
    telemetry,
    formatMET,
    formatCountdown,
    startCountdown,
    holdCountdown,
    syncWithIRL,
    status,
    availableLaunchers,
    selectLauncher,
    irlLaunches
  } = useTelemetry()
  const headerRef = useRef<HTMLDivElement>(null)
  const footerRef = useRef<HTMLDivElement>(null)
  const [layoutHeight, setLayoutHeight] = useState<number>(0)

  const isFinalCountdown =
    !telemetry.hasLaunched && telemetry.countdown >= -10 && telemetry.isCounting
  const isAllGo = Object.values(status).length > 0 && Object.values(status).every((s) => s === 'GO')

  // Calcule la hauteur disponible pour FlexLayout en soustrayant header et footer
  useLayoutEffect(() => {
    const update = () => {
      const headerH = headerRef.current?.offsetHeight ?? 0
      const footerH = footerRef.current?.offsetHeight ?? 0
      // padding top + bottom = 2 * 16px = 32px (p-4)
      const padding = 32
      setLayoutHeight(window.innerHeight - headerH - footerH - padding - 16) // 16px gap mb-4
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  return (
    <div
      className={cn(
        'bg-houston-dark text-houston-green p-4 font-mono crt overflow-hidden transition-colors duration-500',
        isFinalCountdown && (telemetry.countdown % 2 === 0 ? 'bg-red-950/20' : 'bg-houston-dark')
      )}
      style={{ height: '100vh', boxSizing: 'border-box', isolation: 'isolate' }}
    >
      <div className="scanline" />

      {/* Final 10 Seconds Animation Overlay */}
      {isFinalCountdown && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
          <div className="text-[20vw] font-black opacity-20 animate-ping">
            {Math.abs(telemetry.countdown)}
          </div>
        </div>
      )}

      {/* Header */}
      <div
        ref={headerRef}
        className="border-b border-houston-muted pb-2 mb-4 flex justify-between items-center relative z-10"
      >
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tighter flex items-center gap-2">
              <Rocket
                className={cn(
                  telemetry.hasLaunched && 'animate-bounce',
                  telemetry.isCounting && !telemetry.hasLaunched && 'animate-pulse'
                )}
              />
              HOUSTON MISSION CONTROL
            </h1>
            <p className="text-xs text-houston-muted">
              NASA-JSC // {telemetry.launcher.toUpperCase()} - {telemetry.mission} OPERATION
            </p>
          </div>

          {!telemetry.hasLaunched && !telemetry.isCounting && (
            <div className="flex items-center gap-4">
              <select
                value={telemetry.launcher}
                onChange={(e) => selectLauncher(e.target.value)}
                className="bg-black border-2 border-houston-muted text-houston-green px-3 py-2 font-bold uppercase outline-none focus:border-houston-green cursor-pointer transition-colors"
              >
                {availableLaunchers.map((launcher) => (
                  <option key={launcher} value={launcher}>
                    {launcher}
                  </option>
                ))}
              </select>

              <button
                onClick={startCountdown}
                disabled={!isAllGo}
                className={cn(
                  'px-6 py-2 border-2 font-black transition-all animate-pulse',
                  isAllGo
                    ? 'bg-houston-green text-black border-houston-green hover:bg-black hover:text-houston-green cursor-pointer'
                    : 'border-houston-muted text-houston-muted cursor-not-allowed opacity-50'
                )}
              >
                {isAllGo ? '▶ INITIATE COUNTDOWN' : 'WAITING FOR ALL SYSTEMS GO'}
              </button>

              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) syncWithIRL(e.target.value)
                }}
                className="px-4 py-2 border-2 font-bold transition-all border-blue-500 bg-black text-blue-500 hover:bg-blue-500 hover:text-white cursor-pointer outline-none"
              >
                <option value="" disabled>🌍 SYNC IRL LAUNCH...</option>
                {irlLaunches.map((l: any) => (
                  <option key={l.id} value={l.id} className="text-black bg-white">
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {!telemetry.hasLaunched && telemetry.isCounting && (
            <div className="flex gap-4">
              <button
                onClick={holdCountdown}
                className="px-6 py-2 border-2 font-black transition-all border-red-500 text-red-500 hover:bg-red-500 hover:text-white cursor-pointer"
              >
                ⏸ HOLD COUNTDOWN
              </button>
            </div>
          )}
        </div>
        <div className="text-right">
          <div
            className={cn(
              'text-3xl font-bold tabular-nums',
              !telemetry.hasLaunched && 'text-yellow-500',
              isFinalCountdown && 'text-red-500 animate-pulse'
            )}
          >
            {telemetry.hasLaunched
              ? `MET ${formatMET(telemetry.met)}`
              : formatCountdown(telemetry.countdown)}
          </div>
          <div className="flex gap-4 justify-end text-xs">
            <div className="text-houston-green font-bold uppercase">
              Stage {telemetry.stage}/{telemetry.maxStages}
            </div>
            <div
              className={cn(
                'font-bold uppercase',
                telemetry.hasLaunched
                  ? 'text-houston-green'
                  : telemetry.isCounting
                    ? 'text-yellow-500'
                    : 'text-red-500'
              )}
            >
              {telemetry.hasLaunched
                ? 'IN FLIGHT'
                : telemetry.isCounting
                  ? 'COUNTDOWN ACTIVE'
                  : 'HOLD / WAITING'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Layout Area - hauteur calculée explicitement en px */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          height: layoutHeight > 0 ? `${layoutHeight}px` : 'calc(100vh - 200px)'
        }}
      >
        <FlexLayoutWrapper />
      </div>

      {/* Footer */}
      <div
        ref={footerRef}
        className="mt-4 text-[10px] text-houston-muted flex justify-between uppercase relative z-10"
      >
        <span>Terminal: JSC-MOC-2026-07-02</span>
        <div className="flex gap-4">
          <span className={cn(telemetry.isCounting && 'animate-pulse text-houston-green')}>
            {telemetry.isCounting ? '>> DATA_LINK_ACTIVE' : '|| DATA_LINK_STANDBY'}
          </span>
          <span>Secure Connection Active // End of Line</span>
        </div>
      </div>
    </div>
  )
}

const App: React.FC = () => {
  // Simple router based on path
  if (window.location.pathname === '/obs') {
    return (
      <TelemetryProvider>
        <ObsOverlay />
      </TelemetryProvider>
    )
  }

  return (
    <TelemetryProvider>
      <AppContent />
    </TelemetryProvider>
  )
}

export default App
