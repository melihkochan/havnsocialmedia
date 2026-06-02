import { requireHQAccess } from '@/lib/actions/hq-auth'
import { getAnnouncements } from '@/lib/actions/announcements'
import { HQAnnouncementsClient } from '@/components/havn/hq/HQAnnouncementsClient'
import { Megaphone } from 'lucide-react'

export default async function HQAnnouncementsPage() {
  // Ensure the user has HQ admin access
  await requireHQAccess()

  // Fetch all official announcements
  const announcements = await getAnnouncements()

  return (
    <div className="w-full p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-1.5 pb-4 border-b border-border/60">
        <div className="flex items-center gap-2 text-primary">
          <Megaphone className="w-5 h-5" />
          <span className="text-xs font-black uppercase tracking-wider">Kontrol Merkezi</span>
        </div>
        <h1 className="text-2xl font-black text-foreground tracking-tight">Resmi Duyuru Yönetimi</h1>
        <p className="text-xs text-muted-foreground">
          Tüm platform kullanıcılarına iletilecek resmi duyurular oluşturun veya geçmiş duyuruları yönetin.
        </p>
      </div>

      {/* Main UI component */}
      <HQAnnouncementsClient initialAnnouncements={announcements as any} />
    </div>
  )
}
