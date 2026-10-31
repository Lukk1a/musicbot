// apps/web/src/lib/spotify.ts
import { cookies } from 'next/headers'
import type {
  SpotifyTrackItem,
  SpotifyUserPlaylist,
  SpotifyUserProfile,
} from '@musicbot/shared'

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || '3951a3c0933f4c0fb55d7399a9d8d14a'
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || '199ecc091d8041e58cb11af3f23386ee'
const SPOTIFY_REDIRECT_URI =
  process.env.SPOTIFY_REDIRECT_URI || 'https://play.lukka.dev/api/spotify/callback'

export const SPOTIFY_COOKIE_NAME = 'monotone_spotify_tokens'

export interface SpotifyTokens {
  access_token: string
  refresh_token: string
  expires_at: number // UNIX timestamp in ms
  token_type: string
  scope: string
}

const SCOPES = [
  'user-read-private',
  'user-read-email',
  'playlist-read-private',
  'playlist-read-collaborative',
  'user-library-read',
].join(' ')

/**
 * Generate the Spotify OAuth2 login URL.
 */
export function getSpotifyAuthUrl(guildId?: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: SPOTIFY_CLIENT_ID,
    scope: SCOPES,
    redirect_uri: SPOTIFY_REDIRECT_URI,
    show_dialog: 'true',
    state: guildId || '',
  })

  return `https://accounts.spotify.com/authorize?${params.toString()}`
}

/**
 * Exchange authorization code for Spotify access & refresh tokens.
 */
export async function exchangeCodeForTokens(code: string): Promise<SpotifyTokens> {
  const basicAuth = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: SPOTIFY_REDIRECT_URI,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(`Spotify token exchange failed (${response.status}): ${errorText}`)
  }

  const data = await response.json()
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + (data.expires_in - 60) * 1000,
    token_type: data.token_type || 'Bearer',
    scope: data.scope || '',
  }
}

/**
 * Refresh an expired Spotify access token using the refresh token.
 */
export async function refreshAccessToken(refreshToken: string): Promise<SpotifyTokens> {
  const basicAuth = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(`Spotify token refresh failed (${response.status}): ${errorText}`)
  }

  const data = await response.json()
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token || refreshToken,
    expires_at: Date.now() + (data.expires_in - 60) * 1000,
    token_type: data.token_type || 'Bearer',
    scope: data.scope || '',
  }
}

/**
 * Retrieve a valid Spotify access token from the HTTP-only cookie,
 * automatically refreshing it if it is expired.
 */
export async function getValidSpotifyToken(): Promise<{
  accessToken: string
  newTokens?: SpotifyTokens
} | null> {
  const cookieStore = await cookies()
  const rawCookie = cookieStore.get(SPOTIFY_COOKIE_NAME)?.value

  if (!rawCookie) {
    return null
  }

  try {
    const tokens: SpotifyTokens = JSON.parse(
      Buffer.from(rawCookie, 'base64').toString('utf8')
    )

    // Check if token is still valid (with 60s buffer)
    if (Date.now() < tokens.expires_at) {
      return { accessToken: tokens.access_token }
    }

    // Attempt token refresh
    if (tokens.refresh_token) {
      const refreshed = await refreshAccessToken(tokens.refresh_token)
      try {
        cookieStore.set(SPOTIFY_COOKIE_NAME, Buffer.from(JSON.stringify(refreshed)).toString('base64'), {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 30 * 24 * 60 * 60, // 30 days
        })
      } catch {
        // Safe fallback in read-only route contexts
      }
      return { accessToken: refreshed.access_token, newTokens: refreshed }
    }

    return null
  } catch (err) {
    console.error('[Spotify] Error reading/refreshing tokens:', err)
    return null
  }
}

/**
 * Get profile of current Spotify user.
 */
export async function getSpotifyCurrentUser(accessToken: string): Promise<SpotifyUserProfile> {
  const response = await fetch('https://api.spotify.com/v1/me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch Spotify user profile (${response.status})`)
  }

  const data = await response.json()
  return {
    id: data.id || '',
    display_name: data.display_name || data.id || 'Spotify User',
    email: data.email || undefined,
    images: Array.isArray(data.images) ? data.images.filter(Boolean) : [],
  }
}

/**
 * Fetch current user's Spotify playlists with defensive mapping.
 */
export async function getSpotifyUserPlaylists(
  accessToken: string,
  limit = 50
): Promise<SpotifyUserPlaylist[]> {
  const response = await fetch(`https://api.spotify.com/v1/me/playlists?limit=${limit}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch Spotify playlists (${response.status})`)
  }

  const data = await response.json()
  const rawItems = Array.isArray(data.items) ? data.items : []

  return rawItems
    .filter((pl: unknown): pl is Record<string, unknown> => Boolean(pl && typeof pl === 'object'))
    .map((pl: Record<string, unknown>) => {
      const id = String(pl.id || '')
      const name = String(pl.name || 'Untitled Playlist')
      const description = pl.description ? String(pl.description) : null
      const images = Array.isArray(pl.images)
        ? pl.images
            .filter((img: unknown): img is { url: string; height?: number; width?: number } =>
              Boolean(img && typeof img === 'object' && (img as { url?: string }).url)
            )
            .map((img: { url: string; height?: number; width?: number }) => ({
              url: img.url,
              height: img.height,
              width: img.width,
            }))
        : []

      const rawOwner = (pl.owner && typeof pl.owner === 'object') ? (pl.owner as Record<string, unknown>) : {}
      const ownerDisplayName = String(rawOwner.display_name || rawOwner.id || 'Spotify')
      const ownerId = String(rawOwner.id || '')

      const rawTracks = (pl.tracks && typeof pl.tracks === 'object') ? (pl.tracks as Record<string, unknown>) : {}
      const rawItemsObj = (pl.items && typeof pl.items === 'object') ? (pl.items as Record<string, unknown>) : {}

      let totalTracks = 0
      if (typeof rawItemsObj.total === 'number') {
        totalTracks = rawItemsObj.total
      } else if (typeof rawTracks.total === 'number') {
        totalTracks = rawTracks.total
      } else if (typeof pl.total_tracks === 'number') {
        totalTracks = pl.total_tracks
      } else if (typeof pl.item_count === 'number') {
        totalTracks = pl.item_count
      } else if (typeof pl.tracks === 'number') {
        totalTracks = pl.tracks
      } else if (rawItemsObj.total !== undefined && rawItemsObj.total !== null && !isNaN(Number(rawItemsObj.total))) {
        totalTracks = Number(rawItemsObj.total)
      } else if (rawTracks.total !== undefined && rawTracks.total !== null && !isNaN(Number(rawTracks.total))) {
        totalTracks = Number(rawTracks.total)
      }

      const rawUrls = (pl.external_urls && typeof pl.external_urls === 'object')
        ? (pl.external_urls as Record<string, unknown>)
        : {}
      const spotifyUrl = String(rawUrls.spotify || (id ? `https://open.spotify.com/playlist/${id}` : ''))

      return {
        id,
        name,
        description,
        images,
        owner: {
          display_name: ownerDisplayName,
          id: ownerId,
        },
        tracks: {
          total: totalTracks,
        },
        items: {
          total: totalTracks,
        },
        external_urls: {
          spotify: spotifyUrl,
        },
      }
    })
}

/**
 * Fetch tracks from a specific Spotify playlist with defensive mapping.
 */
export async function getSpotifyPlaylistTracks(
  accessToken: string,
  playlistId: string
): Promise<SpotifyTrackItem[]> {
  // Try /items first (2025/2026 Spotify Web API standard), fallback to /tracks
  let response = await fetch(
    `https://api.spotify.com/v1/playlists/${playlistId}/items?limit=100`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: 'no-store',
    }
  )

  if (!response.ok) {
    response = await fetch(
      `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: 'no-store',
      }
    )
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch playlist tracks (${response.status})`)
  }

  const data = await response.json()
  const rawItems = Array.isArray(data.items) ? data.items : []
  const tracks: SpotifyTrackItem[] = []

  for (const item of rawItems) {
    if (item && typeof item === 'object') {
      const rawTrack = (item.track || item.item) as Record<string, unknown> | undefined
      if (!rawTrack || typeof rawTrack !== 'object') continue

      const id = String(rawTrack.id || '')
      if (!id) continue

      const name = String(rawTrack.name || 'Untitled Track')
      const artists = Array.isArray(rawTrack.artists)
        ? rawTrack.artists
            .filter((a: unknown): a is { name?: string; id?: string } => Boolean(a && typeof a === 'object'))
            .map((a: { name?: string; id?: string }) => ({
              name: String(a.name || 'Unknown Artist'),
              id: String(a.id || ''),
            }))
        : []

      const rawAlbum = (rawTrack.album && typeof rawTrack.album === 'object') ? (rawTrack.album as Record<string, unknown>) : {}
      const albumImages = Array.isArray(rawAlbum.images)
        ? rawAlbum.images.filter((img: unknown): img is { url: string; height?: number; width?: number } =>
            Boolean(img && typeof img === 'object' && (img as { url?: string }).url)
          )
        : []

      const rawUrls = (rawTrack.external_urls && typeof rawTrack.external_urls === 'object')
        ? (rawTrack.external_urls as Record<string, unknown>)
        : {}

      tracks.push({
        id,
        name,
        artists,
        album: {
          name: String(rawAlbum.name || ''),
          images: albumImages,
        },
        duration_ms: typeof rawTrack.duration_ms === 'number' ? rawTrack.duration_ms : 0,
        external_urls: {
          spotify: String(rawUrls.spotify || `https://open.spotify.com/track/${id}`),
        },
        uri: String(rawTrack.uri || `spotify:track:${id}`),
      })
    }
  }

  return tracks
}

/**
 * Fetch user's saved/liked tracks from Spotify with defensive mapping.
 */
export async function getSpotifyLikedTracks(
  accessToken: string,
  limit = 50
): Promise<SpotifyTrackItem[]> {
  const response = await fetch(`https://api.spotify.com/v1/me/tracks?limit=${limit}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch liked Spotify tracks (${response.status})`)
  }

  const data = await response.json()
  const rawItems = Array.isArray(data.items) ? data.items : []
  const tracks: SpotifyTrackItem[] = []

  for (const item of rawItems) {
    if (item && typeof item === 'object' && item.track && typeof item.track === 'object') {
      const t = item.track as Record<string, unknown>
      const id = String(t.id || '')
      if (!id) continue

      const name = String(t.name || 'Untitled Track')
      const artists = Array.isArray(t.artists)
        ? t.artists
            .filter((a: unknown): a is { name?: string; id?: string } => Boolean(a && typeof a === 'object'))
            .map((a: { name?: string; id?: string }) => ({
              name: String(a.name || 'Unknown Artist'),
              id: String(a.id || ''),
            }))
        : []

      const rawAlbum = (t.album && typeof t.album === 'object') ? (t.album as Record<string, unknown>) : {}
      const albumImages = Array.isArray(rawAlbum.images)
        ? rawAlbum.images.filter((img: unknown): img is { url: string; height?: number; width?: number } =>
            Boolean(img && typeof img === 'object' && (img as { url?: string }).url)
          )
        : []

      const rawUrls = (t.external_urls && typeof t.external_urls === 'object')
        ? (t.external_urls as Record<string, unknown>)
        : {}

      tracks.push({
        id,
        name,
        artists,
        album: {
          name: String(rawAlbum.name || ''),
          images: albumImages,
        },
        duration_ms: typeof t.duration_ms === 'number' ? t.duration_ms : 0,
        external_urls: {
          spotify: String(rawUrls.spotify || `https://open.spotify.com/track/${id}`),
        },
        uri: String(t.uri || `spotify:track:${id}`),
      })
    }
  }

  return tracks
}
