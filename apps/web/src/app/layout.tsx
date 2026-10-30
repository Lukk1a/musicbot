// apps/web/src/app/layout.tsx
import type { Metadata } from 'next'
import { Providers } from './providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'Monotone | Discord Music & Web Player',
  description: 'High-fidelity Discord music bot with Spotify integration and collaborative server mixes',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-black text-[#ededed] antialiased selection:bg-zinc-800 selection:text-white">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
