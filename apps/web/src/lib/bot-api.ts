// apps/web/src/lib/bot-api.ts
import type {
  GuildMusicConfigData,
  GuildPlayerState,
  MutualGuildStatus,
  PlayerControlAction,
  SerializedTrack,
  ServerPlaylist,
  ServerPlaylistTrack,
} from '@musicbot/shared'

const BOT_API_URL = process.env.INTERNAL_BOT_API_URL || 'http://127.0.0.1:4000'
const BOT_API_ADMIN_TOKEN = process.env.BOT_API_ADMIN_TOKEN || ''

async function botFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    Authorization: `Bearer ${BOT_API_ADMIN_TOKEN}`,
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }

  const res = await fetch(`${BOT_API_URL}${endpoint}`, {
    ...options,
    headers,
    cache: 'no-store',
  })

  if (!res.ok) {
    const rawText = await res.text().catch(() => '')
    let errorMsg = res.statusText
    try {
      const parsed = JSON.parse(rawText)
      errorMsg = parsed.message || parsed.error || errorMsg
    } catch {
      if (rawText) errorMsg = rawText
    }
    throw new Error(errorMsg)
  }

  return res.json()
}

export async function getGuildPlayerState(guildId: string): Promise<GuildPlayerState> {
  return botFetch<GuildPlayerState>(`/music/${guildId}/state`)
}

export async function sendPlayerControlAction(
  guildId: string,
  action: PlayerControlAction
): Promise<GuildPlayerState> {
  return botFetch<GuildPlayerState>(`/music/${guildId}/control`, {
    method: 'POST',
    body: JSON.stringify(action),
  })
}

export async function getMutualGuilds(guildIds: string[]): Promise<MutualGuildStatus[]> {
  const query = encodeURIComponent(guildIds.join(','))
  try {
    return await botFetch<MutualGuildStatus[]>(`/music/guilds/mutual?guildIds=${query}`)
  } catch {
    return []
  }
}

export async function getGuildMusicConfig(guildId: string): Promise<GuildMusicConfigData> {
  return botFetch<GuildMusicConfigData>(`/music/${guildId}/config`)
}

export async function updateGuildMusicConfig(
  guildId: string,
  userId: string,
  updates: Partial<GuildMusicConfigData>
): Promise<GuildMusicConfigData> {
  return botFetch<GuildMusicConfigData>(`/music/${guildId}/config`, {
    method: 'POST',
    body: JSON.stringify({ userId, updates }),
  })
}

export async function getServerPlaylists(guildId: string): Promise<ServerPlaylist[]> {
  return botFetch<ServerPlaylist[]>(`/music/${guildId}/playlists`)
}

export async function getServerPlaylist(guildId: string, playlistId: string): Promise<ServerPlaylist> {
  return botFetch<ServerPlaylist>(`/music/${guildId}/playlists/${playlistId}`)
}

export async function createServerPlaylist(
  guildId: string,
  payload: {
    userId: string
    username: string
    avatar?: string
    name: string
    description?: string
  }
): Promise<ServerPlaylist> {
  return botFetch<ServerPlaylist>(`/music/${guildId}/playlists`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function deleteServerPlaylist(
  guildId: string,
  playlistId: string,
  userId: string
): Promise<{ success: boolean }> {
  return botFetch<{ success: boolean }>(`/music/${guildId}/playlists/${playlistId}`, {
    method: 'DELETE',
    body: JSON.stringify({ userId }),
  })
}

export async function addTrackToServerPlaylist(
  guildId: string,
  playlistId: string,
  payload: {
    userId: string
    username: string
    avatar?: string
    track: Omit<ServerPlaylistTrack, 'id' | 'addedBy' | 'addedAt'>
  }
): Promise<ServerPlaylist> {
  return botFetch<ServerPlaylist>(`/music/${guildId}/playlists/${playlistId}/tracks`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function removeTrackFromServerPlaylist(
  guildId: string,
  playlistId: string,
  trackIndex: number,
  userId: string
): Promise<ServerPlaylist> {
  return botFetch<ServerPlaylist>(`/music/${guildId}/playlists/${playlistId}/tracks/${trackIndex}`, {
    method: 'DELETE',
    body: JSON.stringify({ userId }),
  })
}

export async function playServerPlaylist(
  guildId: string,
  playlistId: string,
  userId: string
): Promise<GuildPlayerState> {
  return botFetch<GuildPlayerState>(`/music/${guildId}/playlists/${playlistId}/play`, {
    method: 'POST',
    body: JSON.stringify({ userId }),
  })
}

export async function batchPlayTracks(
  guildId: string,
  userId: string,
  tracks: Array<{ url: string; title: string }>
): Promise<GuildPlayerState> {
  return botFetch<GuildPlayerState>(`/music/${guildId}/batch-play`, {
    method: 'POST',
    body: JSON.stringify({ userId, tracks }),
  })
}

export async function searchTracks(guildId: string, query: string): Promise<SerializedTrack[]> {
  const encoded = encodeURIComponent(query)
  return botFetch<SerializedTrack[]>(`/music/${guildId}/search?query=${encoded}`)
}
