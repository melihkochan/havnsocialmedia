import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MainLayout } from '@/components/layout/MainLayout'
import { NotificationsClient } from '@/components/havn/NotificationsClient'
import { getNotifications } from '@/lib/actions/notifications'
import { enrichProfile } from '@/lib/profile-enrich'

export const metadata = {
  title: 'Bildirimler — HAVN',
  description: 'Gelen son bildirimleriniz.',
}

export const dynamic = 'force-dynamic'

export default async function NotificationsPage() {
  const supabase = await createClient()

  // Get authenticated user
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Parallel: Fetch profile, notifications, and following list
  const [profileResult, notifications, followsResult] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    getNotifications(),
    supabase.from('follows').select('following_id').eq('follower_id', user.id)
  ])

  const profile = enrichProfile(profileResult.data)
  if (!profile) {
    redirect('/login')
  }
  const followingIds = (followsResult.data ?? []).map(f => f.following_id)

  return (
    <MainLayout currentUser={profile}>
      <NotificationsClient 
        initialNotifications={notifications as any} 
        followingIds={followingIds} 
        currentUser={profile}
      />
    </MainLayout>
  )
}
