import React, { useMemo } from 'react'
import { LineChart, Line, ResponsiveContainer, YAxis, XAxis, Tooltip, ReferenceDot } from 'recharts'
import { useTelemetry } from '../../context/TelemetryContext'

export const AltitudeProfile: React.FC = () => {
  const { telemetry, launcherDetails } = useTelemetry()

  const theoreticalData = useMemo(() => {
    const config = launcherDetails[telemetry.launcher] || {
      payloadMass: 10,
      stages: [{ deltaV: 3000, burnTime: 150, fuelMass: 100, dryMass: 10 }]
    }
    if (!config.stages) return []

    const stages = config.stages
    let met = 0
    let alt = 0
    let dist = 0
    let vx = 0
    let vy = 0
    let fuel = 100
    let stage = 1
    let boostersFuel = config.boosters ? 100 : 0
    const result = []

    while (stage <= stages.length && met < 3600) {
      const stg = stages[stage - 1]
      
      let M_init = config.payloadMass || 0
      for (let i = stage - 1; i < stages.length; i++) {
        M_init += stages[i].dryMass + stages[i].fuelMass
      }
      
      let M_final = M_init - stg.fuelMass
      const Ve_stage = stg.deltaV / Math.log(M_init / M_final)
      const thrust_stage = (stg.fuelMass / stg.burnTime) * Ve_stage
      let totalThrust = thrust_stage

      let currentMass = config.payloadMass || 0
      for (let i = stage; i < stages.length; i++) {
        currentMass += stages[i].dryMass + stages[i].fuelMass
      }
      currentMass += stg.dryMass + (stg.fuelMass * (fuel / 100))

      if (stage === 1 && config.boosters && boostersFuel > 0) {
        currentMass += config.boosters.dryMass + (config.boosters.fuelMass * (boostersFuel / 100))
        let M_init_b = M_init + config.boosters.dryMass + config.boosters.fuelMass
        let M_final_b = M_init_b - config.boosters.fuelMass
        const Ve_booster = config.boosters.deltaV / Math.log(M_init_b / M_final_b)
        const thrust_booster = (config.boosters.fuelMass / config.boosters.burnTime) * Ve_booster
        totalThrust += thrust_booster
        boostersFuel -= 100 / config.boosters.burnTime
      }

      let engineAccel = totalThrust / currentMass
      const pitch = Math.max(0, (Math.PI / 2) * (1 - met / 600))
      
      vx += engineAccel * Math.cos(pitch)
      vy += engineAccel * Math.sin(pitch) - 9.81 * 0.1
      
      dist += vx
      alt = Math.max(0, alt + vy)
      fuel -= 100 / stg.burnTime

      if (fuel <= 0 && stage < stages.length) {
        stage++
        fuel = 100
        const v_total = Math.sqrt(vx*vx + vy*vy) + 150
        const angle = Math.atan2(vy, vx)
        vx = v_total * Math.cos(angle)
        vy = v_total * Math.sin(angle)
      }

      if (met % 5 === 0) {
        result.push({ distance: dist, altitude: alt })
      }
      
      met++
      if (fuel <= 0 && stage > stages.length) {
        result.push({ distance: dist, altitude: alt })
        break
      }
    }
    return result
  }, [telemetry.launcher, launcherDetails])

  return (
    <div className="p-3 h-full bg-black/50 flex flex-col overflow-hidden">
      <h2 className="text-sm font-bold mb-3 border-b border-houston-muted pb-1 shrink-0">
        TRAJECTORY PROFILE (m)
      </h2>
      <div className="flex-1 min-h-0 w-full relative">
        <div className="absolute inset-0">
          <ResponsiveContainer width="99%" height="100%">
            <LineChart data={theoreticalData} margin={{ top: 5, right: 15, left: -20, bottom: 5 }}>
              <XAxis type="number" dataKey="distance" domain={['dataMin', 'dataMax']} hide />
              <YAxis type="number" dataKey="altitude" stroke="#003b00" fontSize={10} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #003b00' }}
                itemStyle={{ color: '#00ff41' }}
                labelStyle={{ display: 'none' }}
                formatter={(value: any) => [Number(value || 0).toFixed(0), 'ALTITUDE']}
              />
              <Line
                type="monotone"
                dataKey="altitude"
                stroke="#003b00"
                strokeDasharray="5 5"
                dot={false}
                strokeWidth={2}
                isAnimationActive={false}
              />
              {telemetry.hasLaunched && (
                <ReferenceDot
                  x={telemetry.distance}
                  y={telemetry.altitude}
                  r={5}
                  fill="#00ff41"
                  stroke="#ffffff"
                  strokeWidth={2}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
