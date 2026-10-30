// apps/web/src/app/api/music/[guildId]/batch-play/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { batchPlayTracks } from '@/lib/bot-api'

interface RouteProps {
  params: Promise<{
    guildId: string
  }>
}

export async function POST(req: NextRequest, { params }: RouteProps) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized: Session required' }, { status: 401 })
  }

  try {
    const { guildId } = await params
    const body = (await req.json()) as { tracks: Array<{ url: string; title: string }> }
    if (!body.tracks || !body.tracks.length) {
      return NextResponse.json({ error: 'Tracks array is required and cannot be empty' }, { status: 400 })
    }

    const state = await batchPlayTracks(guildId, session.user.id, body.tracks)
    return NextResponse.json(state)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to batch play tracks'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
