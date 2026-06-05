import React from 'react'
import { Shield } from 'lucide-react'
import { useTelemetry } from '../../context/TelemetryContext'
import { cn } from '../../utils/cn'

export const SystemReadiness: React.FC = () => {
  const { status, setSystemStatus } = useTelemetry()

  return (
    <div className="p-3 bg-black/50 h-full flex flex-col overflow-hidden">
      <h2 className="text-sm font-bold mb-3 border-b border-houston-muted pb-1 flex items-center gap-2">
        <Shield size={16} /> SYSTEM READINESS (GO / NO-GO)
      </h2>
      <div className="space-y-3 overflow-y-auto pr-1 scrollbar-hide">
        {Object.keys(status)
          .sort()
          .map((key) => (
            <div key={key} className="flex flex-col gap-1 border-b border-houston-muted/30 pb-2">
              <div className="flex justify-between text-[10px]">
                <span className="uppercase">{key}</span>
                <span
                  className={cn(
                    'font-bold',
                    status[key] === 'GO'
                      ? 'text-houston-green'
                      : status[key] === 'NO-GO'
                        ? 'text-red-500'
                        : 'text-yellow-500'
                  )}
                >
                  {status[key]}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setSystemStatus(key, 'GO')}
                  className={cn(
                    'flex-1 text-[9px] py-1 border transition-all',
                    status[key] === 'GO'
                      ? 'bg-houston-green text-black border-houston-green'
                      : 'border-houston-muted hover:border-houston-green'
                  )}
                >
                  GO
                </button>
                <button
                  onClick={() => setSystemStatus(key, 'NO-GO')}
                  className={cn(
                    'flex-1 text-[9px] py-1 border transition-all',
                    status[key] === 'NO-GO'
                      ? 'bg-red-500 text-black border-red-500'
                      : 'border-houston-muted hover:border-red-500'
                  )}
                >
                  NO-GO
                </button>
              </div>
            </div>
          ))}
      </div>
      <div className="text-[8px] text-gray-500 mt-2 break-all">
        DEBUG: {JSON.stringify(status)}
      </div>
    </div>
  )
}
