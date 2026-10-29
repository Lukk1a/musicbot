'use client'

import Link from 'next/link'
import { signOut, useSession } from 'next-auth/react'
import { Disc3, LogOut, ChevronRight } from 'lucide-react'

interface NavbarProps {
  guildName?: string
  guildIcon?: string | null
}

export function Navbar({ guildName, guildIcon }: NavbarProps) {
  const { data: session } = useSession()

  return (
    <header className="h-16 border-b border-border bg-surface/80 backdrop-blur-md sticky top-0 z-50 px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-white font-bold shadow-md shadow-accent/20">
            <Disc3 className="w-5 h-5" />
          </div>
          <span className="font-bold text-lg text-white tracking-tight">Harmonia</span>
        </Link>

        {guildName && (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <ChevronRight className="w-4 h-4 text-slate-600" />
            <div className="flex items-center gap-2 text-slate-200 font-medium">
              {guildIcon ? (
                <img
                  src={guildIcon}
                  alt={guildName}
                  className="w-5 h-5 rounded-full object-cover"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px] text-slate-300">
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
                className="w-8 h-8 rounded-full ring-2 ring-border"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center justify-center font-bold text-xs">
                {session.user.name?.charAt(0) || 'U'}
              </div>
            )}
            <span className="text-sm font-medium text-slate-300 hidden sm:inline">
              {session.user.name}
            </span>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-surface-hover transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
