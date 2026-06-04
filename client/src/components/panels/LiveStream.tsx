import React from 'react'
import { useTelemetry } from '../../context/TelemetryContext'
import { Tweet } from 'react-tweet'

export const LiveStream: React.FC = () => {
  const { telemetry } = useTelemetry()

  if (!telemetry.liveUrl) {
    return (
      <div className="p-3 bg-black/50 h-full flex flex-col items-center justify-center overflow-hidden">
        <h2 className="text-sm font-bold mb-3 border-b border-houston-muted pb-1 w-full text-center">
          OFFICIAL LIVESTREAM
        </h2>
        <div className="text-houston-muted text-xs text-center">
          <p>NO SIGNAL / STANDBY</p>
          <p className="mt-2 text-[10px]">(Sync IRL launch to fetch webcast)</p>
        </div>
      </div>
    )
  }

  const isEmbed = telemetry.liveUrl.includes('embed')
  const isTwitter = telemetry.liveUrl.includes('twitter.com') || telemetry.liveUrl.includes('x.com')

  let tweetId = ''
  if (isTwitter) {
    const match = telemetry.liveUrl.match(/status\/(\d+)/)
    if (match && match[1]) {
      tweetId = match[1]
    }
  }

  return (
    <div className="bg-black h-full flex flex-col overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full z-10 px-3 py-1 bg-gradient-to-b from-black/80 to-transparent flex justify-between items-center pointer-events-none">
        <h2 className="text-sm font-bold text-[#00ff41] drop-shadow-md">LIVE BROADCAST</h2>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-xs font-bold text-red-500 drop-shadow-md">LIVE</span>
        </div>
      </div>

      {isEmbed ? (
        <iframe
          className="w-full h-full border-0"
          src={telemetry.liveUrl}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : tweetId ? (
        <div
          className="flex-1 flex flex-col items-center justify-center p-4 overflow-y-auto w-full pt-10"
          data-theme="dark"
        >
          <Tweet id={tweetId} />
        </div>
      ) : telemetry.liveUrl.includes('youtube.com/results') ? (
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <p className="text-houston-green mb-4 text-center text-sm font-bold">
            NO OFFICIAL LINK PROVIDED YET
          </p>
          <p className="text-houston-muted mb-6 text-center text-xs">
            The API hasn't provided a live video URL for this upcoming launch.
          </p>
          <a
            href={telemetry.liveUrl}
            target="_blank"
            rel="noreferrer"
            className="px-6 py-3 border-2 border-yellow-500 bg-yellow-500/10 hover:bg-yellow-500/30 transition-all font-bold text-xs text-center text-yellow-500"
          >
            🔍 SEARCH YOUTUBE FOR LIVE STREAM
          </a>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <p className="text-houston-green mb-4 text-center text-sm">
            EXTERNAL LIVESTREAM DETECTED
          </p>
          <a
            href={telemetry.liveUrl}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 border border-[#00ff41] bg-[#00ff41]/10 hover:bg-[#00ff41]/30 transition-all font-bold text-xs text-center"
          >
            OPEN STREAM IN NEW TAB
          </a>
        </div>
      )}
    </div>
  )
}
