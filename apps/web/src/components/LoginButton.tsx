'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { Music, Loader2 } from 'lucide-react'

export function LoginButton() {
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    try {
      setLoading(true)
      await signIn('discord', { callbackUrl: '/dashboard' })
    } catch (err) {
      console.error('Failed to initiate Discord sign-in:', err)
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleLogin}
      disabled={loading}
      className="flex items-center gap-3 px-8 py-3.5 rounded-xl bg-accent hover:bg-accent-hover text-white font-semibold shadow-lg shadow-accent/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
    >
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <Music className="w-5 h-5" />
      )}
      <span>{loading ? 'Connecting...' : 'Connect with Discord'}</span>
    </button>
  )
}
