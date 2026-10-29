// apps/web/src/components/TrackSearch.tsx
'use client'

import React, { useState } from 'react'
import { Search, Loader2, Plus, Music2, Youtube, Sparkles } from 'lucide-react'

interface TrackSearchProps {
  onAddTrack: (query: string) => Promise<boolean>
  disabled?: boolean
}

const QUICK_PRESETS = [
  'Lofi Hip Hop Radio',
  'Synthwave Chill Beats',
  'Top Gaming Hits 2026',
  'Acoustic Pop Covers',
]

export function TrackSearch({ onAddTrack, disabled = false }: TrackSearchProps) {
  const [query, setQuery] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = query.trim()
    if (!trimmed || isSubmitting || disabled) return

    setIsSubmitting(true)
    setSuccessMessage(null)
    try {
      const success = await onAddTrack(trimmed)
      if (success) {
        setSuccessMessage(`Added "${trimmed}" to the queue!`)
        setQuery('')
        setTimeout(() => setSuccessMessage(null), 4000)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePresetClick = async (preset: string) => {
    if (isSubmitting || disabled) return
    setIsSubmitting(true)
    setSuccessMessage(null)
    try {
      const success = await onAddTrack(preset)
      if (success) {
        setSuccessMessage(`Queued: ${preset}`)
        setTimeout(() => setSuccessMessage(null), 4000)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full bg-[#18181b]/80 border border-white/5 rounded-2xl p-5 backdrop-blur-md shadow-xl flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Music2 className="w-5 h-5 text-indigo-400" />
          <h3 className="font-semibold text-white tracking-wide">Add to Queue</h3>
        </div>
        <span className="text-xs text-zinc-400 flex items-center gap-1">
          <Youtube className="w-3.5 h-3.5 text-red-400" />
          Supports URLs & Search Queries
        </span>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title, artist, or paste a Spotify / YouTube / SoundCloud link..."
            disabled={disabled || isSubmitting}
            className="w-full pl-10 pr-4 py-3 bg-zinc-900/90 border border-zinc-700/60 rounded-xl text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all disabled:opacity-50"
          />
        </div>
        <button
          type="submit"
          disabled={!query.trim() || isSubmitting || disabled}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-medium rounded-xl text-sm transition-all shadow-lg shadow-indigo-600/20 active:scale-95 cursor-pointer disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin text-white" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          <span>Queue</span>
        </button>
      </form>

      {/* Quick Presets */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <span className="text-xs font-medium text-zinc-500 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-400" /> Quick Add:
        </span>
        {QUICK_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => handlePresetClick(preset)}
            disabled={isSubmitting || disabled}
            className="text-xs px-3 py-1 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700/50 transition-all disabled:opacity-50 cursor-pointer"
          >
            {preset}
          </button>
        ))}
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2 flex items-center justify-between animate-in fade-in slide-in-from-top-1">
          <span>{successMessage}</span>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-zinc-400 hover:text-white ml-2 text-xs"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}
