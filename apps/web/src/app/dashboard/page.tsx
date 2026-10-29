// apps/web/src/app/dashboard/page.tsx
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { Radio, PlusCircle, ArrowRight, Server } from 'lucide-react'

import { authOptions } from '@/lib/auth'
import { getMutualGuilds } from '@/lib/bot-api'
import { Navbar } from '@/components/Navbar'
import type { MutualGuildStatus } from '@musicbot/shared'

interface DiscordGuild {
  id: string
  name: string
  icon: string | null
  owner: boolean
  permissions: string
  features: string[]
}

const MANAGE_GUILD_FLAG = 0x20
const ADMINISTRATOR_FLAG = 0x8

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session || !session.accessToken) {
    redirect('/')
  }

  // 1. Fetch user's Discord guilds from Discord REST API
  let userGuilds: DiscordGuild[] = []
  try {
    const res = await fetch('https://discord.com/api/v10/users/@me/guilds', {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
      next: { revalidate: 30 },
    })
    if (res.ok) {
      userGuilds = await res.json()
    }
  } catch (err) {
    console.error('Failed fetching user Discord guilds:', err)
  }

  // 2. Cross-reference with bot active guilds
  const guildIds = userGuilds.map((g) => g.id)
  let botGuilds: MutualGuildStatus[] = []
  try {
    botGuilds = await getMutualGuilds(guildIds)
  } catch (err) {
    console.error('Failed fetching bot mutual guilds:', err)
  }

  const botGuildIds = new Set(botGuilds.map((bg) => bg.id))
  const botGuildMap = new Map(botGuilds.map((bg) => [bg.id, bg]))

  // Active servers (bot is in the guild)
  const activeServers = userGuilds
    .filter((g) => botGuildIds.has(g.id))
    .map((g) => {
      const bg = botGuildMap.get(g.id)
      return {
        id: g.id,
        name: g.name,
        icon: g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png?size=128` : null,
        isPlaying: bg?.isPlaying || false,
        currentTrack: bg?.currentTrack || null,
      }
    })

  // Inviteable servers (bot is NOT in guild, but user has Manage Guild or Admin)
  const inviteServers = userGuilds
    .filter((g) => !botGuildIds.has(g.id))
    .filter((g) => {
      const perms = BigInt(g.permissions || '0')
      return (perms & BigInt(MANAGE_GUILD_FLAG)) === BigInt(MANAGE_GUILD_FLAG) ||
             (perms & BigInt(ADMINISTRATOR_FLAG)) === BigInt(ADMINISTRATOR_FLAG)
    })
    .map((g) => ({
      id: g.id,
      name: g.name,
      icon: g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png?size=128` : null,
    }))

  const botClientId = process.env.DISCORD_CLIENT_ID || ''
  const botInviteUrl = (guildId: string) =>
    `https://discord.com/api/oauth2/authorize?client_id=${botClientId}&permissions=3165184&scope=bot%20applications.commands&guild_id=${guildId}&disable_guild_select=true`

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto p-6 flex flex-col gap-10">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Select a Server</h1>
          <p className="text-slate-400 text-sm mt-1">
            Manage real-time playback or invite Harmonia to your community servers.
          </p>
        </div>

        {/* Section 1: Active Servers */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-emerald-400" />
            <h2 className="text-xl font-bold text-white tracking-tight">Active Servers</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-surface border border-border text-slate-300">
              {activeServers.length}
            </span>
          </div>

          {activeServers.length === 0 ? (
            <div className="p-8 rounded-2xl border border-dashed border-border bg-surface/30 text-center flex flex-col items-center gap-2">
              <Server className="w-8 h-8 text-slate-500" />
              <p className="text-slate-400 font-medium">Harmonia is not active in any of your servers yet.</p>
              <p className="text-slate-500 text-xs">Invite the bot below to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeServers.map((server) => (
                <Link
                  key={server.id}
                  href={`/dashboard/${server.id}`}
                  className="group p-5 rounded-2xl border border-border bg-surface hover:bg-surface-hover hover:border-accent/40 transition-all flex flex-col justify-between gap-4 shadow-sm hover:shadow-md hover:shadow-accent/5"
                >
                  <div className="flex items-start gap-3">
                    {server.icon ? (
                      <img
                        src={server.icon}
                        alt={server.name}
                        className="w-12 h-12 rounded-xl object-cover ring-1 ring-border group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-lg text-slate-300">
                        {server.name.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white text-base truncate group-hover:text-accent transition-colors">
                        {server.name}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            server.isPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                          }`}
                        />
                        <span className="text-xs text-slate-400">
                          {server.isPlaying ? 'Now Playing' : 'Idle'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {server.currentTrack && (
                    <div className="p-2.5 rounded-lg bg-background/60 border border-border/50 text-xs text-slate-300 truncate">
                      🎵 <span className="font-medium text-white">{server.currentTrack.title}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs font-semibold text-accent pt-2 border-t border-border/50">
                    <span>Open Live Player</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Section 2: Invite Servers */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-accent" />
            <h2 className="text-xl font-bold text-white tracking-tight">Invite Bot</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-surface border border-border text-slate-300">
              {inviteServers.length}
            </span>
          </div>

          {inviteServers.length === 0 ? (
            <div className="p-8 rounded-2xl border border-dashed border-border bg-surface/30 text-center text-slate-500 text-sm">
              No additional servers found where you have Manage Server permissions.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {inviteServers.map((server) => (
                <div
                  key={server.id}
                  className="p-5 rounded-2xl border border-border bg-surface flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {server.icon ? (
                      <img
                        src={server.icon}
                        alt={server.name}
                        className="w-10 h-10 rounded-xl object-cover ring-1 ring-border"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-sm text-slate-300">
                        {server.name.charAt(0)}
                      </div>
                    )}
                    <span className="font-semibold text-sm text-white truncate">{server.name}</span>
                  </div>

                  <a
                    href={botInviteUrl(server.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-1.5 rounded-lg bg-surface-hover hover:bg-accent text-slate-300 hover:text-white border border-border text-xs font-semibold transition-all shrink-0"
                  >
                    Invite
                  </a>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
