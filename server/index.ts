import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/bun'
import { readFileSync, watch } from 'fs'
import { join } from 'path'

const app = new Hono()
app.use('/status/*', cors())
app.use('/telemetry/*', cors())

// Serve static files from the React app build
app.use('/*', serveStatic({ root: '../client/dist' }))
// Fallback for SPA routing
app.get('*', serveStatic({ path: '../client/dist/index.html' }))
const CONFIG_PATH = join(import.meta.dir, 'launchers.json')
const MISSIONS_PATH = join(import.meta.dir, 'missions.json')
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
            server.publish('houston-control', JSON.stringify({
                type: 'LAUNCHERS_LIST',
                payload: Object.keys(LAUNCHERS)
            }))
            server.publish('houston-control', JSON.stringify({
                type: 'MISSIONS_LIST',
                payload: {
                    missions: Object.keys(MISSIONS),
                    details: MISSIONS
                }
            }))
        }
    } catch (err) {
        console.error('❌ Error loading configuration:', err)
    }
}

// Initial load
let currentLauncher: string = 'Falcon 9'
let currentMission: string = 'LEO'

let status: Record<string, string> = {}
let manualLaunchTrigger = false;
let flightFinishedMet = -1;

let telemetry = {
    altitude: 0,
    velocity: 0,
    fuel: 100,
    o2: 100,
    heartRate: 75,
    met: 0,
    countdown: -30, // T-minus 30 seconds
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
        velocity: 0,
        fuel: 100,
        o2: 100,
        heartRate: 75,
        met: 0,
        countdown: -30,
        isCounting: false,
        hasLaunched: false,
        stage: 1,
        maxStages: maxStages,
        launcher: currentLauncher,
        mission: currentMission,
        liveUrl: ''
    }
    
    manualLaunchTrigger = false;
    flightFinishedMet = -1;
    
    // Dynamic status generation
    status = {
        'GUIDANCE': 'WAITING',
        'GROUND': 'WAITING'
    }
    for (let i = 1; i <= maxStages; i++) {
        status[`STAGE ${i}`] = 'WAITING'
        status[`S${i} FUEL`] = 'WAITING'
        status[`S${i} O2`] = 'WAITING'
    }
}

app.get('/status', (c) => c.json(status))
app.get('/telemetry', (c) => c.json(telemetry))

// Simulation Loop
setInterval(() => {
    const isLaunchReady = Object.values(status).every(s => s === 'GO')
    
    // Auto-abort countdown if a system is no longer GO
    if (!isLaunchReady && !telemetry.hasLaunched && telemetry.isCounting) {
        telemetry.isCounting = false
    }

    if (telemetry.isCounting && !telemetry.hasLaunched) {
        telemetry.countdown += 1
        if (telemetry.countdown >= 0) {
            telemetry.hasLaunched = true
            telemetry.countdown = 0
            telemetry.met = 0
        }
    }

    if (telemetry.hasLaunched) {
        telemetry.met += 1
        const config = LAUNCHERS[currentLauncher]
        // Safe access to stages array in case config is invalid
        const stages = config?.stages || [{ accel: 50, burn: 5 }]
        const currentStageConfig = stages[Math.min(telemetry.stage - 1, stages.length - 1)]
        
        // Staging Logic
        if (telemetry.fuel <= 0 && telemetry.stage < stages.length) {
            telemetry.stage += 1
            telemetry.fuel = 100
            telemetry.velocity += 150 // Separation kick
        }

        // Physics based on stage configuration
        if (telemetry.fuel > 0) {
            telemetry.altitude += Math.random() * 500 + (telemetry.velocity * 0.1)
            telemetry.velocity += Math.random() * currentStageConfig.accel + 20
            
            // Fuel consumption
            telemetry.fuel = Math.max(0, telemetry.fuel - currentStageConfig.burn)
        } else {
            // Drifting (or falling if gravity was implemented)
            telemetry.altitude += telemetry.velocity * 0.1
        }
        
        telemetry.o2 = Math.max(0, telemetry.o2 - 0.01)

        // Check if flight is finished (out of fuel on final stage)
        if (telemetry.fuel <= 0 && telemetry.stage >= stages.length) {
            if (flightFinishedMet === -1) {
                flightFinishedMet = telemetry.met;
                console.log(`🏁 Flight finished! Orbit reached at MET ${formatMETForLog(telemetry.met)}. Resetting in 10s...`);
            } else if (telemetry.met >= flightFinishedMet + 10) {
                console.log(`🔄 Automatically resetting mission...`);
                // If it was an IRL sync, reset the mission name to default to prevent loop
                if (currentMission.startsWith('IRL:')) {
                    currentMission = 'LEO'
                }
                resetMission();
                if (server) {
                    server.publish('houston-control', JSON.stringify({
                        type: 'STATUS_UPDATE',
                        payload: status
                    }))
                    server.publish('houston-control', JSON.stringify({
                        type: 'TELEMETRY',
                        payload: telemetry
                    }))
                }
                return; // skip heart rate update this tick
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

// WebSocket with Bun
server = Bun.serve({
  port: 3001,
  fetch(req, server) {
    if (server.upgrade(req)) {
      return;
    }
    return app.fetch(req);
  },
  websocket: {
    open(ws) {
      console.log('Client connected')
      ws.subscribe('houston-control')
      ws.send(JSON.stringify({
          type: 'LAUNCHERS_LIST',
          payload: {
              launchers: Object.keys(LAUNCHERS),
              details: LAUNCHERS
          }
      }))
      ws.send(JSON.stringify({
          type: 'MISSIONS_LIST',
          payload: {
              missions: Object.keys(MISSIONS),
              details: MISSIONS
          }
      }))
      ws.send(JSON.stringify({
          type: 'STATUS_UPDATE',
          payload: status
      }))
      ws.send(JSON.stringify({
          type: 'TELEMETRY',
          payload: telemetry
      }))
    },
    message(ws, message) {
      const data = JSON.parse(message)
      if (data.type === 'GO_NO_GO') {
        const { system, status: newStatus } = data.payload
        // @ts-ignore
        status[system] = newStatus
        server.publish('houston-control', JSON.stringify({
          type: 'STATUS_UPDATE',
          payload: status
        }))
      } else if (data.type === 'START_COUNTDOWN') {
        const isLaunchReady = Object.values(status).every(s => s === 'GO')
        if (isLaunchReady) {
            telemetry.isCounting = true
            console.log('🏁 Countdown manual trigger received')
        }
      } else if (data.type === 'HOLD_COUNTDOWN') {
        telemetry.isCounting = false
        console.log('⏸ Countdown hold manual trigger received')
      } else if (data.type === 'SELECT_LAUNCHER') {
          currentLauncher = data.payload as keyof typeof LAUNCHERS
          resetMission()
          server.publish('houston-control', JSON.stringify({
              type: 'STATUS_UPDATE',
              payload: status
          }))
          server.publish('houston-control', JSON.stringify({
              type: 'TELEMETRY',
              payload: telemetry
          }))
      } else if (data.type === 'SELECT_MISSION') {
          currentMission = data.payload as string
          resetMission()
          server.publish('houston-control', JSON.stringify({
              type: 'STATUS_UPDATE',
              payload: status
          }))
          server.publish('houston-control', JSON.stringify({
              type: 'TELEMETRY',
              payload: telemetry
          }))
      } else if (data.type === 'SYNC_IRL') {
          console.log('🌍 Fetching IRL Launch data from TheSpaceDevs API...')
          fetch('https://lldev.thespacedevs.com/2.2.0/launch/upcoming/?limit=5&mode=detailed')
            .then(res => res.json())
            .then((data: any) => {
                if (!data.results || data.results.length === 0) return;
                
                const nowUnix = Math.floor(Date.now() / 1000)
                let launch = data.results[0]
                let launchDateUnix = Math.floor(new Date(launch.net).getTime() / 1000)
                
                // Find the first launch that is actually in the future
                for (const l of data.results) {
                    const lDateUnix = Math.floor(new Date(l.net).getTime() / 1000)
                    if (lDateUnix > nowUnix) {
                        launch = l
                        launchDateUnix = lDateUnix
                        break
                    }
                }
                const diffSeconds = nowUnix - launchDateUnix
                
                resetMission()
                currentMission = `IRL: ${launch.name}`
                telemetry.mission = currentMission
                telemetry.countdown = diffSeconds
                telemetry.isCounting = true
                telemetry.hasLaunched = diffSeconds >= 0
                telemetry.met = diffSeconds >= 0 ? diffSeconds : 0

                let liveUrl = ''
                if (launch.vidURLs && launch.vidURLs.length > 0) {
                    const tw = launch.vidURLs.find((v: any) => v.url.includes('twitter.com') || v.url.includes('x.com'))
                    const yt = launch.vidURLs.find((v: any) => v.url.includes('youtube') || v.url.includes('youtu.be'))
                    
                    if (tw) {
                        liveUrl = tw.url
                    } else if (yt) {
                        // Extract video ID and format as embed URL
                        const match = yt.url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/)
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
                
                console.log(`✅ Synced with IRL Launch: ${launch.name} (Countdown: ${diffSeconds}s)`)
                
                server.publish('houston-control', JSON.stringify({
                    type: 'STATUS_UPDATE',
                    payload: status
                }))
                server.publish('houston-control', JSON.stringify({
                    type: 'TELEMETRY',
                    payload: telemetry
                }))
            })
            .catch(err => console.error('❌ Failed to fetch IRL launch:', err))
      }
    }
  }
})

// Broadcast Loop
setInterval(() => {
    server.publish('houston-control', JSON.stringify({
        type: 'TELEMETRY',
        payload: telemetry
    }))
}, 1000)

console.log(`🚀 Houston Server (Hono/Bun) running on port 3001`)