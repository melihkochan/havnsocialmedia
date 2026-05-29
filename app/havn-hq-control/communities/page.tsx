import { requireHQAccess } from '@/lib/actions/hq-auth'
import { getAllCommunitiesForAdmin } from '@/lib/actions/hq-admin'
import { HQCommunitiesManagement } from '@/components/havn/hq/HQCommunitiesManagement'
import { Activity } from 'lucide-react'

export const metadata = { title: 'Topluluk Yönetimi — HAVN HQ' }
export const dynamic = 'force-dynamic'

export default async function HQCommunitiesPage() {
  // Verify access
  await requireHQAccess()

  // Fetch all communities
  const communities = await getAllCommunitiesForAdmin()

  return (
    <div className="w-full p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-1.5 pb-4 border-b border-border/60">
        <div className="flex items-center gap-2 text-primary">
          <Activity className="w-5 h-5" />
          <span className="text-xs font-black uppercase tracking-wider">Kontrol Merkezi</span>
        </div>
        <h1 className="text-2xl font-black text-foreground tracking-tight">Topluluk Yönetimi</h1>
        <p className="text-xs text-muted-foreground">
          Platform üzerindeki aktif toplulukların accent tema renklerini, kurallarını ve genel duyurularını yönetin.
        </p>
      </div>

      {/* Management Component */}
      <HQCommunitiesManagement initialCommunities={communities as any} />
    </div>
  )
}
