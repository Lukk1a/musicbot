// apps/web/src/components/SpotifyPlayerBar.tsx
'use client'

import React, { useState, useEffect } from 'react'
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Shuffle,
  Repeat,
  Repeat1,
  Square,
  Volume2,
  VolumeX,
  Radio,
  Wifi,
  WifiOff,
} from 'lucide-react'
import type { GuildPlayerState } from '@musicbot/shared'
import type { ControlActionInput } from '@/hooks/useGuildPlayer'
import { formatTime } from '@/lib/utils'

interface SpotifyPlayerBarProps {
  playerState: GuildPlayerState
  interpolatedPosition: number
  sendControl: (action: ControlActionInput) => Promise<boolean | void>
  isConnected: boolean
  isActionLoading: boolean
}

export function SpotifyPlayerBar({
  playerState,
  interpolatedPosition,
  sendControl,
  isConnected,
  isActionLoading,
}: SpotifyPlayerBarProps) {
  const currentTrack = playerState.currentTrack
  const duration = currentTrack?.durationMS || 0
  const progressPercent = duration > 0 ? Math.min(100, (interpolatedPosition / duration) * 100) : 0

  const [isSeeking, setIsSeeking] = useState(false)
  const [seekValue, setSeekValue] = useState(0)
  const [localVolume, setLocalVolume] = useState(playerState.volume || 100)
  const [isMuted, setIsMuted] = useState(false)
  const [prevVolume, setPrevVolume] = useState(100)

  useEffect(() => {
    if (!isSeeking) {
      setSeekValue(interpolatedPosition)
    }
  }, [interpolatedPosition, isSeeking])

  useEffect(() => {
    setLocalVolume(playerState.volume ?? 100)
  }, [playerState.volume])

  const handleSeekCommit = async () => {
    setIsSeeking(false)
    await sendControl({ action: 'seek', positionMS: seekValue })
  }

  const handleVolumeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value)
    setLocalVolume(val)
    if (val > 0) setIsMuted(false)
  }

  const handleVolumeCommit = async () => {
    await sendControl({ action: 'volume', value: localVolume })
  }

  const handleMuteToggle = async () => {
    if (isMuted) {
      setIsMuted(false)
      const restored = prevVolume || 50
      setLocalVolume(restored)
      await sendControl({ action: 'volume', value: restored })
    } else {
      setPrevVolume(localVolume)
      setIsMuted(true)
      setLocalVolume(0)
      await sendControl({ action: 'volume', value: 0 })
    }
  }

  const cycleRepeatMode = async () => {
    const nextMode = ((playerState.repeatMode + 1) % 4) as 0 | 1 | 2 | 3
    await sendControl({ action: 'loop', mode: nextMode })
  }

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-50 h-24 bg-[#0c0c0e]/95 backdrop-blur-md border-t border-[#222226] px-4 md:px-6 flex items-center justify-between text-white select-none">
      {/* LEFT: Track Info */}
      <div className="flex items-center gap-3 w-1/4 min-w-[180px] max-w-[320px]">
        {currentTrack ? (
          <>
            <img
              src={currentTrack.thumbnail || '/placeholder-album.png'}
              alt={currentTrack.title}
              className="w-14 h-14 rounded-md object-cover ring-1 ring-zinc-800 shadow-sm shrink-0"
            />
            <div className="min-w-0 flex flex-col justify-center">
              <span className="text-sm font-medium text-white truncate hover:underline cursor-pointer">
                {currentTrack.title}
              </span>
              <span className="text-xs text-zinc-400 truncate hover:text-white cursor-pointer mt-0.5">
                {currentTrack.author}
              </span>
              {currentTrack.requestedBy && (
                <div className="flex items-center gap-1.5 mt-1">
                  {currentTrack.requestedBy.avatar && (
                    <img
                      src={currentTrack.requestedBy.avatar}
                      alt={currentTrack.requestedBy.username}
                      className="w-3.5 h-3.5 rounded-full object-cover"
                    />
                  )}
                  <span className="text-[10px] text-zinc-500 truncate">
                    {currentTrack.requestedBy.username}
                  </span>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-3 text-zinc-500 text-xs">
            <div className="w-14 h-14 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
              <Radio className="w-5 h-5 text-zinc-600" />
            </div>
            <span>No track currently playing</span>
          </div>
        )}
      </div>

      {/* CENTER: Transport Controls & Scrubber */}
      <div className="flex flex-col items-center justify-center flex-1 max-w-2xl px-4">
        {/* Buttons Row */}
        <div className="flex items-center gap-4 mb-1">
          {/* Shuffle */}
          <button
            onClick={() => sendControl({ action: 'shuffle' })}
            disabled={isActionLoading || (playerState?.queue?.length ?? 0) === 0}
            className="p-1.5 rounded-full text-zinc-400 hover:text-white transition-colors disabled:opacity-30"
            title="Shuffle queue"
          >
            <Shuffle className="w-4 h-4" />
          </button>

          {/* Previous / Restart */}
          <button
            onClick={() => sendControl({ action: 'seek', positionMS: 0 })}
            disabled={isActionLoading || !currentTrack}
            className="p-1.5 rounded-full text-zinc-300 hover:text-white transition-colors disabled:opacity-30"
            title="Restart track"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          {/* Play / Pause (Main Button) */}
          <button
            onClick={() => {
              if (playerState.isPlaying && !playerState.isPaused) {
                sendControl({ action: 'pause' })
              } else {
                sendControl({ action: 'resume' })
              }
            }}
            disabled={isActionLoading || !currentTrack}
            className="w-9 h-9 rounded-full bg-white hover:bg-zinc-200 text-black flex items-center justify-center transition-transform hover:scale-105 active:scale-95 disabled:opacity-30 shadow-md"
            title={playerState.isPlaying && !playerState.isPaused ? 'Pause' : 'Play'}
          >
            {playerState.isPlaying && !playerState.isPaused ? (
              <Pause className="w-4 h-4 fill-black" />
            ) : (
              <Play className="w-4 h-4 fill-black ml-0.5" />
            )}
          </button>

          {/* Skip Next */}
          <button
            onClick={() => sendControl({ action: 'skip' })}
            disabled={isActionLoading || !currentTrack}
            className="p-1.5 rounded-full text-zinc-300 hover:text-white transition-colors disabled:opacity-30"
            title="Skip track"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          {/* Repeat Mode */}
          <button
            onClick={cycleRepeatMode}
            disabled={isActionLoading}
            className={`p-1.5 rounded-full transition-colors relative ${
              playerState.repeatMode > 0 ? 'text-[#1DB954]' : 'text-zinc-400 hover:text-white'
            }`}
            title={`Repeat mode: ${
              playerState.repeatMode === 1
                ? 'Track'
                : playerState.repeatMode === 2
                ? 'Queue'
                : playerState.repeatMode === 3
                ? 'Autoplay'
                : 'Off'
            }`}
          >
            {playerState.repeatMode === 1 ? (
              <Repeat1 className="w-4 h-4" />
            ) : (
              <Repeat className="w-4 h-4" />
            )}
            {playerState.repeatMode > 0 && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#1DB954]" />
            )}
          </button>

          {/* Stop */}
          <button
            onClick={() => sendControl({ action: 'stop' })}
            disabled={isActionLoading || !playerState.isPlaying}
            className="p-1.5 rounded-full text-zinc-500 hover:text-red-400 transition-colors disabled:opacity-30"
            title="Stop playback and clear queue"
          >
            <Square className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Scrubber Progress Row */}
        <div className="w-full flex items-center gap-3">
          <span className="text-[11px] font-mono text-zinc-400 w-10 text-right">
            {formatTime(isSeeking ? seekValue : interpolatedPosition)}
          </span>

          <div className="relative flex-1 group flex items-center">
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={isSeeking ? seekValue : interpolatedPosition}
              disabled={!currentTrack || duration <= 0}
              onChange={(e) => {
                setIsSeeking(true)
                setSeekValue(Number(e.target.value))
              }}
              onMouseUp={handleSeekCommit}
              onTouchEnd={handleSeekCommit}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-zinc-800 accent-white group-hover:accent-[#1DB954] transition-colors"
            />
          </div>

          <span className="text-[11px] font-mono text-zinc-400 w-10 text-left">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* RIGHT: Voice & Volume & Socket Status */}
      <div className="flex items-center justify-end gap-4 w-1/4 min-w-[180px] max-w-[320px]">
        {/* Voice Channel Status */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs">
          {playerState.voiceChannelName ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-zinc-300 font-medium truncate max-w-[110px]">
                {playerState.voiceChannelName}
              </span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-zinc-600" />
              <span className="text-zinc-500">Not in Voice</span>
            </>
          )}
        </div>

        {/* Volume Slider */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleMuteToggle}
            className="text-zinc-400 hover:text-white transition-colors"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted || localVolume === 0 ? (
              <VolumeX className="w-4 h-4 text-zinc-500" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>

          <input
            type="range"
            min={0}
            max={100}
            value={localVolume}
            onChange={handleVolumeChange}
            onMouseUp={handleVolumeCommit}
            onTouchEnd={handleVolumeCommit}
            className="w-20 sm:w-24 h-1.5 rounded-full bg-zinc-800 appearance-none cursor-pointer accent-white hover:accent-[#1DB954]"
            title={`Volume: ${localVolume}%`}
          />
        </div>

        {/* Live Socket Status Dot */}
        <div
          className="flex items-center"
          title={isConnected ? 'Live WebSocket connected' : 'Connecting to bot...'}
        >
          {isConnected ? (
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <WifiOff className="w-3.5 h-3.5 text-amber-500" />
          )}
        </div>
      </div>
    </footer>
  )
}
