import { getHQUsers } from '@/lib/actions/hq-admin'
import { requireHQAccess } from '@/lib/actions/hq-auth'
import { HQUserTable } from '@/components/havn/hq/HQUserTable'
import { Users } from 'lucide-react'

export default async function HQUsersPage() {
  // Ensure access
  const profile = await requireHQAccess()
  const currentUserRole = profile?.role ?? 'member'

  // Initial load on server
  const { users, total } = await getHQUsers({ search: '', role: '' })

  return (
    <div className="w-full p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-1.5 pb-4 border-b border-border/60">
        <div className="flex items-center gap-2 text-primary">
          <Users className="w-5 h-5" />
          <span className="text-xs font-black uppercase tracking-wider">Kontrol Merkezi</span>
        </div>
        <h1 className="text-2xl font-black text-foreground tracking-tight">Kullanıcı Yönetimi</h1>
        <p className="text-xs text-muted-foreground">
          Sistemdeki tüm kayıtlı üyeleri arayın, filtreleyin ve rolleri ile izinlerini düzenleyin.
        </p>
      </div>

      {/* Interactive table */}
      <HQUserTable initialUsers={users as any} initialTotal={total} currentUserRole={currentUserRole} />
    </div>
  )
}
