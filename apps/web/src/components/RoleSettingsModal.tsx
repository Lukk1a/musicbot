// apps/web/src/components/RoleSettingsModal.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { X, Shield, Users, Check, AlertCircle } from 'lucide-react'
import type { GuildMusicConfigData } from '@musicbot/shared'

interface RoleSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  guildId: string
  currentConfig: GuildMusicConfigData | null
  onConfigSaved: (newConfig: GuildMusicConfigData) => void
}

export function RoleSettingsModal({
  isOpen,
  onClose,
  guildId,
  currentConfig,
  onConfigSaved,
}: RoleSettingsModalProps) {
  const [playlistEditorRoleId, setPlaylistEditorRoleId] = useState('')
  const [djRoleId, setDjRoleId] = useState('')
  const [allowPublicContributions, setAllowPublicContributions] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (currentConfig) {
      setPlaylistEditorRoleId(currentConfig.playlistEditorRoleId || '')
      setDjRoleId(currentConfig.djRoleId || '')
      setAllowPublicContributions(currentConfig.allowPublicContributions || false)
    }
  }, [currentConfig])

  if (!isOpen) return null

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const res = await fetch(`/api/music/${guildId}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: {
            playlistEditorRoleId: playlistEditorRoleId.trim() || null,
            djRoleId: djRoleId.trim() || null,
            allowPublicContributions,
          },
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to save configuration.')
      }

      const updated = await res.json()
      onConfigSaved(updated)
      setSuccess(true)
      setTimeout(() => {
        onClose()
      }, 800)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error updating settings')
    } finally {
      setIsSaving(false)
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
          <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white">
            <Shield className="w-5 h-5 text-zinc-300" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Playlist & DJ Permissions</h3>
            <p className="text-xs text-zinc-400">Configure role access for server mixes</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/40 border border-red-800/40 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Playlist Editor Role ID
            </label>
            <input
              type="text"
              placeholder="e.g. 109876543210987654"
              value={playlistEditorRoleId}
              onChange={(e) => setPlaylistEditorRoleId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white transition-colors"
            />
            <p className="text-[11px] text-zinc-500 mt-1">
              Members with this Discord Role ID can manage, add, or delete tracks in server mixes.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              DJ Role ID
            </label>
            <input
              type="text"
              placeholder="e.g. 109876543210987654"
              value={djRoleId}
              onChange={(e) => setDjRoleId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white transition-colors"
            />
            <p className="text-[11px] text-zinc-500 mt-1">
              Members with this Discord Role can bypass channel restriction and control bot playback.
            </p>
          </div>

          <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-white block">
                Allow Public Server Contributions
              </span>
              <span className="text-[11px] text-zinc-400 block">
                Allow all server members to contribute songs to server mixes
              </span>
            </div>
            <input
              type="checkbox"
              checked={allowPublicContributions}
              onChange={(e) => setAllowPublicContributions(e.target.checked)}
              className="w-4 h-4 rounded bg-zinc-900 border-zinc-700 text-white focus:ring-0 cursor-pointer"
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
              disabled={isSaving}
              className="px-4 py-2 rounded-lg bg-white hover:bg-zinc-200 text-black text-xs font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {success ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Saved!</span>
                </>
              ) : isSaving ? (
                <span>Saving...</span>
              ) : (
                <span>Save Permissions</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
