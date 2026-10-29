// apps/web/src/components/PlayerCard.tsx
'use client'

import { useState } from 'react'
import {
  Play,
  Pause,
  SkipForward,
  Square,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  Volume1,
  Radio,
  User,
  Music,
} from 'lucide-react'
import { formatTime, cn } from '@/lib/utils'
import type { GuildPlayerState } from '@musicbot/shared'
import type { ControlActionInput } from '@/hooks/useGuildPlayer'

interface PlayerCardProps {
  playerState: GuildPlayerState
  position: number
  isActionLoading: boolean
  onAction: (action: ControlActionInput) => Promise<boolean>
}

export function PlayerCard({
  playerState,
  position,
  isActionLoading,
  onAction,
}: PlayerCardProps) {
  const [isSeeking, setIsSeeking] = useState(false)
  const [seekValue, setSeekValue] = useState(0)
  const [prevVolume, setPrevVolume] = useState(100)

  const current = playerState.currentTrack
  const duration = current?.durationMS || playerState.duration || 1
  const displayPosition = isSeeking ? seekValue : position
  const progressPercent = Math.min(100, Math.max(0, (displayPosition / duration) * 100))

  const handleSeekCommit = () => {
    setIsSeeking(false)
    onAction({ action: 'seek', positionMS: seekValue })
  }

  const handleTogglePlay = () => {
    if (playerState.isPaused) {
      onAction({ action: 'resume' })
    } else {
      onAction({ action: 'pause' })
    }
  }

  const handleToggleLoop = () => {
    const nextMode = ((playerState.repeatMode + 1) % 4) as 0 | 1 | 2 | 3
    onAction({ action: 'loop', mode: nextMode })
  }

  const handleToggleMute = () => {
    if (playerState.volume > 0) {
      setPrevVolume(playerState.volume)
      onAction({ action: 'volume', value: 0 })
    } else {
      onAction({ action: 'volume', value: prevVolume || 100 })
    }
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border bg-surface p-6 shadow-2xl flex flex-col gap-6">
      {/* Background ambient glow from artwork */}
      {current?.thumbnail && (
        <div
          className="absolute -top-24 -left-24 w-96 h-96 rounded-full blur-[100px] opacity-20 pointer-events-none"
          style={{ backgroundImage: `url(${current.thumbnail})`, backgroundSize: 'cover' }}
        />
      )}

      {/* Top Header: Voice channel status */}
      <div className="flex items-center justify-between text-xs text-slate-400 z-10">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'w-2.5 h-2.5 rounded-full',
              playerState.isPlaying && !playerState.isPaused ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
            )}
          />
          <span className="font-medium text-slate-300">
            {playerState.isPlaying
              ? playerState.isPaused
                ? 'Playback Paused'
                : 'Now Playing'
              : 'Idle'}
          </span>
        </div>

        {playerState.voiceChannelName && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-background/80 border border-border text-slate-300 font-medium">
            <Radio className="w-3.5 h-3.5 text-accent" />
            <span>{playerState.voiceChannelName}</span>
          </div>
        )}
      </div>

      {/* Track Info & Artwork */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 z-10">
        <div className="relative group w-44 h-44 sm:w-48 sm:h-48 rounded-2xl overflow-hidden bg-slate-800 shadow-xl border border-border/80 shrink-0">
          {current?.thumbnail ? (
            <img
              src={current.thumbnail}
              alt={current.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 gap-2">
              <Music className="w-12 h-12" />
              <span className="text-xs font-semibold">No Track Loaded</span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 flex flex-col justify-between h-44 sm:h-48 py-1 text-center sm:text-left">
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight line-clamp-2 leading-snug">
              {current?.title || 'Nothing Playing Right Now'}
            </h2>
            <p className="text-base text-slate-400 mt-1 truncate">
              {current?.author || 'Add a song to start listening'}
            </p>
          </div>

          {current?.requestedBy && (
            <div className="inline-flex items-center gap-2 self-center sm:self-start px-3 py-1.5 rounded-full bg-background/60 border border-border text-xs text-slate-300 mt-2">
              {current.requestedBy.avatar ? (
                <img
                  src={current.requestedBy.avatar}
                  alt={current.requestedBy.username}
                  className="w-4 h-4 rounded-full"
                />
              ) : (
                <User className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span>Requested by <strong className="text-white">{current.requestedBy.username}</strong></span>
            </div>
          )}

          {/* Quick Repeat mode pill */}
          <div className="text-xs text-slate-500 mt-auto">
            Mode: {['Standard Playback', 'Repeating Track', 'Repeating Queue', 'Autoplay Radio'][playerState.repeatMode]}
          </div>
        </div>
      </div>

      {/* Progress & Seek Bar */}
      <div className="flex flex-col gap-1.5 z-10 pt-2">
        <div className="relative flex items-center group">
          <input
            type="range"
            min={0}
            max={duration}
            value={displayPosition}
            disabled={!current || isActionLoading}
            onChange={(e) => {
              setIsSeeking(true)
              setSeekValue(Number(e.target.value))
            }}
            onMouseUp={handleSeekCommit}
            onTouchEnd={handleSeekCommit}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-accent transition-all focus:outline-none"
            style={{
              background: `linear-gradient(to right, #6366f1 ${progressPercent}%, #1e293b ${progressPercent}%)`,
            }}
          />
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
          <span>{formatTime(displayPosition)}</span>
          <span>{current ? current.duration : '0:00'}</span>
        </div>
      </div>

      {/* Transport Controls & Volume */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 z-10 pt-2 border-t border-border/60">
        {/* Left Side: Shuffle & Loop */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onAction({ action: 'shuffle' })}
            disabled={!playerState.isPlaying || playerState.queue.length === 0 || isActionLoading}
            className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-surface-hover transition-colors disabled:opacity-40"
            title="Shuffle Queue"
          >
            <Shuffle className="w-5 h-5" />
          </button>

          <button
            onClick={handleToggleLoop}
            disabled={!current || isActionLoading}
            className={cn(
              'p-2.5 rounded-xl transition-colors disabled:opacity-40 flex items-center gap-1',
              playerState.repeatMode > 0
                ? 'text-accent bg-accent/10 border border-accent/20'
                : 'text-slate-400 hover:text-white hover:bg-surface-hover'
            )}
            title="Cycle Loop Mode (Off / Track / Queue / Autoplay)"
          >
            {playerState.repeatMode === 1 ? (
              <Repeat1 className="w-5 h-5" />
            ) : (
              <Repeat className="w-5 h-5" />
            )}
            {playerState.repeatMode > 0 && (
              <span className="text-[10px] font-bold">
                {['', '1', 'ALL', 'AUTO'][playerState.repeatMode]}
              </span>
            )}
          </button>
        </div>

        {/* Center: Primary Playback Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onAction({ action: 'stop' })}
            disabled={!playerState.isPlaying || isActionLoading}
            className="p-3 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-surface-hover transition-colors disabled:opacity-40"
            title="Stop & Clear"
          >
            <Square className="w-5 h-5" />
          </button>

          <button
            onClick={handleTogglePlay}
            disabled={!current || isActionLoading}
            className="w-14 h-14 rounded-2xl bg-accent hover:bg-accent-hover text-white flex items-center justify-center shadow-lg shadow-accent/25 transition-all hover:scale-105 active:scale-95 disabled:opacity-40"
            title={playerState.isPaused ? 'Resume' : 'Pause'}
          >
            {playerState.isPaused || !playerState.isPlaying ? (
              <Play className="w-6 h-6 fill-current translate-x-0.5" />
            ) : (
              <Pause className="w-6 h-6 fill-current" />
            )}
          </button>

          <button
            onClick={() => onAction({ action: 'skip' })}
            disabled={!playerState.isPlaying || isActionLoading}
            className="p-3 rounded-xl text-slate-400 hover:text-white hover:bg-surface-hover transition-colors disabled:opacity-40"
            title="Skip Track"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>

        {/* Right Side: Volume Slider */}
        <div className="flex items-center gap-2.5 w-full sm:w-44">
          <button
            onClick={handleToggleMute}
            className="text-slate-400 hover:text-white transition-colors"
            title="Mute / Unmute"
          >
            {playerState.volume === 0 ? (
              <VolumeX className="w-5 h-5 text-rose-400" />
            ) : playerState.volume < 50 ? (
              <Volume1 className="w-5 h-5" />
            ) : (
              <Volume2 className="w-5 h-5" />
            )}
          </button>

          <input
            type="range"
            min={0}
            max={100}
            value={playerState.volume}
            onChange={(e) => onAction({ action: 'volume', value: Number(e.target.value) })}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-accent"
          />

          <span className="text-xs font-mono text-slate-400 w-8 text-right">
            {playerState.volume}%
          </span>
        </div>
      </div>
    </div>
  )
}
