// apps/web/src/components/GuildPlayerDashboard.tsx
'use client'

import React from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  RefreshCw,
  Wifi,
  WifiOff,
  Volume2,
  AlertTriangle,
  XCircle,
  Radio,
} from 'lucide-react'
import { useGuildPlayer } from '@/hooks/useGuildPlayer'
import { PlayerCard } from '@/components/PlayerCard'
import { TrackSearch } from '@/components/TrackSearch'
import { QueueList } from '@/components/QueueList'

interface GuildPlayerDashboardProps {
  guildId: string
}

export function GuildPlayerDashboard({ guildId }: GuildPlayerDashboardProps) {
  const {
    playerState,
    interpolatedPosition,
    isLoading,
    isActionLoading,
    isConnected,
    error,
    clearError,
    sendControl,
    refresh,
  } = useGuildPlayer(guildId)

  return (
    <div className="flex flex-col gap-6">
      {/* Top Bar / Navigation and Status */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>All Servers</span>
          </Link>

          <div className="flex items-center gap-2 pl-2">
            <span className="text-zinc-500 text-sm">/</span>
            <span className="text-sm font-semibold text-white tracking-wide font-mono">
              Server {guildId}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Voice Channel Status Badge */}
          {playerState.voiceChannelName ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
              <Volume2 className="w-3.5 h-3.5" />
              <span>{playerState.voiceChannelName}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800/80 border border-zinc-700/50 text-zinc-400 text-xs font-medium">
              <Radio className="w-3.5 h-3.5" />
              <span>No Voice Channel</span>
            </div>
          )}

          {/* WebSocket Connection Status */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
              isConnected
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-700/30'
                : 'bg-amber-950/40 text-amber-300 border-amber-700/30'
            }`}
          >
            {isConnected ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <Wifi className="w-3.5 h-3.5" />
                <span>Live Socket</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <WifiOff className="w-3.5 h-3.5" />
                <span>Reconnecting...</span>
              </>
            )}
          </div>

          {/* Manual Refresh Button */}
          <button
            onClick={() => refresh()}
            disabled={isLoading}
            title="Refresh player state"
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error / Warning Alert */}
      {error && (
        <div className="flex items-start justify-between gap-3 p-4 rounded-xl bg-rose-950/40 border border-rose-800/40 text-rose-200 text-sm backdrop-blur-sm animate-in fade-in">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-rose-300">Action Failed</p>
              <p className="text-rose-200/90 text-xs mt-0.5">{error}</p>
              <p className="text-rose-400/80 text-[11px] mt-1">
                Note: To control the player, you must be in the exact same voice channel as the bot
                (or have DJ / Administrator permissions).
              </p>
            </div>
          </div>
          <button
            onClick={clearError}
            className="text-rose-400 hover:text-white p-1 rounded-lg hover:bg-rose-900/40 transition-colors"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Grid: Player Card on Left/Top, Search and Queue on Right/Bottom */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (Player & Controls) */}
        <div className="lg:col-span-5 flex flex-col gap-6 sticky top-24">
          <PlayerCard
            playerState={playerState}
            position={interpolatedPosition}
            isActionLoading={isActionLoading}
            onAction={sendControl}
          />
        </div>

        {/* Right Column (Search & Queue List) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <TrackSearch
            onAddTrack={async (query: string) => {
              return await sendControl({ action: 'play', query })
            }}
            disabled={isActionLoading}
          />

          <QueueList
            queue={playerState.queue}
            currentTrack={playerState.currentTrack}
            onJumpTo={async (index: number) => {
              return await sendControl({ action: 'jumpTo', trackIndex: index })
            }}
            onRemoveTrack={async (index: number) => {
              return await sendControl({ action: 'removeTrack', trackIndex: index })
            }}
            disabled={isActionLoading}
          />
        </div>
      </div>
    </div>
  )
}
