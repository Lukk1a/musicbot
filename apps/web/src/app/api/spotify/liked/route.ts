// apps/web/src/app/api/spotify/liked/route.ts
import { NextResponse } from 'next/server'
import { getValidSpotifyToken, getSpotifyLikedTracks } from '@/lib/spotify'

export async function GET() {
  try {
    const auth = await getValidSpotifyToken()
    if (!auth) {
      return NextResponse.json({ error: 'Spotify account not connected' }, { status: 401 })
    }

    const tracks = await getSpotifyLikedTracks(auth.accessToken)
    return NextResponse.json(tracks)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch liked tracks'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
