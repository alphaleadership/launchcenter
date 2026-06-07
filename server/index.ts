import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/bun'
import { readFileSync, writeFileSync, existsSync, watch } from 'fs'
import { join } from 'path'
import OBSWebSocket from 'obs-websocket-js'
import { getAuthUrl, handleOAuthCallback, isAuthenticated, createYouTubeLive, endYouTubeLive } from './youtube'

const app = new Hono()
app.use('/status/*', cors())
app.use('/telemetry/*', cors())

// Serve static files from the React app build
app.use('/*', serveStatic({ root: '../client/dist' }))
// Fallback for SPA routing
app.get('*', serveStatic({ path: '../client/dist/index.html' }))
const CONFIG_PATH = join(import.meta.dir, 'launchers.json')
const MISSIONS_PATH = join(import.meta.dir, 'missions.json')
const OVERLAY_CONFIG_PATH = join(import.meta.dir, 'overlay.json')
let LAUNCHERS: any = {}
let MISSIONS: any = {}

let server: any

function loadConfig() {
  try {
    const data = readFileSync(CONFIG_PATH, 'utf-8')
    LAUNCHERS = JSON.parse(data)

    const missionsData = readFileSync(MISSIONS_PATH, 'utf-8')
    MISSIONS = JSON.parse(missionsData)

    console.log('🚀 Configuration loaded/reloaded')

    // Update maxStages for current mission if needed
    if (telemetry && currentLauncher && LAUNCHERS[currentLauncher]) {
      telemetry.maxStages = LAUNCHERS[currentLauncher].stages.length
    }

    if (server) {
      server.publish(
        'houston-control',
        JSON.stringify({
          type: 'LAUNCHERS_LIST',
          payload: {
            launchers: Object.keys(LAUNCHERS),
            details: LAUNCHERS
          }
        })
      )
      server.publish(
        'houston-control',
        JSON.stringify({
          type: 'MISSIONS_LIST',
          payload: {
            missions: Object.keys(MISSIONS),
            details: MISSIONS
          }
        })
      )
    }
  } catch (err) {
    console.error('❌ Error loading configuration:', err)
  }
}

// Initial load
let currentLauncher: string = 'Falcon 9'
let currentMission: string = 'LEO'

let status: Record<string, string> = {}
let manualLaunchTrigger = false
let flightFinishedMet = -1
let targetLaunchDateMs: number | null = null
let irlLaunches: any[] = []
let overlayConfig: any = {
  showMission: true,
  showCountdown: true,
  showStatus: true,
  showFlightData: true,
  showChecklist: true,
  overlayScale: 100
}

let isObsConnected = false
let obsLiveStarted = false
let currentBroadcastId: string | null = null
const obs = new OBSWebSocket()

async function connectObs() {
  try {
    await obs.connect('ws://127.0.0.1:4455')
    isObsConnected = true
    console.log('🎥 Connecté à OBS Studio')
  } catch (error: any) {
    // fail silently if OBS is not running
  }
}

obs.on('ConnectionClosed', () => {
  if (isObsConnected) console.log("🎥 Déconnecté d'OBS Studio")
  isObsConnected = false
  obsLiveStarted = false
})

obs.on('StreamStateChanged', (data) => {
  obsLiveStarted = data.outputActive
})

connectObs()
setInterval(() => {
  if (!isObsConnected) connectObs()
}, 5000)

try {
  if (existsSync(OVERLAY_CONFIG_PATH)) {
    overlayConfig = { ...overlayConfig, ...JSON.parse(readFileSync(OVERLAY_CONFIG_PATH, 'utf-8')) }
  }
} catch (err) {
  console.error('❌ Failed to load overlay.json:', err)
}

async function fetchIRLLaunches() {
  try {
    console.log('🌍 Fetching IRL Launches data from TheSpaceDevs API...')
    const res = await fetch(
      'https://lldev.thespacedevs.com/2.2.0/launch/upcoming/?limit=15&mode=detailed'
    )
    const data = await res.json()
    if (data.results && data.results.length > 0) {
      const nowUnix = Math.floor(Date.now() / 1000)
      // Keep only strictly future launches
      irlLaunches = data.results.filter(
        (l: any) => Math.floor(new Date(l.net).getTime() / 1000) > nowUnix
      )
      console.log(`✅ Loaded ${irlLaunches.length} upcoming IRL launches`)
      if (server) {
        server.publish(
          'houston-control',
          JSON.stringify({
            type: 'IRL_LAUNCHES_LIST',
            payload: irlLaunches
          })
        )
      }
    }
  } catch (err) {
    console.error('❌ Failed to fetch IRL launches:', err)
  }
}

fetchIRLLaunches()
setInterval(fetchIRLLaunches, 5 * 60 * 1000) // Refresh every 5 minutes

let telemetry = {
  altitude: 0,
  distance: 0,
  velocity: 0,
  vx: 0,
  vy: 0,
  fuel: 100,
  boostersFuel: 0,
  hasBoosters: false,
  o2: 100,
  heartRate: 75,
  met: 0,
  countdown: -600, // Default to 10 mins before config load
  isCounting: false,
  hasLaunched: false,
  stage: 1,
  maxStages: 2,
  launcher: currentLauncher,
  mission: currentMission,
  liveUrl: ''
}

loadConfig()
resetMission()

// Watch for changes
watch(CONFIG_PATH, (event) => {
  if (event === 'change') {
    loadConfig()
  }
})

watch(MISSIONS_PATH, (event) => {
  if (event === 'change') {
    loadConfig()
  }
})

function resetMission() {
  const maxStages = LAUNCHERS[currentLauncher]?.stages?.length || 2
  telemetry = {
    altitude: 0,
    distance: 0,
    velocity: 0,
    vx: 0,
    vy: 0,
    fuel: 100,
    boostersFuel: LAUNCHERS[currentLauncher]?.boosters ? 100 : 0,
    hasBoosters: !!LAUNCHERS[currentLauncher]?.boosters,
    o2: 100,
    heartRate: 75,
    met: 0,
    countdown: -(LAUNCHERS[currentLauncher]?.recycleTime || 600),
    isCounting: false,
    hasLaunched: false,
    stage: 1,
    maxStages: maxStages,
    launcher: currentLauncher,
    mission: currentMission,
    liveUrl: ''
  }

  manualLaunchTrigger = false
  flightFinishedMet = -1
  targetLaunchDateMs = null
  obsLiveStarted = false

  // Dynamic status generation
  status = {
    GUIDANCE: 'WAITING',
    GROUND: 'WAITING',
    RANGE: 'WAITING',
    WEATHER: 'WAITING'
  }
  if (LAUNCHERS[currentLauncher]?.boosters) {
    status['BOOSTERS'] = 'WAITING'
  }
  for (let i = 1; i <= maxStages; i++) {
    status[`STAGE ${i}`] = 'WAITING'
    status[`S${i} FUEL`] = 'WAITING'
    status[`S${i} O2`] = 'WAITING'
  }
}

app.get('/status', (c) => c.json(status))
app.get('/telemetry', (c) => c.json(telemetry))

// ── Routes YouTube OAuth ──────────────────────────────────────────────────────
app.get('/youtube/auth', (c) => {
  const url = getAuthUrl()
  return c.redirect(url)
})

app.get('/oauth2callback', async (c) => {
  const code = c.req.query('code')
  if (!code) return c.text('Code manquant', 400)
  try {
    await handleOAuthCallback(code)
    return c.html('<h2>✅ YouTube connecté ! Vous pouvez fermer cet onglet.</h2>')
  } catch (err: any) {
    return c.text(`Erreur: ${err.message}`, 500)
  }
})

app.get('/youtube/status', (c) => {
  return c.json({ authenticated: isAuthenticated(), broadcastId: currentBroadcastId })
})

// Simulation Loop
setInterval(() => {
  const isLaunchReady = Object.values(status).every((s) => s === 'GO')

  // Auto-abort countdown if a system is no longer GO, but only if we reached or passed the recycle time
  const config = LAUNCHERS[currentLauncher]
  const recycleSeconds = config?.recycleTime || 600
  if (!isLaunchReady && !telemetry.hasLaunched && telemetry.isCounting) {
    if (telemetry.countdown >= -recycleSeconds) {
      telemetry.isCounting = false
      targetLaunchDateMs = null
    }
  }

  if (telemetry.isCounting && !telemetry.hasLaunched) {
    telemetry.countdown += 1

    // Démarrage auto du live OBS à T-30 minutes (ou au début du recycleTime si < 30min)
    if (telemetry.countdown >= -1800 && telemetry.countdown < 0 && isObsConnected && !obsLiveStarted) {
      obsLiveStarted = true

      let title = currentMission
      const isIRL = title.startsWith('IRL:')
      if (!isIRL) {
        title = `[LIVE DE TEST] ${title}`
      } else {
        title = title.replace('IRL: ', '')
      }

      ;(async () => {
        // ── 1. Créer la diffusion YouTube si authentifié ──────────────────────
        if (isAuthenticated()) {
          try {
            const broadcast = await createYouTubeLive(title, isIRL)
            currentBroadcastId = broadcast.broadcastId

            // Envoyer la stream key YouTube dans OBS
            const currentSettings = await obs.call('GetStreamServiceSettings')
            await obs.call('SetStreamServiceSettings', {
              streamServiceType: currentSettings.streamServiceType,
              streamServiceSettings: {
                ...currentSettings.streamServiceSettings,
                key: broadcast.streamKey,
                server: broadcast.ingestionAddress,
              }
            })
            console.log(`🎬 Diffusion YouTube créée et stream key injectée dans OBS`)
          } catch (err: any) {
            console.error('❌ Erreur création diffusion YouTube:', err.message)
            currentBroadcastId = null
          }
        }

        // ── 2. Mettre à jour le texte titre dans OBS ──────────────────────────
        await obs.call('CallVendorRequest', {
          vendorName: 'twitch',
          requestType: 'update_channel',
          requestData: { title }
        }).catch(() => {})

        await obs.call('SetInputSettings', {
          inputName: 'Titre Live',
          inputSettings: { text: title }
        }).catch(() => {})

        // ── 3. Mettre la source "Flight Data" en plein écran ──────────────────
        try {
          const { currentProgramSceneName } = await obs.call('GetCurrentProgramScene')
          const { sceneItems } = await obs.call('GetSceneItemList', { sceneName: currentProgramSceneName })
          const flightDataItem = sceneItems.find((item: any) =>
            item.sourceName.toLowerCase() === 'flight data' ||
            item.sourceName.toLowerCase() === 'fligth data'
          )
          if (flightDataItem) {
            await obs.call('SetInputSettings', {
              inputName: flightDataItem.sourceName,
              inputSettings: { width: 1920, height: 1080 }
            }).catch(() => {})
            await obs.call('SetSceneItemTransform', {
              sceneName: currentProgramSceneName,
              sceneItemId: flightDataItem.sceneItemId,
              sceneItemTransform: {
                positionX: 0, positionY: 0, scaleX: 1, scaleY: 1,
                boundsType: 'OBS_BOUNDS_STRETCH', boundsWidth: 1920, boundsHeight: 1080
              }
            })
          }
        } catch { /* Ignore if scene/items not found */ }

        // ── 4. Lancer le stream dans OBS ──────────────────────────────────────
        await new Promise(resolve => setTimeout(resolve, 3000))
        await obs.call('StartStream')
        console.log(`🎥 Live OBS démarré : "${title}"`)
      })().catch((err) => {
        obsLiveStarted = false
        console.error('❌ Erreur lancement live OBS:', err.message)
      })
    }

    // Affichage humain du countdown
    if (
      telemetry.countdown <= 0 &&
      (telemetry.countdown % 10 === 0 || telemetry.countdown >= -10)
    ) {
      if (!targetLaunchDateMs) targetLaunchDateMs = Date.now() - telemetry.countdown * 1000
      const launchDate = new Date(targetLaunchDateMs)
      console.log(
        `⏱️ ${formatCountdownForLog(telemetry.countdown)} (Lancement prévu le : ${launchDate.toLocaleString('fr-FR')})`
      )
    }

    if (telemetry.countdown >= 0) {
      telemetry.hasLaunched = true
      telemetry.countdown = 0
      telemetry.met = 0
      console.log(
        `\n🚀 LIFTOFF ! Décollage de ${currentLauncher} pour la mission ${currentMission}`
      )
    }
  }

  if (telemetry.hasLaunched) {
    telemetry.met += 1

    if (telemetry.met === 60) {
      console.log(
        `🌊 T+${formatMETForLog(telemetry.met)} - MAX-Q : Pression dynamique maximale atteinte !`
      )
    }
    const config = LAUNCHERS[currentLauncher] || {
      payloadMass: 10,
      stages: [{ deltaV: 3000, burnTime: 150, fuelMass: 100, dryMass: 10 }]
    }
    const stages = config.stages
    const currentStageConfig = stages[Math.min(telemetry.stage - 1, stages.length - 1)]

    // Staging Logic
    if (telemetry.fuel <= 0 && telemetry.stage < stages.length) {
      console.log(
        `🔥 T+${formatMETForLog(telemetry.met)} - MECO : Coupure du moteur de l'étage ${telemetry.stage} !`
      )
      console.log(
        `🔄 T+${formatMETForLog(telemetry.met)} - STAGE SEP : Séparation de l'étage ${telemetry.stage} confirmée !`
      )
      telemetry.stage += 1
      telemetry.fuel = 100
      telemetry.velocity += 150 // Separation kick
    }

    // Physics based on stage configuration
    // Simulate a gravity turn where pitch starts at 90 deg (pi/2) and decreases to 0
    const pitch = Math.max(0, (Math.PI / 2) * (1 - telemetry.met / 600))
    const gravity = 9.81

    if (telemetry.fuel > 0) {
      // Tsiolkovsky equation setup
      let M_init = config.payloadMass || 0
      for (let i = telemetry.stage - 1; i < stages.length; i++) {
        M_init += stages[i].dryMass + stages[i].fuelMass
      }

      let M_final = M_init - currentStageConfig.fuelMass
      // Effective exhaust velocity (Ve) derived from Delta-V
      const Ve_stage = currentStageConfig.deltaV / Math.log(M_init / M_final)
      const thrust_stage = (currentStageConfig.fuelMass / currentStageConfig.burnTime) * Ve_stage

      let totalThrust = thrust_stage

      // Calculate current mass dynamically
      let currentMass = config.payloadMass || 0
      for (let i = telemetry.stage; i < stages.length; i++) {
        currentMass += stages[i].dryMass + stages[i].fuelMass
      }
      currentMass +=
        currentStageConfig.dryMass + currentStageConfig.fuelMass * (telemetry.fuel / 100)

      if (telemetry.stage === 1 && telemetry.hasBoosters && config.boosters) {
        currentMass +=
          config.boosters.dryMass + config.boosters.fuelMass * (telemetry.boostersFuel / 100)
      }

      if (
        telemetry.stage === 1 &&
        telemetry.hasBoosters &&
        telemetry.boostersFuel > 0 &&
        config.boosters
      ) {
        let M_init_b = M_init + config.boosters.dryMass + config.boosters.fuelMass
        let M_final_b = M_init_b - config.boosters.fuelMass
        const Ve_booster = config.boosters.deltaV / Math.log(M_init_b / M_final_b)
        const thrust_booster = (config.boosters.fuelMass / config.boosters.burnTime) * Ve_booster

        totalThrust += thrust_booster
        telemetry.boostersFuel = Math.max(
          0,
          telemetry.boostersFuel - 100 / config.boosters.burnTime
        )

        if (telemetry.boostersFuel <= 0) {
          console.log(
            `💥 T+${formatMETForLog(telemetry.met)} - BECO : Extinction et séparation des boosters latéraux !`
          )
        }
      }

      // Acceleration = Thrust / Mass
      let engineAccel = totalThrust / currentMass

      // Add a little randomness
      engineAccel = (Math.random() * 0.1 + 0.95) * engineAccel

      // Vector physics
      telemetry.vx += engineAccel * Math.cos(pitch)
      telemetry.vy += engineAccel * Math.sin(pitch) - gravity * 0.1

      // Fuel consumption
      telemetry.fuel = Math.max(0, telemetry.fuel - 100 / currentStageConfig.burnTime)
    } else {
      // Drifting
      // If we are in orbit (final stage complete), gravity is counteracted by orbital velocity.
      if (telemetry.stage < stages.length || telemetry.fuel > 0) {
        telemetry.vy -= gravity * 0.1
      } else {
        // We are in orbit! Gently circularize the orbit (vy -> 0)
        telemetry.vy *= 0.95
      }
    }

    telemetry.velocity = Math.sqrt(telemetry.vx * telemetry.vx + telemetry.vy * telemetry.vy)
    telemetry.distance += telemetry.vx
    telemetry.altitude = Math.max(0, telemetry.altitude + telemetry.vy)

    telemetry.o2 = Math.max(0, telemetry.o2 - 0.01)

    // Check if flight is finished (out of fuel on final stage)
    if (telemetry.fuel <= 0 && telemetry.stage >= stages.length) {
      if (flightFinishedMet === -1) {
        flightFinishedMet = telemetry.met
        console.log(
          `🔥 T+${formatMETForLog(telemetry.met)} - SECO : Coupure du moteur du dernier étage !`
        )
        console.log(
          `✨ T+${formatMETForLog(telemetry.met)} - ORBIT : Insertion en orbite réussie !`
        )
        console.log(
          `🏁 Flight finished! Orbit reached at MET ${formatMETForLog(telemetry.met)}. Resetting in 10s...\n`
        )

        if (isObsConnected && obsLiveStarted) {
          obs.call('StopStream').then(async () => {
            console.log(`⏹️ Arrêt automatique du live OBS (Fin de mission)`)
            obsLiveStarted = false
            // Terminer la diffusion YouTube si elle a été créée par nous
            if (currentBroadcastId) {
              await endYouTubeLive(currentBroadcastId)
              currentBroadcastId = null
            }
          }).catch((err) => {
            console.error('❌ Erreur arrêt live OBS:', err.message)
          })
        }
      } else if (telemetry.met >= flightFinishedMet + 10) {
        console.log(`🔄 Automatically resetting mission...`)
        // If it was an IRL sync, reset the mission name to default to prevent loop
        if (currentMission.startsWith('IRL:')) {
          currentMission = 'LEO'
        }
        resetMission()
        if (server) {
          server.publish(
            'houston-control',
            JSON.stringify({
              type: 'STATUS_UPDATE',
              payload: status
            })
          )
          server.publish(
            'houston-control',
            JSON.stringify({
              type: 'TELEMETRY',
              payload: telemetry
            })
          )
        }
        return // skip heart rate update this tick
      }
    }
  }

  telemetry.heartRate = 70 + Math.floor(Math.random() * 15)
}, 1000)

function formatMETForLog(seconds: number) {
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatCountdownForLog(seconds: number) {
  const absSeconds = Math.abs(seconds)
  const d = Math.floor(absSeconds / 86400)
  const h = Math.floor((absSeconds % 86400) / 3600)
  const m = Math.floor((absSeconds % 3600) / 60)
  const s = absSeconds % 60

  const sign = seconds <= 0 ? 'T-' : 'T+'

  let result = ''
  if (d > 0) {
    result = `${d}d ${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`
  } else if (h > 0) {
    result = `${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`
  } else if (m > 0) {
    result = `${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`
  } else {
    result = `${s}s`
  }

  return `${sign}${result}`
}

// WebSocket with Bun
server = Bun.serve({
  port: 3001,
  fetch(req, server) {
    if (server.upgrade(req)) {
      return
    }
    return app.fetch(req)
  },
  websocket: {
    open(ws) {
      console.log('Client connected')
      ws.subscribe('houston-control')
      ws.send(
        JSON.stringify({
          type: 'LAUNCHERS_LIST',
          payload: {
            launchers: Object.keys(LAUNCHERS),
            details: LAUNCHERS
          }
        })
      )
      ws.send(
        JSON.stringify({
          type: 'MISSIONS_LIST',
          payload: {
            missions: Object.keys(MISSIONS),
            details: MISSIONS
          }
        })
      )
      ws.send(
        JSON.stringify({
          type: 'STATUS_UPDATE',
          payload: status
        })
      )
      ws.send(
        JSON.stringify({
          type: 'IRL_LAUNCHES_LIST',
          payload: irlLaunches
        })
      )
      ws.send(
        JSON.stringify({
          type: 'TELEMETRY',
          payload: telemetry
        })
      )
      ws.send(
        JSON.stringify({
          type: 'OVERLAY_CONFIG',
          payload: overlayConfig
        })
      )
    },
    message(ws, message) {
      const data = JSON.parse(message)
      if (data.type === 'GO_NO_GO') {
        const { system, status: newStatus } = data.payload
        // @ts-ignore
        status[system] = newStatus
        const payloadStr = JSON.stringify({
          type: 'STATUS_UPDATE',
          payload: status
        })
        ws.send(payloadStr)
        server.publish('houston-control', payloadStr)
      } else if (data.type === 'START_COUNTDOWN') {
        const isLaunchReady = Object.values(status).every((s) => s === 'GO')
        if (isLaunchReady) {
          // Apply recycle time if the countdown was held and is now less than recycle time
          const config = LAUNCHERS[currentLauncher]
          const recycleSeconds = config?.recycleTime || 600 // default 10 minutes
          // If countdown is closer to 0 than -recycleSeconds, recycle it back to -recycleSeconds
          if (telemetry.countdown > -recycleSeconds && telemetry.countdown < 0) {
            telemetry.countdown = -recycleSeconds
            console.log(`⏱️ Countdown recycled to ${formatCountdownForLog(-recycleSeconds)}`)
          }

          telemetry.isCounting = true
          targetLaunchDateMs = Date.now() - telemetry.countdown * 1000
          console.log('🏁 Countdown manual trigger received')
          const launchDate = new Date(targetLaunchDateMs)
          console.log(`📅 Lancement prévu le : ${launchDate.toLocaleString('fr-FR')}`)
        }
      } else if (data.type === 'HOLD_COUNTDOWN') {
        telemetry.isCounting = false
        targetLaunchDateMs = null
        console.log('⏸ Countdown hold manual trigger received')
      } else if (data.type === 'SELECT_LAUNCHER') {
        currentLauncher = data.payload as keyof typeof LAUNCHERS
        resetMission()
        const statusPayloadStr = JSON.stringify({
          type: 'STATUS_UPDATE',
          payload: status
        })
        ws.send(statusPayloadStr)
        server.publish('houston-control', statusPayloadStr)

        const telemetryPayloadStr = JSON.stringify({
          type: 'TELEMETRY',
          payload: telemetry
        })
        ws.send(telemetryPayloadStr)
        server.publish('houston-control', telemetryPayloadStr)
      } else if (data.type === 'UPDATE_OVERLAY') {
        overlayConfig = { ...overlayConfig, ...data.payload }
        try {
          writeFileSync(OVERLAY_CONFIG_PATH, JSON.stringify(overlayConfig, null, 2))
        } catch (err) {
          console.error('❌ Failed to save overlay.json:', err)
        }
        const configPayloadStr = JSON.stringify({
          type: 'OVERLAY_CONFIG',
          payload: overlayConfig
        })
        ws.send(configPayloadStr)
        server.publish('houston-control', configPayloadStr)
      } else if (data.type === 'SELECT_MISSION') {
        currentMission = data.payload as string
        resetMission()
        const statusPayloadStr = JSON.stringify({
          type: 'STATUS_UPDATE',
          payload: status
        })
        ws.send(statusPayloadStr)
        server.publish('houston-control', statusPayloadStr)

        const telemetryPayloadStr = JSON.stringify({
          type: 'TELEMETRY',
          payload: telemetry
        })
        ws.send(telemetryPayloadStr)
        server.publish('houston-control', telemetryPayloadStr)
      } else if (data.type === 'SYNC_IRL') {
        const launchId = data.payload
        let launch = irlLaunches[0]
        if (launchId) {
          launch = irlLaunches.find((l: any) => l.id === launchId) || launch
        }

        if (!launch) {
          console.error('❌ No IRL launch available to sync')
          return
        }

        const nowUnix = Math.floor(Date.now() / 1000)
        let launchDateUnix = Math.floor(new Date(launch.net).getTime() / 1000)
        const diffSeconds = nowUnix - launchDateUnix

        if (launch.rocket && launch.rocket.configuration && launch.rocket.configuration.name) {
          // Try to match the exact name, or just use it even if not in DB (will fallback to 2 stages)
          currentLauncher = launch.rocket.configuration.name
        }

        resetMission()
        currentMission = `IRL: ${launch.name}`
        telemetry.mission = currentMission
        telemetry.countdown = diffSeconds
        telemetry.isCounting = true
        telemetry.hasLaunched = diffSeconds >= 0
        telemetry.met = diffSeconds >= 0 ? diffSeconds : 0

        let liveUrl = ''
        if (launch.vidURLs && launch.vidURLs.length > 0) {
          const tw = launch.vidURLs.find(
            (v: any) => v.url.includes('twitter.com') || v.url.includes('x.com')
          )
          const yt = launch.vidURLs.find(
            (v: any) => v.url.includes('youtube') || v.url.includes('youtu.be')
          )

          if (tw) {
            liveUrl = tw.url
          } else if (yt) {
            // Extract video ID and format as embed URL
            const match = yt.url.match(
              /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/
            )
            if (match && match[1]) {
              liveUrl = `https://www.youtube.com/embed/${match[1]}?autoplay=1&mute=1`
            } else {
              liveUrl = yt.url
            }
          } else {
            // Just give the first URL if not youtube or twitter
            liveUrl = launch.vidURLs[0].url
          }
        } else {
          // Fallback to youtube search if no video URL is provided yet
          liveUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(launch.name + ' live stream')}`
        }
        telemetry.liveUrl = liveUrl

        // Set all systems to GO for an IRL launch
        for (let key in status) {
          status[key] = 'GO'
        }

        targetLaunchDateMs = Date.now() - diffSeconds * 1000
        const launchDate = new Date(targetLaunchDateMs)
        console.log(
          `✅ Synced with IRL Launch: ${launch.name} (Countdown: ${formatCountdownForLog(diffSeconds)} - Prévu le: ${launchDate.toLocaleString('fr-FR')})`
        )

        const statusPayloadStr = JSON.stringify({
          type: 'STATUS_UPDATE',
          payload: status
        })
        ws.send(statusPayloadStr)
        server.publish('houston-control', statusPayloadStr)

        const telemetryPayloadStr = JSON.stringify({
          type: 'TELEMETRY',
          payload: telemetry
        })
        ws.send(telemetryPayloadStr)
        server.publish('houston-control', telemetryPayloadStr)
      }
    }
  }
})

// Broadcast Loop
setInterval(() => {
  server.publish(
    'houston-control',
    JSON.stringify({
      type: 'TELEMETRY',
      payload: telemetry
    })
  )
}, 1000)

console.log(`🚀 Houston Server (Hono/Bun) running on port 3001`)
