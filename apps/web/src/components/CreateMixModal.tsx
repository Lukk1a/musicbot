// apps/web/src/components/CreateMixModal.tsx
'use client'

import React, { useState } from 'react'
import { X, Disc, Plus } from 'lucide-react'
import type { ServerPlaylist } from '@musicbot/shared'

interface CreateMixModalProps {
  isOpen: boolean
  onClose: () => void
  guildId: string
  onPlaylistCreated: (newPlaylist: ServerPlaylist) => void
}

export function CreateMixModal({
  isOpen,
  onClose,
  guildId,
  onPlaylistCreated,
}: CreateMixModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/music/${guildId}/playlists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to create playlist.')
      }

      const created: ServerPlaylist = await res.json()
      onPlaylistCreated(created)
      setName('')
      setDescription('')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating server mix')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-[#0c0c0e] border border-[#222226] rounded-2xl p-6 shadow-2xl relative text-zinc-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center font-bold">
            <Disc className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Create Server Mix</h3>
            <p className="text-xs text-zinc-400">A collaborative playlist for your Discord server</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/40 border border-red-800/40 text-red-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Mix Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Late Night Vibes"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Description (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="What kind of tunes belong here?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white transition-colors resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-800/80">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-xs font-medium text-zinc-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !name.trim()}
              className="px-4 py-2 rounded-lg bg-white hover:bg-zinc-200 text-black text-xs font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isLoading ? 'Creating...' : 'Create Mix'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
