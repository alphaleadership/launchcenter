import React, { createContext, useContext, useState, useEffect, useRef } from 'react'

export interface Telemetry {
  altitude: number
  velocity: number
  fuel: number
  o2: number
  heartRate: number
  met: number
  countdown: number
  isCounting: boolean
  hasLaunched: boolean
  stage: number
  maxStages: number
  launcher: string
  mission: string
  liveUrl?: string
}

export interface Status {
  [key: string]: string
}

export interface HistoryPoint {
  time: number
  val: number
}

export interface LogEntry {
  time: string
  message: string
  color: string
}

interface TelemetryContextType {
  telemetry: Telemetry
  status: Status
  availableLaunchers: string[]
  availableMissions: string[]
  history: HistoryPoint[]
  logs: LogEntry[]
  setSystemStatus: (system: string, newStatus: string) => void
  selectLauncher: (launcher: string) => void
  selectMission: (mission: string) => void
  startCountdown: () => void
  holdCountdown: () => void
  syncWithIRL: () => void
  formatMET: (seconds: number) => string
  formatCountdown: (seconds: number) => string
}

const TelemetryContext = createContext<TelemetryContextType | undefined>(undefined)

export const TelemetryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [telemetry, setTelemetry] = useState<Telemetry>({
    altitude: 0, velocity: 0, fuel: 100, o2: 100, heartRate: 75, met: 0, countdown: -30, isCounting: false, hasLaunched: false, stage: 1, maxStages: 2, launcher: 'Falcon 9', mission: 'LEO'
  })
  const [status, setStatus] = useState<Status>({
    booster: 'WAITING', guidance: 'WAITING', capsule: 'WAITING', ground: 'WAITING'
  })
  const [availableLaunchers, setAvailableLaunchers] = useState<string[]>([])
  const [availableMissions, setAvailableMissions] = useState<string[]>([])
  const [history, setHistory] = useState<HistoryPoint[]>([])
  const [logs, setLogs] = useState<LogEntry[]>([])
  const ws = useRef<WebSocket | null>(null)
  const prevTelemetry = useRef<Telemetry | null>(null)
  const connectedRef = useRef(false)

  useEffect(() => {
    ws.current = new WebSocket('ws://localhost:3001/ws')

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === 'TELEMETRY') {
        const newTel = data.payload as Telemetry
        setTelemetry(newTel)
        setHistory(prev => [...prev, { time: newTel.met, val: newTel.altitude }])

        const timeStr = newTel.hasLaunched ? formatMET(newTel.met) : formatCountdown(newTel.countdown)

        if (prevTelemetry.current && !newTel.hasLaunched && prevTelemetry.current.hasLaunched) {
          setLogs([])
        }

        const newLogs: LogEntry[] = []

        if (!connectedRef.current) {
          newLogs.push({ time: "0:00:00:00", message: "SYS: CONNECTED TO HOUSTON_CC", color: "text-houston-muted" })
          connectedRef.current = true
        }

        if (newTel.isCounting && (!prevTelemetry.current || !prevTelemetry.current.isCounting)) {
          newLogs.push({ time: timeStr, message: "SYS: COUNTDOWN INITIATED", color: "text-houston-green" })
        }

        if (!newTel.isCounting && !newTel.hasLaunched && prevTelemetry.current?.isCounting) {
          newLogs.push({ time: timeStr, message: "WRN: COUNTDOWN HOLD - CHECK SYSTEMS", color: "text-red-500" })
        }

        if (newTel.hasLaunched && (!prevTelemetry.current || !prevTelemetry.current.hasLaunched)) {
          newLogs.push({ time: "0:00:00:00", message: "EVT: LIFT OFF CONFIRMED", color: "text-white font-bold" })
        }

        if (prevTelemetry.current && newTel.stage > prevTelemetry.current.stage) {
          newLogs.push({ time: timeStr, message: "EVT: STAGE SEPARATION CONFIRMED", color: "text-yellow-500" })
        }

        if (newTel.fuel < 10 && (!prevTelemetry.current || prevTelemetry.current.fuel >= 10)) {
          newLogs.push({ time: timeStr, message: "WRN: FUEL LOW", color: "text-red-500" })
        }

        if (newLogs.length > 0) {
          setLogs(prev => [...prev, ...newLogs])
        }

        prevTelemetry.current = newTel
      } else if (data.type === 'STATUS_UPDATE') {
        setStatus(data.payload)
      } else if (data.type === 'LAUNCHERS_LIST') {
        setAvailableLaunchers(data.payload.launchers)
      } else if (data.type === 'MISSIONS_LIST') {
        setAvailableMissions(data.payload.missions)
      }
    }

    return () => ws.current?.close()
  }, [])

  const setSystemStatus = (system: string, newStatus: string) => {
    ws.current?.send(JSON.stringify({
      type: 'GO_NO_GO',
      payload: { system, status: newStatus }
    }))
  }

  const selectLauncher = (launcher: string) => {
    ws.current?.send(JSON.stringify({
      type: 'SELECT_LAUNCHER',
      payload: launcher
    }))
    setHistory([])
  }

  const selectMission = (mission: string) => {
    ws.current?.send(JSON.stringify({
      type: 'SELECT_MISSION',
      payload: mission
    }))
    setHistory([])
  }

  const startCountdown = () => {
    ws.current?.send(JSON.stringify({
      type: 'START_COUNTDOWN'
    }))
  }

  const holdCountdown = () => {
    ws.current?.send(JSON.stringify({
      type: 'HOLD_COUNTDOWN'
    }))
  }

  const syncWithIRL = () => {
    ws.current?.send(JSON.stringify({
      type: 'SYNC_IRL'
    }))
  }

  const formatMET = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24))
    const h = Math.floor((seconds % (3600 * 24)) / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    
    if (d > 0) return `${d}:${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const formatCountdown = (seconds: number) => {
    const abs = Math.abs(seconds)
    const d = Math.floor(abs / (3600 * 24))
    const h = Math.floor((abs % (3600 * 24)) / 3600)
    const m = Math.floor((abs % 3600) / 60)
    const s = abs % 60
    
    // Format NASA standard T- DDD:HH:MM:SS or T- HH:MM:SS
    if (d > 0) return `T- ${d}:${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    if (h > 0) return `T- ${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    
    return `T- ${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  return (
    <TelemetryContext.Provider value={{
      telemetry, status, availableLaunchers, availableMissions, history, logs,
      setSystemStatus, selectLauncher, selectMission, startCountdown, holdCountdown, syncWithIRL, formatMET, formatCountdown
    }}>
      {children}
    </TelemetryContext.Provider>
  )
}

export const useTelemetry = () => {
  const context = useContext(TelemetryContext)
  if (!context) throw new Error('useTelemetry must be used within a TelemetryProvider')
  return context
}
