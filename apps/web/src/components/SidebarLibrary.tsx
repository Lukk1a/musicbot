// apps/web/src/components/SidebarLibrary.tsx
'use client'

import React from 'react'
import {
  Users,
  Music,
  Plus,
  Settings,
  Heart,
  Disc,
  LogIn,
  LogOut,
} from 'lucide-react'
import type { ServerPlaylist, SpotifyUserPlaylist, SpotifyUserProfile } from '@musicbot/shared'

interface SidebarLibraryProps {
  guildId: string
  activeTab: 'mixes' | 'spotify'
  setActiveTab: (tab: 'mixes' | 'spotify') => void
  serverMixes: ServerPlaylist[]
  selectedServerPlaylist: ServerPlaylist | null
  onSelectServerPlaylist: (playlist: ServerPlaylist) => void
  spotifyUser: SpotifyUserProfile | null
  spotifyPlaylists: SpotifyUserPlaylist[]
  selectedSpotifyPlaylist: SpotifyUserPlaylist | null
  onSelectSpotifyPlaylist: (playlist: SpotifyUserPlaylist) => void
  onSelectLikedSongs: () => void
  isLikedSongsSelected: boolean
  onOpenCreateMix: () => void
  onOpenRoleSettings: () => void
  onDisconnectSpotify: () => void
}

export function SidebarLibrary({
  guildId,
  activeTab,
  setActiveTab,
  serverMixes = [],
  selectedServerPlaylist,
  onSelectServerPlaylist,
  spotifyUser,
  spotifyPlaylists = [],
  selectedSpotifyPlaylist,
  onSelectSpotifyPlaylist,
  onSelectLikedSongs,
  isLikedSongsSelected,
  onOpenCreateMix,
  onOpenRoleSettings,
  onDisconnectSpotify,
}: SidebarLibraryProps) {
  const safeMixes = Array.isArray(serverMixes) ? serverMixes.filter(Boolean) : []
  const safeSpotifyPlaylists = Array.isArray(spotifyPlaylists) ? spotifyPlaylists.filter(Boolean) : []

  return (
    <aside className="w-72 lg:w-80 h-full flex flex-col bg-[#0c0c0e] border-r border-[#222226] text-zinc-300 select-none">
      {/* Top Header / Mode Switcher */}
      <div className="p-4 border-b border-[#222226] flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-white text-black flex items-center justify-center font-bold">
              <Disc className="w-3.5 h-3.5" />
            </div>
            <span className="font-semibold text-sm tracking-tight text-white">Library</span>
          </div>

          {activeTab === 'mixes' && (
            <div className="flex items-center gap-1">
              <button
                onClick={onOpenRoleSettings}
                className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                title="Manage Server Playlist Permissions"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                onClick={onOpenCreateMix}
                className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                title="Create Server Mix"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Tab Pills */}
        <div className="grid grid-cols-2 p-1 bg-zinc-950 rounded-lg border border-[#222226]">
          <button
            onClick={() => setActiveTab('mixes')}
            className={`flex items-center justify-center gap-2 py-1.5 px-3 rounded-md text-xs font-medium transition-all ${
              activeTab === 'mixes'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Server Mixes</span>
          </button>

          <button
            onClick={() => setActiveTab('spotify')}
            className={`flex items-center justify-center gap-2 py-1.5 px-3 rounded-md text-xs font-medium transition-all ${
              activeTab === 'spotify'
                ? 'bg-[#1DB954] text-black font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Music className="w-3.5 h-3.5" />
            <span>My Spotify</span>
          </button>
        </div>
      </div>

      {/* BODY CONTENT BASED ON ACTIVE TAB */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1.5">
        {activeTab === 'mixes' ? (
          /* SERVER MIXES LIST */
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between px-2 py-1 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
              <span>Collaborative Mixes</span>
              <span>{safeMixes.length}</span>
            </div>

            {safeMixes.length === 0 ? (
              <div className="p-6 rounded-xl border border-dashed border-zinc-800/80 bg-zinc-950/40 text-center flex flex-col items-center gap-2 my-2">
                <Users className="w-6 h-6 text-zinc-600" />
                <p className="text-xs text-zinc-400">No server mixes yet.</p>
                <button
                  onClick={onOpenCreateMix}
                  className="mt-1 px-3 py-1 rounded-md bg-white hover:bg-zinc-200 text-black text-xs font-medium transition-colors"
                >
                  Create first mix
                </button>
              </div>
            ) : (
              safeMixes.map((mix) => {
                const isSelected = selectedServerPlaylist?.id === mix.id
                const trackCount = Array.isArray(mix?.tracks) ? mix.tracks.length : 0
                const creatorName = mix?.createdBy?.username || 'Member'

                return (
                  <button
                    key={mix.id}
                    onClick={() => onSelectServerPlaylist(mix)}
                    className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors ${
                      isSelected
                        ? 'bg-zinc-800 text-white'
                        : 'hover:bg-zinc-900/80 text-zinc-300'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-white shrink-0">
                      <Disc className="w-5 h-5 text-zinc-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold truncate text-white">{mix.name || 'Untitled Mix'}</div>
                      <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 mt-0.5">
                        <span>{trackCount} tracks</span>
                        <span>•</span>
                        <span className="truncate">By {creatorName}</span>
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        ) : (
          /* MY SPOTIFY TAB */
          <div className="flex flex-col gap-3">
            {/* Spotify Account Status Card */}
            {spotifyUser ? (
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  {spotifyUser.images?.[0]?.url ? (
                    <img
                      src={spotifyUser.images[0].url}
                      alt={spotifyUser.display_name || 'Spotify'}
                      className="w-8 h-8 rounded-full object-cover ring-1 ring-[#1DB954]"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[#1DB954] text-black font-bold flex items-center justify-center text-xs">
                      {spotifyUser.display_name?.charAt(0) || 'S'}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-white truncate">
                      {spotifyUser.display_name || 'Spotify User'}
                    </div>
                    <div className="text-[10px] text-[#1DB954] font-medium flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1DB954]" />
                      Spotify Connected
                    </div>
                  </div>
                </div>

                <button
                  onClick={onDisconnectSpotify}
                  className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-500 hover:text-red-400 transition-colors"
                  title="Disconnect Spotify"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 text-center flex flex-col items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[#1DB954]/10 text-[#1DB954] flex items-center justify-center">
                  <Music className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white">Connect Spotify</h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">
                    Access your playlists, liked tracks, and stream them directly in Discord.
                  </p>
                </div>
                <a
                  href={`/api/spotify/login?guildId=${guildId}`}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-[#1DB954] hover:bg-[#1ed760] text-black text-xs font-bold transition-all"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Connect with Spotify</span>
                </a>
              </div>
            )}

            {spotifyUser && (
              <>
                {/* Liked Songs Entry */}
                <button
                  onClick={onSelectLikedSongs}
                  className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors ${
                    isLikedSongsSelected
                      ? 'bg-zinc-800 text-white'
                      : 'hover:bg-zinc-900/80 text-zinc-300'
                  }`}
                >
                  <div className="w-10 h-10 rounded-md bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center text-white shrink-0 shadow-sm">
                    <Heart className="w-5 h-5 fill-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-white">Liked Songs</div>
                    <div className="text-[11px] text-zinc-500 mt-0.5">Auto-synced tracks</div>
                  </div>
                </button>

                {/* Spotify Playlists List */}
                <div className="flex flex-col gap-1 pt-1">
                  <div className="px-2 py-1 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                    Playlists ({safeSpotifyPlaylists.length})
                  </div>

                  {safeSpotifyPlaylists.map((pl) => {
                    const isSelected = selectedSpotifyPlaylist?.id === pl.id && !isLikedSongsSelected
                    const imgUrl = pl?.images?.[0]?.url
                    const totalTracks = pl?.tracks?.total ?? 0
                    const ownerName = pl?.owner?.display_name || pl?.owner?.id || 'Spotify'

                    return (
                      <button
                        key={pl.id}
                        onClick={() => onSelectSpotifyPlaylist(pl)}
                        className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors ${
                          isSelected
                            ? 'bg-zinc-800 text-white'
                            : 'hover:bg-zinc-900/80 text-zinc-300'
                        }`}
                      >
                        {imgUrl ? (
                          <img
                            src={imgUrl}
                            alt={pl.name}
                            className="w-10 h-10 rounded-md object-cover ring-1 ring-zinc-800 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-white shrink-0">
                            <Music className="w-4 h-4 text-zinc-500" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold truncate text-white">{pl.name || 'Untitled Playlist'}</div>
                          <div className="text-[11px] text-zinc-500 mt-0.5">
                            {totalTracks} songs • {ownerName}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </aside>
  )
}
