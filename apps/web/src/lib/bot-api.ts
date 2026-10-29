// apps/web/src/lib/bot-api.ts
import type { GuildPlayerState, MutualGuildStatus, PlayerControlAction } from '@musicbot/shared'

const BOT_API_URL = process.env.INTERNAL_BOT_API_URL || 'http://127.0.0.1:4000'
const BOT_API_ADMIN_TOKEN = process.env.BOT_API_ADMIN_TOKEN || ''

export async function getGuildPlayerState(guildId: string): Promise<GuildPlayerState> {
  const res = await fetch(`${BOT_API_URL}/music/${guildId}/state`, {
    headers: {
      Authorization: `Bearer ${BOT_API_ADMIN_TOKEN}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  })

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(errorBody.message || `Failed to fetch player state (HTTP ${res.status})`)
  }

  return res.json()
}

export async function sendPlayerControlAction(
  guildId: string,
  action: PlayerControlAction
): Promise<GuildPlayerState> {
  const res = await fetch(`${BOT_API_URL}/music/${guildId}/control`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${BOT_API_ADMIN_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(action),
    cache: 'no-store',
  })

  if (!res.ok) {
    const rawText = await res.text().catch(() => '')
    let errorMsg = res.statusText
    try {
      const parsed = JSON.parse(rawText)
      errorMsg = parsed.message || parsed.error || errorMsg
    } catch {
      if (rawText) errorMsg = rawText
    }
    throw new Error(errorMsg)
  }

  return res.json()
}

export async function getMutualGuilds(guildIds: string[]): Promise<MutualGuildStatus[]> {
  const query = encodeURIComponent(guildIds.join(','))
  const res = await fetch(`${BOT_API_URL}/music/guilds/mutual?guildIds=${query}`, {
    headers: {
      Authorization: `Bearer ${BOT_API_ADMIN_TOKEN}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  })

  if (!res.ok) {
    return []
  }

  return res.json()
}
