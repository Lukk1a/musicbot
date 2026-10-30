// apps/web/src/app/api/music/[guildId]/config/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getGuildMusicConfig, updateGuildMusicConfig } from '@/lib/bot-api'
import type { GuildMusicConfigData } from '@musicbot/shared'

interface RouteProps {
  params: Promise<{
    guildId: string
  }>
}

export async function GET(req: NextRequest, { params }: RouteProps) {
  try {
    const { guildId } = await params
    const config = await getGuildMusicConfig(guildId)
    return NextResponse.json(config)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to get config'
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
    const body = (await req.json()) as { updates: Partial<GuildMusicConfigData> }
    const updated = await updateGuildMusicConfig(guildId, session.user.id, body.updates || {})
    return NextResponse.json(updated)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to update config'
    return NextResponse.json({ error: msg }, { status: 403 })
  }
}
