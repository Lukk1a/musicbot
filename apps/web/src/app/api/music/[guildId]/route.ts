// apps/web/src/app/api/music/[guildId]/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/lib/auth'
import { getGuildPlayerState, sendPlayerControlAction } from '@/lib/bot-api'
import type { PlayerControlAction } from '@musicbot/shared'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: 'Unauthorized: Session required' }, { status: 401 })
  }

  const { guildId } = await params
  if (!guildId) {
    return NextResponse.json({ error: 'Guild ID is required' }, { status: 400 })
  }

  try {
    const state = await getGuildPlayerState(guildId)
    return NextResponse.json(state)
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to retrieve player state'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: 'Unauthorized: Session required' }, { status: 401 })
  }

  const { guildId } = await params
  if (!guildId) {
    return NextResponse.json({ error: 'Guild ID is required' }, { status: 400 })
  }

  try {
    const body = await request.json()
    // Inject acting userId from the verified NextAuth server session
    const actionPayload: PlayerControlAction = {
      ...body,
      userId: session.user.id,
    }

    const updatedState = await sendPlayerControlAction(guildId, actionPayload)
    return NextResponse.json(updatedState)
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Control action failed'
    const status = msg.includes('Voice') || msg.includes('voice channel') || msg.includes('Unauthorized') ? 403 : 400
    return NextResponse.json({ error: msg }, { status })
  }
}
