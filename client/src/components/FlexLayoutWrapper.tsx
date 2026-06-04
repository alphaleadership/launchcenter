import React, { useState, useCallback } from 'react'
import { Layout, Model, TabNode, Action } from 'flexlayout-react'

import { VehicleSelection } from './panels/VehicleSelection'
import { MissionProfile } from './panels/MissionProfile'
import { SystemReadiness } from './panels/SystemReadiness'
import { CrewVitalSigns } from './panels/CrewVitalSigns'
import { PreFlightTimeline } from './panels/PreFlightTimeline'
import { AltitudeProfile } from './panels/AltitudeProfile'
import { VelocityAltitude } from './panels/VelocityAltitude'
import { Consumables } from './panels/Consumables'
import { EventLog } from './panels/EventLog'
import { LiveStream } from './panels/LiveStream'

const initialJson = {
  global: {
    tabEnableFloat: true,
    tabEnablePopout: true,
    tabSetEnableMaximize: true,
    tabSetEnableDrag: true,
    tabSetEnableDivide: true,
    tabEnableRename: false,
    tabSetEnableDrop: true,
    splitterSize: 6
  },
  layout: {
    type: 'row',
    weight: 100,
    children: [
      {
        type: 'row',
        weight: 25,
        children: [
          {
            type: 'tabset',
            weight: 50,
            children: [
              { type: 'tab', name: 'VEHICLE', component: 'VehicleSelection' },
              { type: 'tab', name: 'MISSION', component: 'MissionProfile' }
            ]
          },
          {
            type: 'tabset',
            weight: 35,
            children: [{ type: 'tab', name: 'READINESS', component: 'SystemReadiness' }]
          },
          {
            type: 'tabset',
            weight: 15,
            children: [{ type: 'tab', name: 'VITAL SIGNS', component: 'CrewVitalSigns' }]
          }
        ]
      },
      {
        type: 'row',
        weight: 50,
        children: [
          {
            type: 'tabset',
            weight: 20,
            children: [{ type: 'tab', name: 'TIMELINE', component: 'PreFlightTimeline' }]
          },
          {
            type: 'tabset',
            weight: 60,
            children: [
              { type: 'tab', name: 'ALTITUDE PROFILE', component: 'AltitudeProfile' },
              { type: 'tab', name: 'LIVESTREAM', component: 'LiveStream' }
            ]
          },
          {
            type: 'tabset',
            weight: 20,
            children: [{ type: 'tab', name: 'VELOCITY / ALTITUDE', component: 'VelocityAltitude' }]
          }
        ]
      },
      {
        type: 'row',
        weight: 25,
        children: [
          {
            type: 'tabset',
            weight: 40,
            children: [{ type: 'tab', name: 'CONSUMABLES', component: 'Consumables' }]
          },
          {
            type: 'tabset',
            weight: 60,
            children: [{ type: 'tab', name: 'EVENT LOG', component: 'EventLog' }]
          }
        ]
      }
    ]
  }
}

export const FlexLayoutWrapper: React.FC = () => {
  // Use state for the model to allow updates (drag & drop, resize)
  const [model] = useState(() => Model.fromJson(initialJson))

  // The factory translates component names to actual React components
  const factory = useCallback((node: TabNode) => {
    const component = node.getComponent()
    switch (component) {
      case 'VehicleSelection':
        return <VehicleSelection />
      case 'MissionProfile':
        return <MissionProfile />
      case 'SystemReadiness':
        return <SystemReadiness />
      case 'CrewVitalSigns':
        return <CrewVitalSigns />
      case 'PreFlightTimeline':
        return <PreFlightTimeline />
      case 'AltitudeProfile':
        return <AltitudeProfile />
      case 'VelocityAltitude':
        return <VelocityAltitude />
      case 'Consumables':
        return <Consumables />
      case 'EventLog':
        return <EventLog />
      case 'LiveStream':
        return <LiveStream />
      default:
        return <div>Component {component} not found</div>
    }
  }, [])

  // Handle actions (essential for interativity)
  const onAction = useCallback((action: Action) => {
    return action // Let the layout handle the action internally
  }, [])

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#0a0a0a' }}>
      <Layout model={model} factory={factory} onAction={onAction} popoutURL="/popout.html" />
    </div>
  )
}
