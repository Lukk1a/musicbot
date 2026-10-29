// apps/web/src/components/QueueList.tsx
'use client'

import React from 'react'
import Image from 'next/image'
import { ListMusic, Play, Trash2, Clock, User, Music } from 'lucide-react'
import type { SerializedTrack } from '@musicbot/shared'

interface QueueListProps {
  queue: SerializedTrack[]
  currentTrack: SerializedTrack | null
  onJumpTo: (index: number) => Promise<boolean>
  onRemoveTrack: (index: number) => Promise<boolean>
  disabled?: boolean
}

function formatTotalDuration(tracks: SerializedTrack[]): string {
  const totalMs = tracks.reduce((acc, t) => acc + (t.durationMS || 0), 0)
  const totalSeconds = Math.floor(totalMs / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours} hr ${minutes} min`
  }
  return `${minutes} min ${seconds} sec`
}

export function QueueList({
  queue,
  currentTrack,
  onJumpTo,
  onRemoveTrack,
  disabled = false,
}: QueueListProps) {
  return (
    <div className="w-full bg-[#18181b]/80 border border-white/5 rounded-2xl p-5 backdrop-blur-md shadow-xl flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <ListMusic className="w-5 h-5 text-indigo-400" />
          <h3 className="font-semibold text-white tracking-wide">Up Next</h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-mono">
            {queue.length}
          </span>
        </div>
        {queue.length > 0 && (
          <span className="text-xs text-zinc-400 flex items-center gap-1 font-mono">
            <Clock className="w-3.5 h-3.5" />
            {formatTotalDuration(queue)}
          </span>
        )}
      </div>

      {/* Queue Items */}
      {queue.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-500 gap-3">
          <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            <Music className="w-6 h-6 text-zinc-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-400">The queue is currently empty</p>
            <p className="text-xs text-zinc-600 mt-1">
              {currentTrack
                ? 'Only the currently playing track is in session.'
                : 'Use the search bar above to queue up your favorite songs!'}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2 max-h-[480px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-700">
          {queue.map((track, idx) => (
            <div
              key={`${track.id || track.url}-${idx}`}
              className="group flex items-center justify-between gap-3 p-2.5 rounded-xl bg-zinc-900/60 hover:bg-zinc-800/80 border border-transparent hover:border-zinc-700/50 transition-all duration-150"
            >
              {/* Left: Position Number & Artwork */}
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-5 text-center text-xs font-mono font-medium text-zinc-500 group-hover:text-zinc-300">
                  {idx + 1}
                </span>

                <div className="relative w-11 h-11 rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0 border border-zinc-700/40">
                  {track.thumbnail ? (
                    <Image
                      src={track.thumbnail}
                      alt={track.title}
                      fill
                      sizes="44px"
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                      <Music className="w-5 h-5 text-zinc-600" />
                    </div>
                  )}
                </div>

                {/* Track Details */}
                <div className="min-w-0 flex flex-col justify-center">
                  <a
                    href={track.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium text-zinc-200 hover:text-indigo-400 truncate max-w-[280px] sm:max-w-md transition-colors"
                    title={track.title}
                  >
                    {track.title}
                  </a>
                  <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
                    <span className="truncate max-w-[140px]">{track.author}</span>
                    <span>•</span>
                    <span className="font-mono text-zinc-500">{track.duration}</span>
                    {track.requestedBy && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-zinc-500 truncate max-w-[120px]">
                          <User className="w-3 h-3" />
                          {track.requestedBy.username}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Actions */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  title="Play this track next"
                  disabled={disabled}
                  onClick={() => onJumpTo(idx)}
                  className="p-2 rounded-lg text-zinc-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Play className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  title="Remove from queue"
                  disabled={disabled}
                  onClick={() => onRemoveTrack(idx)}
                  className="p-2 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
