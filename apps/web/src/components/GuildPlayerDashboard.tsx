// apps/web/src/components/GuildPlayerDashboard.tsx
'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  AlertCircle,
  X,
  Radio,
  Wifi,
  WifiOff,
} from 'lucide-react'
import type {
  GuildMusicConfigData,
  ServerPlaylist,
  SpotifyTrackItem,
  SpotifyUserPlaylist,
  SpotifyUserProfile,
} from '@musicbot/shared'
import { useGuildPlayer } from '@/hooks/useGuildPlayer'
import { SidebarLibrary } from '@/components/SidebarLibrary'
import { MainStage } from '@/components/MainStage'
import { LiveQueuePanel } from '@/components/LiveQueuePanel'
import { SpotifyPlayerBar } from '@/components/SpotifyPlayerBar'
import { RoleSettingsModal } from '@/components/RoleSettingsModal'
import { CreateMixModal } from '@/components/CreateMixModal'

interface GuildPlayerDashboardProps {
  guildId: string
  currentUserId?: string
}

export function GuildPlayerDashboard({ guildId, currentUserId }: GuildPlayerDashboardProps) {
  const {
    playerState,
    interpolatedPosition,
    isActionLoading,
    isConnected,
    error: playerError,
    clearError,
    sendControl,
  } = useGuildPlayer(guildId)

  // 1. Navigation & View State
  const [activeTab, setActiveTab] = useState<'mixes' | 'spotify'>('mixes')
  const [currentType, setCurrentType] = useState<
    'server-mix' | 'spotify-playlist' | 'liked-songs'
  >('server-mix')

  // 2. Server Mixes State
  const [serverMixes, setServerMixes] = useState<ServerPlaylist[]>([])
  const [selectedServerPlaylist, setSelectedServerPlaylist] = useState<ServerPlaylist | null>(null)
  const [guildConfig, setGuildConfig] = useState<GuildMusicConfigData | null>(null)

  // 3. Spotify State
  const [spotifyUser, setSpotifyUser] = useState<SpotifyUserProfile | null>(null)
  const [spotifyPlaylists, setSpotifyPlaylists] = useState<SpotifyUserPlaylist[]>([])
  const [selectedSpotifyPlaylist, setSelectedSpotifyPlaylist] = useState<SpotifyUserPlaylist | null>(null)
  const [spotifyTracks, setSpotifyTracks] = useState<SpotifyTrackItem[]>([])
  const [likedTracks, setLikedTracks] = useState<SpotifyTrackItem[]>([])
  const [isLikedSongsSelected, setIsLikedSongsSelected] = useState(false)
  const [isLoadingTracks, setIsLoadingTracks] = useState(false)

  // 4. Modal States
  const [isCreateMixOpen, setIsCreateMixOpen] = useState(false)
  const [isRoleSettingsOpen, setIsRoleSettingsOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Load Guild Server Mixes & Music Config
  const fetchServerMixesAndConfig = useCallback(async () => {
    try {
      const [mixesRes, configRes] = await Promise.all([
        fetch(`/api/music/${guildId}/playlists`),
        fetch(`/api/music/${guildId}/config`),
      ])

      if (mixesRes.ok) {
        const mixes: ServerPlaylist[] = await mixesRes.json()
        setServerMixes(mixes)
        if (mixes.length > 0 && !selectedServerPlaylist) {
          setSelectedServerPlaylist(mixes[0])
        }
      }

      if (configRes.ok) {
        const cfg: GuildMusicConfigData = await configRes.json()
        setGuildConfig(cfg)
      }
    } catch (err) {
      console.error('[GuildPlayerDashboard] Error fetching server mixes/config:', err)
    }
  }, [guildId, selectedServerPlaylist])

  // Load Spotify Profile & Data
  const checkSpotifyStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/spotify/status')
      if (res.ok) {
        const data = await res.json()
        if (data.connected && data.user) {
          setSpotifyUser(data.user)

          // Fetch user playlists and liked songs in parallel
          const [plRes, likedRes] = await Promise.all([
            fetch('/api/spotify/playlists'),
            fetch('/api/spotify/liked'),
          ])

          if (plRes.ok) {
            const pls: SpotifyUserPlaylist[] = await plRes.json()
            setSpotifyPlaylists(pls)
          }
          if (likedRes.ok) {
            const lk: SpotifyTrackItem[] = await likedRes.json()
            setLikedTracks(lk)
          }
        } else {
          setSpotifyUser(null)
          setSpotifyPlaylists([])
          setLikedTracks([])
        }
      }
    } catch (err) {
      console.error('[GuildPlayerDashboard] Error checking Spotify status:', err)
    }
  }, [])

  useEffect(() => {
    fetchServerMixesAndConfig()
    checkSpotifyStatus()
  }, [fetchServerMixesAndConfig, checkSpotifyStatus])

  // Handlers for Selecting Content in Sidebar
  const handleSelectServerPlaylist = (playlist: ServerPlaylist) => {
    setSelectedServerPlaylist(playlist)
    setSelectedSpotifyPlaylist(null)
    setIsLikedSongsSelected(false)
    setCurrentType('server-mix')
  }

  const handleSelectSpotifyPlaylist = async (playlist: SpotifyUserPlaylist) => {
    setSelectedSpotifyPlaylist(playlist)
    setIsLikedSongsSelected(false)
    setCurrentType('spotify-playlist')
    setIsLoadingTracks(true)

    try {
      const res = await fetch(`/api/spotify/playlists/${playlist.id}/tracks`)
      if (res.ok) {
        const tracks: SpotifyTrackItem[] = await res.json()
        setSpotifyTracks(tracks)
      }
    } catch (err) {
      console.error('Failed to load Spotify playlist tracks:', err)
    } finally {
      setIsLoadingTracks(false)
    }
  }

  const handleSelectLikedSongs = () => {
    setIsLikedSongsSelected(true)
    setSelectedSpotifyPlaylist(null)
    setCurrentType('liked-songs')
  }

  const handleDisconnectSpotify = async () => {
    try {
      await fetch('/api/spotify/disconnect', { method: 'POST' })
      setSpotifyUser(null)
      setSpotifyPlaylists([])
      setLikedTracks([])
      if (currentType !== 'server-mix') {
        setCurrentType('server-mix')
      }
    } catch (err) {
      console.error('Failed to disconnect Spotify:', err)
    }
  }

  // Playback Control Handlers
  const handlePlayTrack = async (track: { url: string; title: string }) => {
    setErrorMessage(null)
    try {
      await sendControl({ action: 'play', query: track.url })
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Playback error')
    }
  }

  const handleQueueTrack = async (track: { url: string; title: string }) => {
    setErrorMessage(null)
    try {
      await sendControl({ action: 'play', query: track.url })
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Queue error')
    }
  }

  const handlePlayAll = async (tracks: Array<{ url: string; title: string }>) => {
    setErrorMessage(null)
    if (!tracks.length) return

    try {
      const res = await fetch(`/api/music/${guildId}/batch-play`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tracks }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to start batch playback.')
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Batch playback error')
    }
  }

  // Server Mix Modification Handlers
  const handleAddTrackToServerMix = async (track: {
    title: string
    author: string
    duration: string
    durationMS: number
    thumbnail: string
    url: string
  }) => {
    if (!selectedServerPlaylist) return
    setErrorMessage(null)

    try {
      const res = await fetch(`/api/music/${guildId}/playlists/${selectedServerPlaylist.id}/tracks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ track }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to add track to server mix.')
      }

      const updated: ServerPlaylist = await res.json()
      setSelectedServerPlaylist(updated)
      setServerMixes((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to add track')
      throw err
    }
  }

  const handleDeleteServerTrack = async (trackIndex: number) => {
    if (!selectedServerPlaylist) return
    setErrorMessage(null)

    try {
      const res = await fetch(
        `/api/music/${guildId}/playlists/${selectedServerPlaylist.id}/tracks/${trackIndex}`,
        { method: 'DELETE' }
      )

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to remove track.')
      }

      const updated: ServerPlaylist = await res.json()
      setSelectedServerPlaylist(updated)
      setServerMixes((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to remove track')
    }
  }

  const handleDeleteServerMix = async () => {
    if (!selectedServerPlaylist) return
    const confirmed = window.confirm(`Are you sure you want to delete "${selectedServerPlaylist.name}"?`)
    if (!confirmed) return

    try {
      const res = await fetch(`/api/music/${guildId}/playlists/${selectedServerPlaylist.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to delete server mix.')
      }

      const remaining = serverMixes.filter((m) => m.id !== selectedServerPlaylist.id)
      setServerMixes(remaining)
      setSelectedServerPlaylist(remaining[0] || null)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to delete mix')
    }
  }

  const handlePlaylistCreated = (newPlaylist: ServerPlaylist) => {
    setServerMixes((prev) => [newPlaylist, ...prev])
    setSelectedServerPlaylist(newPlaylist)
    setCurrentType('server-mix')
  }

  const activeError = errorMessage || playerError

  return (
    <div className="relative h-full w-full flex flex-col bg-black text-[#ededed] overflow-hidden">
      {/* Top Banner Alert (for error or voice notices) */}
      {activeError && (
        <div className="bg-red-950/80 border-b border-red-800/40 text-red-200 px-4 py-2 text-xs flex items-center justify-between z-30 shrink-0">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{activeError}</span>
          </div>
          <button
            onClick={() => {
              setErrorMessage(null)
              clearError()
            }}
            className="text-red-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3-PANEL SPOTIFY APP SHELL */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* PANEL 1: Left Library Sidebar */}
        <SidebarLibrary
          guildId={guildId}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          serverMixes={serverMixes}
          selectedServerPlaylist={selectedServerPlaylist}
          onSelectServerPlaylist={handleSelectServerPlaylist}
          spotifyUser={spotifyUser}
          spotifyPlaylists={spotifyPlaylists}
          selectedSpotifyPlaylist={selectedSpotifyPlaylist}
          onSelectSpotifyPlaylist={handleSelectSpotifyPlaylist}
          onSelectLikedSongs={handleSelectLikedSongs}
          isLikedSongsSelected={isLikedSongsSelected}
          onOpenCreateMix={() => setIsCreateMixOpen(true)}
          onOpenRoleSettings={() => setIsRoleSettingsOpen(true)}
          onDisconnectSpotify={handleDisconnectSpotify}
        />

        {/* PANEL 2: Main Center Stage */}
        <MainStage
          currentType={currentType}
          serverPlaylist={selectedServerPlaylist}
          spotifyPlaylist={selectedSpotifyPlaylist}
          spotifyTracks={spotifyTracks}
          likedTracks={likedTracks}
          isLoadingTracks={isLoadingTracks}
          currentUserId={currentUserId}
          onPlayTrack={handlePlayTrack}
          onQueueTrack={handleQueueTrack}
          onPlayAll={handlePlayAll}
          onAddTrackToServerMix={handleAddTrackToServerMix}
          onDeleteServerTrack={handleDeleteServerTrack}
          onDeleteServerMix={handleDeleteServerMix}
        />

        {/* PANEL 3: Right Live Queue Panel */}
        <div className="hidden xl:block">
          <LiveQueuePanel
            currentTrack={playerState.currentTrack}
            queue={playerState.queue}
            onJumpTo={async (idx) => {
              await sendControl({ action: 'jumpTo', trackIndex: idx })
              return true
            }}
            onRemoveTrack={async (idx) => {
              await sendControl({ action: 'removeTrack', trackIndex: idx })
              return true
            }}
            onShuffle={async () => {
              await sendControl({ action: 'shuffle' })
            }}
            disabled={isActionLoading}
          />
        </div>
      </div>

      {/* PINNED BOTTOM SPOTIFY PLAYER BAR */}
      <SpotifyPlayerBar
        playerState={playerState}
        interpolatedPosition={interpolatedPosition}
        sendControl={sendControl}
        isConnected={isConnected}
        isActionLoading={isActionLoading}
      />

      {/* MODALS */}
      <CreateMixModal
        isOpen={isCreateMixOpen}
        onClose={() => setIsCreateMixOpen(false)}
        guildId={guildId}
        onPlaylistCreated={handlePlaylistCreated}
      />

      <RoleSettingsModal
        isOpen={isRoleSettingsOpen}
        onClose={() => setIsRoleSettingsOpen(false)}
        guildId={guildId}
        currentConfig={guildConfig}
        onConfigSaved={(updated) => setGuildConfig(updated)}
      />
    </div>
  )
}
