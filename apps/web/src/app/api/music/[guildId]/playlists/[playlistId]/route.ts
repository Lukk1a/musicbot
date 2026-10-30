// apps/web/src/app/api/music/[guildId]/playlists/[playlistId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getServerPlaylist, deleteServerPlaylist } from '@/lib/bot-api'

interface RouteProps {
  params: Promise<{
    guildId: string
    playlistId: string
  }>
}

export async function GET(req: NextRequest, { params }: RouteProps) {
  try {
    const { guildId, playlistId } = await params
    const playlist = await getServerPlaylist(guildId, playlistId)
    return NextResponse.json(playlist)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to get playlist'
    return NextResponse.json({ error: msg }, { status: 404 })
  }
}

export async function DELETE(req: NextRequest, { params }: RouteProps) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized: Session required' }, { status: 401 })
  }

  try {
    const { guildId, playlistId } = await params
    const result = await deleteServerPlaylist(guildId, playlistId, session.user.id)
    return NextResponse.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to delete playlist'
    return NextResponse.json({ error: msg }, { status: 403 })
  }
}
