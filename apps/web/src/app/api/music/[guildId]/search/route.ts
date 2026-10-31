// apps/web/src/app/api/music/[guildId]/search/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { searchTracks } from '@/lib/bot-api'

interface RouteProps {
  params: Promise<{
    guildId: string
  }>
}

export async function GET(req: NextRequest, { params }: RouteProps) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized: Session required' }, { status: 401 })
  }

  try {
    const { guildId } = await params
    const { searchParams } = new URL(req.url)
    const query = searchParams.get('query') || ''

    if (!query.trim()) {
      return NextResponse.json([])
    }

    const results = await searchTracks(guildId, query.trim())
    return NextResponse.json(results)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Search failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
