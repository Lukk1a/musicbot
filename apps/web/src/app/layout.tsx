import type { Metadata } from 'next'
import { Providers } from './providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'Harmonia | Discord Music Bot Dashboard',
  description: 'Real-time web player and queue manager for Harmonia Discord Music Bot',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-foreground antialiased selection:bg-accent selection:text-white">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
