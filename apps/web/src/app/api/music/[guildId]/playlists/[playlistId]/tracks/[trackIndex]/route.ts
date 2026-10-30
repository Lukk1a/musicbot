// apps/web/src/app/api/music/[guildId]/playlists/[playlistId]/tracks/[trackIndex]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { removeTrackFromServerPlaylist } from '@/lib/bot-api'

interface RouteProps {
  params: Promise<{
    guildId: string
    playlistId: string
    trackIndex: string
  }>
}

export async function DELETE(req: NextRequest, { params }: RouteProps) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized: Session required' }, { status: 401 })
  }

  try {
    const { guildId, playlistId, trackIndex } = await params
    const indexNum = parseInt(trackIndex, 10)
    if (isNaN(indexNum)) {
      return NextResponse.json({ error: 'Invalid track index' }, { status: 400 })
    }

    const playlist = await removeTrackFromServerPlaylist(
      guildId,
      playlistId,
      indexNum,
      session.user.id
    )

    return NextResponse.json(playlist)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to remove track'
    return NextResponse.json({ error: msg }, { status: 403 })
  }
}
