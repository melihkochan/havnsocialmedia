import { createClient } from '@/lib/supabase/server'
import { MainLayout } from '@/components/layout/MainLayout'
import { CommunitiesClient } from '@/components/havn/CommunitiesClient'
import { getCommunities } from '@/lib/actions/communities'

export const metadata = { title: 'Topluluklar — HAVN' }
export const dynamic = 'force-dynamic'

export default async function CommunitiesPage() {
  const supabase = await createClient()

  // Parallel: auth + communities list
  const [{ data: { user } }, communities] = await Promise.all([
    supabase.auth.getUser(),
    getCommunities(),
  ])

  // Parallel: profile + memberships
  const [profileResult, membershipsResult] = user
    ? await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('community_members').select('community_id, role, status').eq('user_id', user.id),
      ])
    : [{ data: null }, { data: [] }]

  const profile = profileResult.data
  const memberships = membershipsResult.data ?? []

  return (
    <MainLayout currentUser={profile}>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-foreground">Topluluklar</h1>
            <p className="text-muted-foreground text-sm mt-1">Katıl, keşfet, paylaş.</p>
          </div>
        </div>
        <CommunitiesClient
          communities={communities as Parameters<typeof CommunitiesClient>[0]['communities']}
          memberships={memberships}
          currentUserId={user?.id}
        />
      </div>
    </MainLayout>
  )
}
