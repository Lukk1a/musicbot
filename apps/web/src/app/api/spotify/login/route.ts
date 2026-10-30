// apps/web/src/app/api/spotify/login/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSpotifyAuthUrl } from '@/lib/spotify'

export async function GET(req: NextRequest) {
  const guildId = req.nextUrl.searchParams.get('guildId') || ''
  const authUrl = getSpotifyAuthUrl(guildId)
  return NextResponse.redirect(authUrl)
}
