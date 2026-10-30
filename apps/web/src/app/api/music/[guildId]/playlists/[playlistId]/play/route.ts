// apps/web/src/app/api/music/[guildId]/playlists/[playlistId]/play/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { playServerPlaylist } from '@/lib/bot-api'

interface RouteProps {
  params: Promise<{
    guildId: string
    playlistId: string
  }>
}

export async function POST(req: NextRequest, { params }: RouteProps) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized: Session required' }, { status: 401 })
  }

  try {
    const { guildId, playlistId } = await params
    const state = await playServerPlaylist(guildId, playlistId, session.user.id)
    return NextResponse.json(state)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to play playlist'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
