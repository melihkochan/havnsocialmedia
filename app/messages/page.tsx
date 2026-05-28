import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MainLayout } from '@/components/layout/MainLayout'
import { getConversations, getMessagesWithUser } from '@/lib/actions/messages'
import { MessagesClient } from './MessagesClient'
import { enrichProfile } from '@/lib/profile-enrich'

export const metadata = { title: 'Mesajlar — HAVN' }
export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ u?: string }>
}

export default async function MessagesPage({ searchParams }: PageProps) {
  const { u } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Step 1: Parallel fetch profile, conversations, and target profile (if u is present)
  const [profileResult, initialConversations, targetProfileResult] = await Promise.all([
    supabase.from('profiles').select('id, username, first_name, last_name, avatar_url, is_verified, is_gold, updated_at').eq('id', user.id).single(),
    getConversations(),
    u ? supabase.from('profiles').select('id, username, first_name, last_name, avatar_url, is_verified, is_gold, updated_at').eq('username', u).single() : Promise.resolve({ data: null })
  ])

  const profile = profileResult.data
  if (!profile) redirect('/login')

  const enrichedProfile = enrichProfile(profile)
  if (!enrichedProfile) redirect('/login')

  // Get active chat user if `u` is provided
  let activeChatUser = null
  let initialMessages: any[] = []

  const targetProfile = targetProfileResult?.data
  if (targetProfile && targetProfile.id !== user.id) {
    activeChatUser = targetProfile
    initialMessages = await getMessagesWithUser(targetProfile.id)
  }

  return (
    <MainLayout currentUser={enrichedProfile as any} showRightBar={false} fullWidth={true}>
      <MessagesClient
        currentUser={enrichedProfile}
        initialConversations={initialConversations}
        activeChatUser={activeChatUser}
        initialMessages={initialMessages}
      />
    </MainLayout>
  )
}
