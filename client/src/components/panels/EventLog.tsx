import React from 'react'
import { useTelemetry } from '../../context/TelemetryContext'
import { cn } from '../../utils/cn'

export const EventLog: React.FC = () => {
  const { logs } = useTelemetry()

  return (
    <div className="p-3 bg-black/50 h-full flex flex-col overflow-hidden">
      <h2 className="text-sm font-bold mb-2 border-b border-houston-muted pb-1">EVENT LOG</h2>
      <div className="text-[10px] space-y-1 overflow-y-auto scrollbar-hide flex flex-col-reverse flex-1">
        {[...logs].reverse().map((log, i) => (
          <div key={i} className={cn(log.color, 'border-l-2 border-current pl-2 py-0.5 mb-1')}>
            <span className="opacity-50">[{log.time}]</span> {log.message}
          </div>
        ))}
      </div>
    </div>
  )
}
