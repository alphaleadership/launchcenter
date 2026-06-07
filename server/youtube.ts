import { google } from 'googleapis'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

const CLIENT_ID = process.env.YOUTUBE_CLIENT_ID || ''
const CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET || ''
const REDIRECT_URI = 'http://localhost:3001/oauth2callback'
const TOKEN_PATH = join(import.meta.dir, 'youtube_token.json')
const SCOPES = ['https://www.googleapis.com/auth/youtube']

export const oauth2Client = new (google.auth.OAuth2 as any)(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI)

if (existsSync(TOKEN_PATH)) {
  try {
    const token = JSON.parse(readFileSync(TOKEN_PATH, 'utf-8'))
    oauth2Client.setCredentials(token)
    console.log('YouTube token loaded from disk')
  } catch {
    console.warn('Cannot load YouTube token')
  }
}

oauth2Client.on('tokens', (tokens: any) => {
  const existing = existsSync(TOKEN_PATH) ? JSON.parse(readFileSync(TOKEN_PATH, 'utf-8')) : {}
  writeFileSync(TOKEN_PATH, JSON.stringify({ ...existing, ...tokens }, null, 2))
})

export const youtube = google.youtube({ version: 'v3', auth: oauth2Client })

export function getAuthUrl(): string {
  return oauth2Client.generateAuthUrl({ access_type: 'offline', prompt: 'consent', scope: SCOPES })
}

export function isAuthenticated(): boolean {
  const creds = oauth2Client.credentials
  return !!(creds?.access_token || creds?.refresh_token)
}

export async function handleOAuthCallback(code: string): Promise<void> {
  const { tokens } = await oauth2Client.getToken(code)
  oauth2Client.setCredentials(tokens)
  writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2))
}

export interface BroadcastResult {
  broadcastId: string
  streamKey: string
  streamId: string
  ingestionAddress: string
}

export async function createYouTubeLive(title: string, isPublic: boolean): Promise<BroadcastResult> {
  const privacy = isPublic ? 'public' : 'unlisted'
  const scheduledStartTime = new Date(Date.now() + 60 * 1000).toISOString()

  const broadcastRes = await youtube.liveBroadcasts.insert({
    part: ['snippet', 'status', 'contentDetails'],
    requestBody: {
      snippet: { title, scheduledStartTime, description: 'Live automatique depuis LaunchCenter' },
      status: { privacyStatus: privacy, selfDeclaredMadeForKids: false },
      contentDetails: { enableAutoStart: true, enableAutoStop: true, enableDvr: true, recordFromStart: true },
    },
  })

  const broadcastId = broadcastRes.data.id!

  const streamRes = await youtube.liveStreams.insert({
    part: ['snippet', 'cdn', 'contentDetails'],
    requestBody: {
      snippet: { title },
      cdn: { frameRate: 'variable', ingestionType: 'rtmp', resolution: 'variable' },
      contentDetails: { isReusable: false },
    },
  })

  const streamId = streamRes.data.id!
  const streamKey = streamRes.data.cdn?.ingestionInfo?.streamName!
  const ingestionAddress = streamRes.data.cdn?.ingestionInfo?.ingestionAddress!

  await youtube.liveBroadcasts.bind({ id: broadcastId, part: ['id', 'contentDetails'], streamId })

  console.log(`YouTube live created: ${title} (${privacy}) - ID: ${broadcastId}`)
  return { broadcastId, streamKey, streamId, ingestionAddress }
}

export async function endYouTubeLive(broadcastId: string): Promise<void> {
  try {
    await youtube.liveBroadcasts.transition({
      broadcastStatus: 'complete', id: broadcastId, part: ['id', 'status'],
    })
    console.log(`YouTube live ended: ${broadcastId}`)
  } catch (err: any) {
    console.error('Error ending YouTube live:', err.message)
  }
}
