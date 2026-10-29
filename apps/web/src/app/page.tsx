import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { Disc3, Radio, Shield, Sparkles } from 'lucide-react'

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
    <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-accent/20 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-purple-500/20 rounded-full blur-[128px] pointer-events-none" />

      <div className="relative z-10 max-w-3xl flex flex-col items-center gap-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-surface text-xs text-slate-300 font-medium">
          <Sparkles className="w-3.5 h-3.5 text-accent" />
          <span>Real-Time Discord Music Bot & Live Dashboard</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-accent to-purple-500 flex items-center justify-center shadow-lg shadow-accent/25">
            <Disc3 className="w-8 h-8 text-white animate-spin-slow" />
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Harmonia
          </h1>
        </div>

        <p className="text-lg text-slate-400 max-w-xl leading-relaxed">
          Stream music directly into your Discord voice channels with seamless 
          real-time synchronization between Discord slash commands and your personal web dashboard.
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
          <div className="p-4 rounded-xl border border-border bg-surface/50 backdrop-blur-sm">
            <Radio className="w-6 h-6 text-accent mb-2" />
            <h3 className="text-sm font-semibold text-white">Live WebSockets</h3>
            <p className="text-xs text-slate-400 mt-1">250ms smooth progress interpolation and instant room state updates.</p>
          </div>
          <div className="p-4 rounded-xl border border-border bg-surface/50 backdrop-blur-sm">
            <Shield className="w-6 h-6 text-purple-400 mb-2" />
            <h3 className="text-sm font-semibold text-white">Voice Channel Security</h3>
            <p className="text-xs text-slate-400 mt-1">Enforced DJ roles and mutual voice channel verification.</p>
          </div>
          <div className="p-4 rounded-xl border border-border bg-surface/50 backdrop-blur-sm">
            <Disc3 className="w-6 h-6 text-emerald-400 mb-2" />
            <h3 className="text-sm font-semibold text-white">Universal Sources</h3>
            <p className="text-xs text-slate-400 mt-1">YouTube, Spotify, SoundCloud, Apple Music, and direct streams.</p>
          </div>
        </div>
      </div>
    </main>
  )
}
