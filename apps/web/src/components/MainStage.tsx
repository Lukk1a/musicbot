// apps/web/src/components/MainStage.tsx
'use client'

import React, { useState } from 'react'
import {
  Play,
  Clock,
  Plus,
  Trash2,
  Music,
  Heart,
  Disc,
  ListPlus,
  Search,
  Loader2,
  ExternalLink,
} from 'lucide-react'
import type { ServerPlaylist, SpotifyUserPlaylist, SpotifyTrackItem } from '@musicbot/shared'
import { formatTime } from '@/lib/utils'

interface MainStageProps {
  currentType: 'server-mix' | 'spotify-playlist' | 'liked-songs'
  serverPlaylist: ServerPlaylist | null
  spotifyPlaylist: SpotifyUserPlaylist | null
  spotifyTracks: SpotifyTrackItem[]
  likedTracks: SpotifyTrackItem[]
  isLoadingTracks: boolean
  currentUserId?: string
  onPlayTrack: (track: { url: string; title: string }) => Promise<void>
  onQueueTrack: (track: { url: string; title: string }) => Promise<void>
  onPlayAll: (tracks: Array<{ url: string; title: string }>) => Promise<void>
  onAddTrackToServerMix?: (track: {
    title: string
    author: string
    duration: string
    durationMS: number
    thumbnail: string
    url: string
  }) => Promise<void>
  onDeleteServerTrack?: (trackIndex: number) => Promise<void>
  onDeleteServerMix?: () => Promise<void>
}

export function MainStage({
  currentType,
  serverPlaylist,
  spotifyPlaylist,
  spotifyTracks,
  likedTracks,
  isLoadingTracks,
  currentUserId,
  onPlayTrack,
  onQueueTrack,
  onPlayAll,
  onAddTrackToServerMix,
  onDeleteServerTrack,
  onDeleteServerMix,
}: MainStageProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isAddingSearch, setIsAddingSearch] = useState(false)
  const [statusNotice, setStatusNotice] = useState<string | null>(null)

  // Determine current playlist info
  let title = 'Select a Playlist'
  let description = ''
  let creator = ''
  let trackCount = 0
  let coverImage: string | null = null
  let isMix = false

  if (currentType === 'server-mix' && serverPlaylist) {
    title = serverPlaylist.name
    description = serverPlaylist.description || 'Collaborative Server Mix'
    creator = `Created by ${serverPlaylist.createdBy.username}`
    trackCount = serverPlaylist.tracks.length
    isMix = true
  } else if (currentType === 'spotify-playlist' && spotifyPlaylist) {
    title = spotifyPlaylist.name
    description = spotifyPlaylist.description || 'Spotify Playlist'
    creator = `By ${spotifyPlaylist.owner.display_name}`
    trackCount = spotifyPlaylist.tracks.total
    coverImage = spotifyPlaylist.images?.[0]?.url || null
  } else if (currentType === 'liked-songs') {
    title = 'Liked Songs'
    description = 'Your saved Spotify tracks'
    creator = 'Personal Spotify Library'
    trackCount = likedTracks.length
  }

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim() || isAddingSearch) return

    setIsAddingSearch(true)
    setStatusNotice(null)
    const query = searchQuery.trim()

    try {
      if (isMix && onAddTrackToServerMix) {
        await onAddTrackToServerMix({
          title: query,
          author: 'Added via Search',
          duration: '--:--',
          durationMS: 0,
          thumbnail: '',
          url: query,
        })
        setStatusNotice(`Added "${query}" to Server Mix!`)
      } else {
        await onQueueTrack({ url: query, title: query })
        setStatusNotice(`Queued "${query}" in Discord!`)
      }
      setSearchQuery('')
      setTimeout(() => setStatusNotice(null), 4000)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to add song.'
      setStatusNotice(msg)
    } finally {
      setIsAddingSearch(false)
    }
  }

  const handlePlayAllClick = async () => {
    if (isMix && serverPlaylist) {
      const tracks = serverPlaylist.tracks.map((t) => ({
        url: t.url,
        title: `${t.title} - ${t.author}`,
      }))
      await onPlayAll(tracks)
    } else if (currentType === 'spotify-playlist') {
      const tracks = spotifyTracks.map((t) => ({
        url: t.external_urls.spotify,
        title: `${t.name} - ${t.artists.map((a) => a.name).join(', ')}`,
      }))
      await onPlayAll(tracks)
    } else if (currentType === 'liked-songs') {
      const tracks = likedTracks.map((t) => ({
        url: t.external_urls.spotify,
        title: `${t.name} - ${t.artists.map((a) => a.name).join(', ')}`,
      }))
      await onPlayAll(tracks)
    }
  }

  return (
    <main className="flex-1 overflow-y-auto bg-black text-[#ededed] pb-28">
      {/* HEADER BANNER */}
      <div className="relative p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-end gap-6 bg-gradient-to-b from-zinc-900/80 to-black border-b border-[#222226]">
        {/* Cover Art Box */}
        <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 shadow-2xl flex items-center justify-center shrink-0">
          {coverImage ? (
            <img src={coverImage} alt={title} className="w-full h-full object-cover" />
          ) : currentType === 'liked-songs' ? (
            <div className="w-full h-full bg-gradient-to-br from-indigo-700 via-purple-700 to-pink-600 flex items-center justify-center text-white">
              <Heart className="w-16 h-16 fill-white" />
            </div>
          ) : (
            <div className="w-full h-full bg-zinc-950 flex items-center justify-center text-zinc-500">
              <Disc className="w-16 h-16" />
            </div>
          )}
        </div>

        {/* Playlist Metadata & Actions */}
        <div className="flex-1 min-w-0 flex flex-col justify-end gap-2">
          <span className="text-xs uppercase tracking-wider font-semibold text-zinc-400">
            {isMix ? 'Collaborative Server Mix' : currentType === 'liked-songs' ? 'Collection' : 'Spotify Playlist'}
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight truncate">
            {title}
          </h1>
          {description && (
            <p className="text-xs sm:text-sm text-zinc-400 line-clamp-2 max-w-2xl">{description}</p>
          )}

          <div className="flex items-center gap-2 text-xs text-zinc-400 mt-1">
            <span className="font-medium text-white">{creator}</span>
            <span>•</span>
            <span>{trackCount} songs</span>
          </div>

          {/* Action Row */}
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={handlePlayAllClick}
              disabled={trackCount === 0}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold text-sm shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:scale-100"
            >
              <Play className="w-4 h-4 fill-black" />
              <span>Play All</span>
            </button>

            {isMix && onDeleteServerMix && (
              <button
                onClick={onDeleteServerMix}
                className="p-2.5 rounded-full hover:bg-zinc-900 border border-transparent hover:border-zinc-800 text-zinc-500 hover:text-red-400 transition-colors"
                title="Delete this Server Mix"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* SEARCH & QUICK ADD BAR */}
      <div className="p-6 pb-2">
        <form onSubmit={handleQuickAdd} className="flex gap-2 max-w-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                isMix
                  ? 'Add song title, artist, or YouTube/Spotify link to this Server Mix...'
                  : 'Search or paste a link to play in Discord voice...'
              }
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={!searchQuery.trim() || isAddingSearch}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-white hover:bg-zinc-200 text-black text-xs font-semibold rounded-xl transition-all disabled:opacity-40"
          >
            {isAddingSearch ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            <span>{isMix ? 'Add to Mix' : 'Play in Voice'}</span>
          </button>
        </form>

        {statusNotice && (
          <div className="mt-3 text-xs text-emerald-400 bg-emerald-950/30 border border-emerald-800/40 rounded-lg px-3 py-1.5 flex items-center justify-between max-w-2xl">
            <span>{statusNotice}</span>
            <button onClick={() => setStatusNotice(null)} className="text-zinc-500 hover:text-white">
              ✕
            </button>
          </div>
        )}
      </div>

      {/* TRACKS LIST TABLE */}
      <div className="p-6 pt-2">
        {isLoadingTracks ? (
          <div className="py-20 text-center flex flex-col items-center justify-center gap-3 text-zinc-500">
            <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
            <span className="text-xs">Loading tracks...</span>
          </div>
        ) : isMix && serverPlaylist ? (
          /* SERVER PLAYLIST TRACKS */
          serverPlaylist.tracks.length === 0 ? (
            <div className="py-16 text-center text-zinc-500 text-xs flex flex-col items-center gap-2 border border-dashed border-zinc-900 rounded-2xl">
              <Disc className="w-8 h-8 text-zinc-700" />
              <span>No songs in this Server Mix yet. Use the bar above to add some!</span>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#222226] text-zinc-400 sticky top-0 bg-black z-10">
                    <th className="py-3 px-3 w-10 text-center">#</th>
                    <th className="py-3 px-4">Title</th>
                    <th className="py-3 px-4 hidden md:table-cell">Added By</th>
                    <th className="py-3 px-4 text-right">
                      <Clock className="w-3.5 h-3.5 inline" />
                    </th>
                    <th className="py-3 px-4 w-28 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900/60">
                  {serverPlaylist.tracks.map((t, index) => (
                    <tr
                      key={t.id || index}
                      className="group hover:bg-zinc-950/80 transition-colors"
                    >
                      <td className="py-3 px-3 text-center text-zinc-500 font-mono">
                        <span className="group-hover:hidden">{index + 1}</span>
                        <button
                          onClick={() => onPlayTrack({ url: t.url, title: `${t.title} - ${t.author}` })}
                          className="hidden group-hover:inline-block text-white hover:scale-110 transition-transform"
                          title="Play now"
                        >
                          <Play className="w-3.5 h-3.5 fill-white" />
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {t.thumbnail ? (
                            <img
                              src={t.thumbnail}
                              alt={t.title}
                              className="w-9 h-9 rounded object-cover ring-1 ring-zinc-800 shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                              <Music className="w-4 h-4 text-zinc-600" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-medium text-white truncate max-w-xs sm:max-w-md">
                              {t.title}
                            </div>
                            <div className="text-[11px] text-zinc-400 truncate">{t.author}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 hidden md:table-cell text-zinc-400">
                        <div className="flex items-center gap-1.5">
                          {t.addedBy.avatar ? (
                            <img
                              src={t.addedBy.avatar}
                              alt={t.addedBy.username}
                              className="w-4 h-4 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-4 h-4 rounded-full bg-zinc-800 text-[9px] flex items-center justify-center text-zinc-300">
                              {t.addedBy.username.charAt(0)}
                            </div>
                          )}
                          <span className="text-[11px] text-zinc-300 truncate max-w-[120px]">
                            {t.addedBy.username}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-zinc-400">
                        {t.duration || formatTime(t.durationMS)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => onQueueTrack({ url: t.url, title: `${t.title} - ${t.author}` })}
                            className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                            title="Add to up-next queue"
                          >
                            <ListPlus className="w-3.5 h-3.5" />
                          </button>
                          {onDeleteServerTrack && (
                            <button
                              onClick={() => onDeleteServerTrack(index)}
                              className="p-1.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-red-400 transition-colors"
                              title="Remove from Server Mix"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* SPOTIFY PLAYLIST OR LIKED SONGS */
          (() => {
            const tracksToDisplay = currentType === 'liked-songs' ? likedTracks : spotifyTracks
            return tracksToDisplay.length === 0 ? (
              <div className="py-16 text-center text-zinc-500 text-xs border border-dashed border-zinc-900 rounded-2xl">
                No tracks found in this playlist.
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#222226] text-zinc-400 sticky top-0 bg-black z-10">
                      <th className="py-3 px-3 w-10 text-center">#</th>
                      <th className="py-3 px-4">Title</th>
                      <th className="py-3 px-4 hidden lg:table-cell">Album</th>
                      <th className="py-3 px-4 text-right">
                        <Clock className="w-3.5 h-3.5 inline" />
                      </th>
                      <th className="py-3 px-4 w-28 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900/60">
                    {tracksToDisplay.map((track, index) => {
                      const albumImg = track.album?.images?.[0]?.url
                      const artistNames = track.artists?.map((a) => a.name).join(', ') || 'Unknown Artist'
                      return (
                        <tr
                          key={track.id || index}
                          className="group hover:bg-zinc-950/80 transition-colors"
                        >
                          <td className="py-3 px-3 text-center text-zinc-500 font-mono">
                            <span className="group-hover:hidden">{index + 1}</span>
                            <button
                              onClick={() =>
                                onPlayTrack({
                                  url: track.external_urls.spotify,
                                  title: `${track.name} - ${artistNames}`,
                                })
                              }
                              className="hidden group-hover:inline-block text-white hover:scale-110 transition-transform"
                              title="Play in Discord"
                            >
                              <Play className="w-3.5 h-3.5 fill-white" />
                            </button>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              {albumImg ? (
                                <img
                                  src={albumImg}
                                  alt={track.name}
                                  className="w-9 h-9 rounded object-cover ring-1 ring-zinc-800 shrink-0"
                                />
                              ) : (
                                <div className="w-9 h-9 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                                  <Music className="w-4 h-4 text-zinc-600" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="font-medium text-white truncate max-w-xs sm:max-w-md">
                                  {track.name}
                                </div>
                                <div className="text-[11px] text-zinc-400 truncate">{artistNames}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 hidden lg:table-cell text-zinc-400 truncate max-w-xs">
                            {track.album?.name || '-'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-zinc-400">
                            {formatTime(track.duration_ms)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() =>
                                  onQueueTrack({
                                    url: track.external_urls.spotify,
                                    title: `${track.name} - ${artistNames}`,
                                  })
                                }
                                className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                                title="Queue in Discord"
                              >
                                <ListPlus className="w-3.5 h-3.5" />
                              </button>
                              <a
                                href={track.external_urls.spotify}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-[#1DB954] transition-colors"
                                title="Open in Spotify"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )
          })()
        )}
      </div>
    </main>
  )
}
