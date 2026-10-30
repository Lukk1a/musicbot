// apps/web/src/components/LiveQueuePanel.tsx
'use client'

import React from 'react'
import {
  ListMusic,
  Play,
  Trash2,
  Clock,
  Radio,
  Shuffle,
  Volume2,
} from 'lucide-react'
import type { SerializedTrack } from '@musicbot/shared'

interface LiveQueuePanelProps {
  currentTrack: SerializedTrack | null
  queue: SerializedTrack[]
  onJumpTo: (index: number) => Promise<boolean>
  onRemoveTrack: (index: number) => Promise<boolean>
  onShuffle: () => Promise<void>
  disabled?: boolean
}

function formatTotalDuration(tracks: SerializedTrack[]): string {
  const totalMs = tracks.reduce((acc, t) => acc + (t.durationMS || 0), 0)
  const totalSeconds = Math.floor(totalMs / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m ${seconds}s`
}

export function LiveQueuePanel({
  currentTrack,
  queue,
  onJumpTo,
  onRemoveTrack,
  onShuffle,
  disabled = false,
}: LiveQueuePanelProps) {
  return (
    <aside className="w-80 h-full flex flex-col bg-[#0c0c0e] border-l border-[#222226] text-zinc-300 select-none pb-28">
      {/* Header */}
      <div className="p-4 border-b border-[#222226] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListMusic className="w-4 h-4 text-white" />
          <h3 className="font-semibold text-sm text-white tracking-tight">Queue</h3>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400">
            {queue.length}
          </span>
        </div>

        {queue.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-zinc-500">
              {formatTotalDuration(queue)}
            </span>
            <button
              onClick={onShuffle}
              disabled={disabled}
              className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors disabled:opacity-40"
              title="Shuffle queue"
            >
              <Shuffle className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Now Playing Section in Queue */}
      <div className="p-4 border-b border-[#222226] bg-zinc-950/40">
        <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
          Now Playing
        </span>

        {currentTrack ? (
          <div className="flex items-center gap-3">
            <img
              src={currentTrack.thumbnail || '/placeholder-album.png'}
              alt={currentTrack.title}
              className="w-12 h-12 rounded-md object-cover ring-1 ring-zinc-800 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-white truncate">{currentTrack.title}</div>
              <div className="text-[11px] text-zinc-400 truncate mt-0.5">{currentTrack.author}</div>
              {currentTrack.requestedBy && (
                <div className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
                  <span>Queued by</span>
                  <span className="font-medium text-zinc-300">
                    {currentTrack.requestedBy.username}
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 text-xs text-zinc-500 py-2">
            <Radio className="w-4 h-4" />
            <span>Nothing playing right now</span>
          </div>
        )}
      </div>

      {/* Next In Queue List */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1.5">
        <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider px-2 py-1">
          Up Next
        </span>

        {queue.length === 0 ? (
          <div className="p-6 text-center text-zinc-500 text-xs flex flex-col items-center gap-2 my-auto">
            <ListMusic className="w-6 h-6 text-zinc-700" />
            <span>The queue is empty</span>
          </div>
        ) : (
          queue.map((track, idx) => (
            <div
              key={`${track.id || track.url}-${idx}`}
              className="group flex items-center justify-between gap-2.5 p-2 rounded-lg hover:bg-zinc-900 transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-4 text-center font-mono text-[11px] text-zinc-500 group-hover:text-zinc-300">
                  {idx + 1}
                </span>
                <img
                  src={track.thumbnail || '/placeholder-album.png'}
                  alt={track.title}
                  className="w-9 h-9 rounded object-cover ring-1 ring-zinc-800 shrink-0"
                />
                <div className="min-w-0">
                  <div className="text-xs font-medium text-white truncate max-w-[140px]">
                    {track.title}
                  </div>
                  <div className="text-[11px] text-zinc-500 truncate max-w-[140px]">
                    {track.author}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  title="Jump to this track"
                  disabled={disabled}
                  onClick={() => onJumpTo(idx)}
                  className="p-1.5 rounded text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
                >
                  <Play className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Remove from queue"
                  disabled={disabled}
                  onClick={() => onRemoveTrack(idx)}
                  className="p-1.5 rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  )
}
