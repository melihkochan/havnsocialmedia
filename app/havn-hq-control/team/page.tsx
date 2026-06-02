import { requireHQAccess } from '@/lib/actions/hq-auth'
import { HQTeamManagement } from '@/components/havn/hq/HQTeamManagement'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Ekip Yönetimi — HAVN HQ' }

export default async function HQTeamPage() {
  const profile = await requireHQAccess()
  const currentUserId = profile?.id ?? ''
  const currentUserRole = profile?.role ?? 'member'

  return (
    <HQTeamManagement
      currentUserId={currentUserId}
      currentUserRole={currentUserRole}
    />
  )
}
