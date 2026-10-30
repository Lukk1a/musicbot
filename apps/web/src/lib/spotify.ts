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

    // Check if token is still valid (with buffer)
    if (Date.now() < tokens.expires_at) {
      return { accessToken: tokens.access_token }
    }

    // Attempt token refresh
    if (tokens.refresh_token) {
      const refreshed = await refreshAccessToken(tokens.refresh_token)
      cookieStore.set(SPOTIFY_COOKIE_NAME, Buffer.from(JSON.stringify(refreshed)).toString('base64'), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 24 * 60 * 60, // 30 days
      })
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

  return response.json()
}

/**
 * Fetch current user's Spotify playlists.
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
  return data.items || []
}

/**
 * Fetch tracks from a specific Spotify playlist.
 */
export async function getSpotifyPlaylistTracks(
  accessToken: string,
  playlistId: string
): Promise<SpotifyTrackItem[]> {
  const response = await fetch(
    `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: 'no-store',
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch playlist tracks (${response.status})`)
  }

  const data = await response.json()
  // Map playlist items to SpotifyTrackItem
  const tracks: SpotifyTrackItem[] = []
  for (const item of data.items || []) {
    if (item.track && item.track.id) {
      tracks.push({
        id: item.track.id,
        name: item.track.name,
        artists: (item.track.artists || []).map((a: { name: string; id: string }) => ({
          name: a.name,
          id: a.id,
        })),
        album: {
          name: item.track.album?.name || '',
          images: item.track.album?.images || [],
        },
        duration_ms: item.track.duration_ms || 0,
        external_urls: item.track.external_urls || {
          spotify: `https://open.spotify.com/track/${item.track.id}`,
        },
        uri: item.track.uri || `spotify:track:${item.track.id}`,
      })
    }
  }

  return tracks
}

/**
 * Fetch user's saved/liked tracks from Spotify.
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
  const tracks: SpotifyTrackItem[] = []
  for (const item of data.items || []) {
    if (item.track && item.track.id) {
      tracks.push({
        id: item.track.id,
        name: item.track.name,
        artists: (item.track.artists || []).map((a: { name: string; id: string }) => ({
          name: a.name,
          id: a.id,
        })),
        album: {
          name: item.track.album?.name || '',
          images: item.track.album?.images || [],
        },
        duration_ms: item.track.duration_ms || 0,
        external_urls: item.track.external_urls || {
          spotify: `https://open.spotify.com/track/${item.track.id}`,
        },
        uri: item.track.uri || `spotify:track:${item.track.id}`,
      })
    }
  }

  return tracks
}
