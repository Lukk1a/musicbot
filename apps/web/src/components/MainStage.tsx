// apps/web/src/components/MainStage.tsx
'use client'

import React, { useState, useEffect, useRef } from 'react'
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
  Sparkles,
} from 'lucide-react'
import type { ServerPlaylist, SpotifyUserPlaylist, SpotifyTrackItem, SerializedTrack } from '@musicbot/shared'
import { formatTime } from '@/lib/utils'

interface MainStageProps {
  guildId?: string
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
  guildId,
  currentType,
  serverPlaylist,
  spotifyPlaylist,
  spotifyTracks = [],
  likedTracks = [],
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

  // Live Auto-complete / Search Suggestions
  const [searchResults, setSearchResults] = useState<SerializedTrack[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const searchContainerRef = useRef<HTMLDivElement>(null)

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Live debounced search
  useEffect(() => {
    const trimmed = searchQuery.trim()
    if (!trimmed || trimmed.length < 2 || !guildId) {
      setSearchResults([])
      setIsSearching(false)
      setShowDropdown(false)
      return
    }

    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const res = await fetch(`/api/music/${guildId}/search?query=${encodeURIComponent(trimmed)}`)
        if (res.ok) {
          const data: SerializedTrack[] = await res.json()
          setSearchResults(data)
          setShowDropdown(data.length > 0)
        }
      } catch (err) {
        console.warn('[MainStage] Search suggestions error:', err)
      } finally {
        setIsSearching(false)
      }
    }, 350)

    return () => clearTimeout(timer)
  }, [searchQuery, guildId])

  // Determine current playlist info defensively
  let title = 'Select a Playlist'
  let description = ''
  let creator = ''
  let trackCount = 0
  let coverImage: string | null = null
  let isMix = false

  if (currentType === 'server-mix' && serverPlaylist) {
    title = serverPlaylist.name || 'Untitled Server Mix'
    description = serverPlaylist.description || 'Collaborative Server Mix'
    creator = `Created by ${serverPlaylist.createdBy?.username || 'Member'}`
    trackCount = Array.isArray(serverPlaylist.tracks) ? serverPlaylist.tracks.length : 0
    isMix = true
  } else if (currentType === 'spotify-playlist' && spotifyPlaylist) {
    title = spotifyPlaylist.name || 'Spotify Playlist'
    description = spotifyPlaylist.description || 'Spotify Playlist'
    const ownerName = spotifyPlaylist.owner?.display_name || spotifyPlaylist.owner?.id || 'Spotify'
    creator = `By ${ownerName}`
    trackCount = spotifyPlaylist.tracks?.total ?? spotifyPlaylist.items?.total ?? 0
    coverImage = spotifyPlaylist.images?.[0]?.url || null
  } else if (currentType === 'liked-songs') {
    title = 'Liked Songs'
    description = 'Your saved Spotify tracks'
    creator = 'Personal Spotify Library'
    trackCount = Array.isArray(likedTracks) ? likedTracks.length : 0
  }

  // Handle adding a specific resolved track (from suggestion click or Enter key)
  const handleSelectSearchResult = async (track: SerializedTrack) => {
    setIsAddingSearch(true)
    setShowDropdown(false)
    setStatusNotice(null)

    try {
      if (isMix && onAddTrackToServerMix) {
        await onAddTrackToServerMix({
          title: track.title,
          author: track.author,
          duration: track.duration,
          durationMS: track.durationMS,
          thumbnail: track.thumbnail,
          url: track.url,
        })
        setStatusNotice(`Added "${track.title}" to Server Mix!`)
      } else {
        await onQueueTrack({ url: track.url, title: `${track.title} - ${track.author}` })
        setStatusNotice(`Queued "${track.title}" in Discord!`)
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

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    const query = searchQuery.trim()
    if (!query || isAddingSearch) return

    setIsAddingSearch(true)
    setShowDropdown(false)
    setStatusNotice(null)

    try {
      // First, attempt to resolve via live search results or search API so real metadata is saved
      let resolvedTrack: SerializedTrack | null = null
      if (searchResults.length > 0) {
        resolvedTrack = searchResults[0]
      } else if (guildId) {
        try {
          const res = await fetch(`/api/music/${guildId}/search?query=${encodeURIComponent(query)}`)
          if (res.ok) {
            const data: SerializedTrack[] = await res.json()
            if (data.length > 0) {
              resolvedTrack = data[0]
            }
          }
        } catch {
          // Fall back to direct query
        }
      }

      if (isMix && onAddTrackToServerMix) {
        if (resolvedTrack) {
          await onAddTrackToServerMix({
            title: resolvedTrack.title,
            author: resolvedTrack.author,
            duration: resolvedTrack.duration,
            durationMS: resolvedTrack.durationMS,
            thumbnail: resolvedTrack.thumbnail,
            url: resolvedTrack.url,
          })
          setStatusNotice(`Added "${resolvedTrack.title}" by ${resolvedTrack.author}!`)
        } else {
          // Backend PlaylistService will auto-resolve before saving to DB
          await onAddTrackToServerMix({
            title: query,
            author: 'Added via Search',
            duration: '--:--',
            durationMS: 0,
            thumbnail: '',
            url: query,
          })
          setStatusNotice(`Added "${query}" to Server Mix!`)
        }
      } else {
        const playUrl = resolvedTrack?.url || query
        const playTitle = resolvedTrack ? `${resolvedTrack.title} - ${resolvedTrack.author}` : query
        await onQueueTrack({ url: playUrl, title: playTitle })
        setStatusNotice(`Queued "${playTitle}" in Discord!`)
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
      const tracks = (serverPlaylist.tracks || []).map((t) => ({
        url: t.url,
        title: `${t.title} - ${t.author}`,
      }))
      await onPlayAll(tracks)
    } else if (currentType === 'spotify-playlist') {
      const tracks = (spotifyTracks || []).map((t) => ({
        url: t.external_urls?.spotify || `https://open.spotify.com/track/${t.id}`,
        title: `${t.name} - ${(t.artists || []).map((a) => a.name).join(', ')}`,
      }))
      await onPlayAll(tracks)
    } else if (currentType === 'liked-songs') {
      const tracks = (likedTracks || []).map((t) => ({
        url: t.external_urls?.spotify || `https://open.spotify.com/track/${t.id}`,
        title: `${t.name} - ${(t.artists || []).map((a) => a.name).join(', ')}`,
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

      {/* SEARCH & QUICK ADD BAR WITH LIVE AUTOCOMPLETE */}
      <div className="p-6 pb-2">
        <div ref={searchContainerRef} className="relative max-w-2xl">
          <form onSubmit={handleQuickAdd} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onFocus={() => {
                  if (searchResults.length > 0) setShowDropdown(true)
                }}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  isMix
                    ? 'Search song title, artist, or YouTube/Spotify link to add...'
                    : 'Search or paste a link to play in Discord voice...'
                }
                className="w-full pl-10 pr-9 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors"
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 animate-spin" />
              )}
            </div>
            <button
              type="submit"
              disabled={!searchQuery.trim() || isAddingSearch}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-white hover:bg-zinc-200 text-black text-xs font-semibold rounded-xl transition-all disabled:opacity-40 shrink-0"
            >
              {isAddingSearch ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              <span>{isMix ? 'Add to Mix' : 'Play in Voice'}</span>
            </button>
          </form>

          {/* AUTOCOMPLETE DROPDOWN RESULTS */}
          {showDropdown && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-[#0e0e11] border border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-30 max-h-80 overflow-y-auto divide-y divide-zinc-900">
              <div className="px-3 py-1.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider bg-zinc-950 flex items-center justify-between">
                <span>Resolved Songs</span>
                <span className="flex items-center gap-1 text-emerald-400">
                  <Sparkles className="w-3 h-3" />
                  Instant Match
                </span>
              </div>
              {searchResults.map((result, idx) => (
                <div
                  key={`${result.id || result.url}-${idx}`}
                  className="p-2.5 hover:bg-zinc-900/90 flex items-center justify-between gap-3 transition-colors group cursor-pointer"
                  onClick={() => handleSelectSearchResult(result)}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {result.thumbnail ? (
                      <img
                        src={result.thumbnail}
                        alt={result.title}
                        className="w-10 h-10 rounded-md object-cover ring-1 ring-zinc-800 shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                        <Music className="w-4 h-4 text-zinc-500" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-white truncate group-hover:text-emerald-400 transition-colors">
                        {result.title}
                      </div>
                      <div className="text-[11px] text-zinc-400 truncate">
                        {result.author} {result.duration && `• ${result.duration}`}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSelectSearchResult(result)
                      }}
                      className="px-2.5 py-1 rounded-md bg-zinc-800 hover:bg-white text-zinc-300 hover:text-black text-[11px] font-medium transition-all"
                    >
                      {isMix ? 'Add' : 'Play'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

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
          (serverPlaylist.tracks || []).length === 0 ? (
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
                  {(serverPlaylist.tracks || []).map((t, index) => {
                    const adderName = t?.addedBy?.username || 'Member'
                    const adderAvatar = t?.addedBy?.avatar
                    return (
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
                            {adderAvatar ? (
                              <img
                                src={adderAvatar}
                                alt={adderName}
                                className="w-4 h-4 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-4 h-4 rounded-full bg-zinc-800 text-[9px] flex items-center justify-center text-zinc-300">
                                {adderName.charAt(0)}
                              </div>
                            )}
                            <span className="text-[11px] text-zinc-300 truncate max-w-[120px]">
                              {adderName}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-zinc-400">
                          {t.duration && t.duration !== '--:--' ? t.duration : (t.durationMS > 0 ? formatTime(t.durationMS) : '--:--')}
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
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* SPOTIFY PLAYLIST OR LIKED SONGS */
          (() => {
            const tracksToDisplay = (currentType === 'liked-songs' ? likedTracks : spotifyTracks).filter(Boolean)
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
                      const artistNames = (track.artists || []).map((a) => a.name).join(', ') || 'Unknown Artist'
                      const spotifyUrl = track.external_urls?.spotify || `https://open.spotify.com/track/${track.id}`

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
                                  url: spotifyUrl,
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
                            {formatTime(track.duration_ms || 0)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() =>
                                  onQueueTrack({
                                    url: spotifyUrl,
                                    title: `${track.name} - ${artistNames}`,
                                  })
                                }
                                className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                                title="Queue in Discord"
                              >
                                <ListPlus className="w-3.5 h-3.5" />
                              </button>
                              <a
                                href={spotifyUrl}
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
