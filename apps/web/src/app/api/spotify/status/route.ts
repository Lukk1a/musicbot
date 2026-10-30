// apps/web/src/app/api/spotify/status/route.ts
import { NextResponse } from 'next/server'
import { getValidSpotifyToken, getSpotifyCurrentUser } from '@/lib/spotify'

export async function GET() {
  try {
    const auth = await getValidSpotifyToken()
    if (!auth) {
      return NextResponse.json({ connected: false })
    }

    const user = await getSpotifyCurrentUser(auth.accessToken)
    return NextResponse.json({
      connected: true,
      user,
    })
  } catch (err) {
    console.error('[Spotify Status] Error checking status:', err)
    return NextResponse.json({ connected: false })
  }
}
