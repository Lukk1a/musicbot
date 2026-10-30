// apps/web/src/app/page.tsx
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { Disc, Radio, Shield, Sparkles, Music2 } from 'lucide-react'

import { authOptions } from '@/lib/auth'
import { LoginButton } from '@/components/LoginButton'

export default async function HomePage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>
}) {
  const session = await getServerSession(authOptions)
  if (session) {
    redirect('/dashboard')
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const error = resolvedSearchParams?.error

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center relative overflow-hidden bg-black text-[#ededed]">
      {/* Subtle Geist Monochrome Background Glows */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-zinc-800/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="relative z-10 max-w-3xl flex flex-col items-center gap-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-800 bg-zinc-950/80 text-xs text-zinc-300 font-medium">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>Discord Audio Engine & Spotify Collaborative Web Player</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-white text-black flex items-center justify-center shadow-2xl">
            <Disc className="w-8 h-8" />
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight text-white">
            Monotone
          </h1>
        </div>

        <p className="text-base sm:text-lg text-zinc-400 max-w-xl leading-relaxed">
          High-fidelity music streaming for Discord with live Spotify account linking, collaborative server mixes, and real-time dashboard controls.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 items-center mt-2">
          <LoginButton />
        </div>

        {error && (
          <div className="p-3 px-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-sm max-w-md">
            {error === 'AccessDenied'
              ? 'Access denied. You cancelled the Discord authorization.'
              : `Authentication error (${error}). Ensure https://play.lukka.dev/api/auth/callback/discord is added to Redirects in your Discord Developer Portal.`}
          </div>
        )}

        {/* Feature badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full mt-12 text-left">
          <div className="p-5 rounded-xl border border-zinc-900 bg-zinc-950/60 backdrop-blur-sm">
            <Music2 className="w-5 h-5 text-emerald-400 mb-2" />
            <h3 className="text-sm font-semibold text-white">Spotify Integration</h3>
            <p className="text-xs text-zinc-400 mt-1">Connect your Spotify library to play your saved tracks & playlists directly in voice.</p>
          </div>
          <div className="p-5 rounded-xl border border-zinc-900 bg-zinc-950/60 backdrop-blur-sm">
            <Radio className="w-5 h-5 text-white mb-2" />
            <h3 className="text-sm font-semibold text-white">Collaborative Mixes</h3>
            <p className="text-xs text-zinc-400 mt-1">Build server-wide playlists together with contributor tracking and role-based permissions.</p>
          </div>
          <div className="p-5 rounded-xl border border-zinc-900 bg-zinc-950/60 backdrop-blur-sm">
            <Shield className="w-5 h-5 text-zinc-400 mb-2" />
            <h3 className="text-sm font-semibold text-white">Voice & DJ Security</h3>
            <p className="text-xs text-zinc-400 mt-1">Verified channel presence and customizable DJ / editor role enforcement.</p>
          </div>
        </div>
      </div>
    </main>
  )
}
