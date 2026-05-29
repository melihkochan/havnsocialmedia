import { requireHQAccess } from '@/lib/actions/hq-auth'
import { HQTeamChat } from '@/components/havn/hq/HQTeamChat'
import { MessageSquare } from 'lucide-react'

export default async function HQTeamChatPage() {
  // Ensure access and get the current user's profile
  const profile = await requireHQAccess()

  return (
    <div className="max-w-7xl mx-auto w-full p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-1.5 pb-4 border-b border-border/60">
        <div className="flex items-center gap-2 text-primary">
          <MessageSquare className="w-5 h-5" />
          <span className="text-xs font-black uppercase tracking-wider">Kontrol Merkezi</span>
        </div>
        <h1 className="text-2xl font-black text-foreground tracking-tight">Ekip Sohbeti</h1>
        <p className="text-xs text-muted-foreground">
          Platform yöneticileri ve moderatörler arasında anlık, güvenli ve şifreli dahili iletişim kanalı.
        </p>
      </div>

      {/* Team Chat Component */}
      <HQTeamChat currentUserId={profile.id} />
    </div>
  )
}
