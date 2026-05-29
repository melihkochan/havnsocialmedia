import { getPendingCommunities } from '@/lib/actions/hq-admin'
import { requireHQAccess } from '@/lib/actions/hq-auth'
import { HQCommunitiesApproval } from '@/components/havn/hq/HQCommunitiesApproval'
import { Shield } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Topluluk Onayları — HAVN HQ' }

export default async function HQCommunitiesApprovalPage() {
  // Ensure access
  await requireHQAccess()

  // Fetch pending communities on the server
  const pendingCommunities = await getPendingCommunities()

  return (
    <div className="max-w-7xl mx-auto w-full p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-1.5 pb-4 border-b border-border/60">
        <div className="flex items-center gap-2 text-primary">
          <Shield className="w-5 h-5" />
          <span className="text-xs font-black uppercase tracking-wider">Kontrol Merkezi</span>
        </div>
        <h1 className="text-2xl font-black text-foreground tracking-tight">Topluluk Onayları</h1>
        <p className="text-xs text-muted-foreground">
          Sistem ayarlarında &quot;Topluluk Onayı&quot; zorunlu hale getirildiğinde, üyeler tarafından oluşturulan yeni topluluk talepleri burada listelenir.
        </p>
      </div>

      {/* Approvals client panel */}
      <HQCommunitiesApproval initialCommunities={pendingCommunities as any} />
    </div>
  )
}
