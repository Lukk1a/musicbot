// apps/web/src/app/api/spotify/playlists/route.ts
import { NextResponse } from 'next/server'
import { getValidSpotifyToken, getSpotifyUserPlaylists } from '@/lib/spotify'

export async function GET() {
  try {
    const auth = await getValidSpotifyToken()
    if (!auth) {
      return NextResponse.json({ error: 'Spotify account not connected' }, { status: 401 })
    }

    const playlists = await getSpotifyUserPlaylists(auth.accessToken)
    return NextResponse.json(playlists)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch Spotify playlists'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
