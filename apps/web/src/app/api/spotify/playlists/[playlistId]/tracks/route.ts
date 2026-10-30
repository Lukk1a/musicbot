// apps/web/src/app/api/spotify/playlists/[playlistId]/tracks/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getValidSpotifyToken, getSpotifyPlaylistTracks } from '@/lib/spotify'

interface RouteProps {
  params: Promise<{
    playlistId: string
  }>
}

export async function GET(req: NextRequest, { params }: RouteProps) {
  try {
    const { playlistId } = await params
    const auth = await getValidSpotifyToken()
    if (!auth) {
      return NextResponse.json({ error: 'Spotify account not connected' }, { status: 401 })
    }

    const tracks = await getSpotifyPlaylistTracks(auth.accessToken, playlistId)
    return NextResponse.json(tracks)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch playlist tracks'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
