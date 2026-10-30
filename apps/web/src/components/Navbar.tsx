// apps/web/src/components/Navbar.tsx
'use client'

import Link from 'next/link'
import { signOut, useSession } from 'next-auth/react'
import { Activity, LogOut, ChevronRight, Disc } from 'lucide-react'

interface NavbarProps {
  guildName?: string
  guildIcon?: string | null
}

export function Navbar({ guildName, guildIcon }: NavbarProps) {
  const { data: session } = useSession()

  return (
    <header className="h-14 border-b border-[#222226] bg-[#0c0c0e]/90 backdrop-blur-md sticky top-0 z-50 px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
          <div className="w-7 h-7 rounded-md bg-white text-black flex items-center justify-center font-bold shadow-sm">
            <Disc className="w-4 h-4 animate-spin-slow" />
          </div>
          <span className="font-semibold text-base text-white tracking-tight">Monotone</span>
        </Link>

        {guildName && (
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
            <div className="flex items-center gap-2 text-zinc-200 font-medium">
              {guildIcon ? (
                <img
                  src={guildIcon}
                  alt={guildName}
                  className="w-4 h-4 rounded-full object-cover"
                />
              ) : (
                <div className="w-4 h-4 rounded-full bg-zinc-800 flex items-center justify-center text-[9px] text-zinc-300">
                  {guildName.charAt(0)}
                </div>
              )}
              <span className="truncate max-w-[200px]">{guildName}</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        {session?.user && (
          <div className="flex items-center gap-3">
            {session.user.image ? (
              <img
                src={session.user.image}
                alt={session.user.name || 'User'}
                className="w-7 h-7 rounded-full ring-1 ring-[#27272a]"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-zinc-800 text-zinc-300 flex items-center justify-center font-bold text-xs">
                {session.user.name?.charAt(0) || 'U'}
              </div>
            )}
            <span className="text-xs font-medium text-zinc-300 hidden sm:inline">
              {session.user.name}
            </span>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
