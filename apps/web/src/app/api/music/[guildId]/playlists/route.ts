// apps/web/src/app/api/music/[guildId]/playlists/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getServerPlaylists, createServerPlaylist } from '@/lib/bot-api'

interface RouteProps {
  params: Promise<{
    guildId: string
  }>
}

export async function GET(req: NextRequest, { params }: RouteProps) {
  try {
    const { guildId } = await params
    const playlists = await getServerPlaylists(guildId)
    return NextResponse.json(playlists)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to get playlists'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: RouteProps) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized: Session required' }, { status: 401 })
  }

  try {
    const { guildId } = await params
    const body = (await req.json()) as { name: string; description?: string }
    if (!body.name) {
      return NextResponse.json({ error: 'Playlist name is required' }, { status: 400 })
    }

    const playlist = await createServerPlaylist(guildId, {
      userId: session.user.id,
      username: session.user.name || 'Anonymous',
      avatar: session.user.image || undefined,
      name: body.name,
      description: body.description,
    })

    return NextResponse.json(playlist)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to create playlist'
    return NextResponse.json({ error: msg }, { status: 403 })
  }
}
