import React from 'react'
import { LineChart, Line, ResponsiveContainer, YAxis, XAxis, Tooltip } from 'recharts'
import { useTelemetry } from '../../context/TelemetryContext'

export const AltitudeProfile: React.FC = () => {
  const { history } = useTelemetry()

  return (
    <div className="p-3 h-full bg-black/50 flex flex-col overflow-hidden">
      <h2 className="text-sm font-bold mb-3 border-b border-houston-muted pb-1 shrink-0">ALTITUDE PROFILE (m)</h2>
      <div className="flex-1 min-h-0 w-full relative">
        <div className="absolute inset-0">
          <ResponsiveContainer width="99%" height="100%">
            <LineChart data={history} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <XAxis type="number" dataKey="distance" domain={['dataMin', 'dataMax']} hide />
              <YAxis type="number" dataKey="altitude" stroke="#003b00" fontSize={10} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #003b00' }}
                itemStyle={{ color: '#00ff41' }}
                labelStyle={{ display: 'none' }}
                formatter={(value: any, name: any) => [Number(value || 0).toFixed(0), String(name || '').toUpperCase()]}
              />
              <Line type="monotone" dataKey="altitude" stroke="#00ff41" dot={false} strokeWidth={2} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
