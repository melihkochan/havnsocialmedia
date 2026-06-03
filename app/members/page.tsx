import { createClient } from '@/lib/supabase/server'
import { MainLayout } from '@/components/layout/MainLayout'
import { MembersClient } from '@/components/havn/MembersClient'
import { getMembers } from '@/lib/actions/members'
import { Users } from 'lucide-react'

export const metadata = {
  title: 'Üyeler — HAVN',
  description: 'HAVN platformundaki tüm üyeleri keşfet. XP sıralaması, arama ve filtreleme ile üyelere ulaş.',
}
export const dynamic = 'force-dynamic'

export default async function MembersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ members: initialMembers, total }, profileResult, followsResult] = await Promise.all([
    getMembers({ sortBy: 'xp', page: 0, pageSize: 30 }),
    user
      ? supabase
          .from('profiles')
          .select('id, username, first_name, last_name, avatar_url, is_verified, is_gold, role, updated_at')
          .eq('id', user.id)
          .single()
      : Promise.resolve({ data: null }),
    user
      ? supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id)
      : Promise.resolve({ data: null }),
  ])

  const profile = profileResult.data
  const followingIds = (followsResult.data ?? []).map((f: any) => f.following_id)

  return (
    <MainLayout currentUser={profile}>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-emerald-500/10 text-emerald-500 flex-shrink-0">
            <Users size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground">Platform Üyeleri</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              HAVN topluluğunu keşfet — üyeleri bul, profillere göz at.
            </p>
          </div>
        </div>

        {/* Members List */}
        <MembersClient
          initialMembers={initialMembers}
          initialTotal={total}
          currentUserId={user?.id ?? null}
          initialFollowingIds={followingIds}
        />
      </div>
    </MainLayout>
  )
}
