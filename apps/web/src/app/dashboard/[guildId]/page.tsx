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
    <div className="h-screen w-screen overflow-hidden bg-black text-[#ededed] flex flex-col">
      <Navbar />
      <div className="flex-1 min-h-0 overflow-hidden">
        <GuildPlayerDashboard guildId={guildId} currentUserId={session.user.id} />
      </div>
    </div>
  )
}
