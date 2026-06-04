import { createClient } from '@/lib/supabase/server'
import { MainLayout } from '@/components/layout/MainLayout'
import { CommunitiesClient } from '@/components/havn/CommunitiesClient'
import { getCommunities } from '@/lib/actions/communities'
import { getServerLocale } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'

export async function generateMetadata() {
  const locale = await getServerLocale()
  return { title: `${t('communities.title', locale)} — HAVN` }
}
export const dynamic = 'force-dynamic'

export default async function CommunitiesPage() {
  const locale = await getServerLocale()
  const supabase = await createClient()

  // Step 1: auth
  const { data: { user } } = await supabase.auth.getUser()

  // Step 2: Parallel: communities list + profile + memberships
  const [communities, profileResult, membershipsResult] = await Promise.all([
    getCommunities(),
    user
      ? supabase.from('profiles').select('id, username, first_name, last_name, avatar_url, is_verified, is_gold, updated_at').eq('id', user.id).single()
      : Promise.resolve({ data: null }),
    user
      ? supabase.from('community_members').select('community_id, role, status').eq('user_id', user.id)
      : Promise.resolve({ data: [] }),
  ])

  const profile = profileResult.data
  const memberships = membershipsResult.data ?? []

  return (
    <MainLayout currentUser={profile}>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-foreground">{t('communities.title', locale)}</h1>
            <p className="text-muted-foreground text-sm mt-1">{t('communities.subtitle', locale)}</p>
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
