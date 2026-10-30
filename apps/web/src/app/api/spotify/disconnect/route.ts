// apps/web/src/app/api/spotify/disconnect/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { SPOTIFY_COOKIE_NAME } from '@/lib/spotify'

export async function POST() {
  const cookieStore = await cookies()
  cookieStore.delete(SPOTIFY_COOKIE_NAME)
  return NextResponse.json({ success: true })
}
