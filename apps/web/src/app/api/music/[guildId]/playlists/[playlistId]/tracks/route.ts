// apps/web/src/app/api/music/[guildId]/playlists/[playlistId]/tracks/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { addTrackToServerPlaylist } from '@/lib/bot-api'
import type { ServerPlaylistTrack } from '@musicbot/shared'

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
    const body = (await req.json()) as {
      track: Omit<ServerPlaylistTrack, 'id' | 'addedBy' | 'addedAt'>
    }

    if (!body.track || !body.track.url) {
      return NextResponse.json({ error: 'Track details and URL are required' }, { status: 400 })
    }

    const playlist = await addTrackToServerPlaylist(guildId, playlistId, {
      userId: session.user.id,
      username: session.user.name || 'Anonymous',
      avatar: session.user.image || undefined,
      track: body.track,
    })

    return NextResponse.json(playlist)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to add track to playlist'
    return NextResponse.json({ error: msg }, { status: 403 })
  }
}
