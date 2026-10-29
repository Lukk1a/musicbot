// apps/web/src/app/dashboard/[guildId]/page.tsx
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Navbar } from '@/components/Navbar'
import { GuildPlayerDashboard } from '@/components/GuildPlayerDashboard'

interface PageProps {
  params: Promise<{
    guildId: string
  }>
}

export default async function GuildPlayerPage({ params }: PageProps) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user) {
    redirect('/')
  }

  const { guildId } = await params

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <GuildPlayerDashboard guildId={guildId} />
      </main>
    </div>
  )
}
