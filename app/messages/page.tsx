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

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const enrichedProfile = enrichProfile(profile)
  if (!enrichedProfile) redirect('/login')

  // Get conversation list
  const initialConversations = await getConversations()

  // Get active chat user if `u` is provided
  let activeChatUser = null
  let initialMessages: any[] = []

  if (u) {
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', u)
      .single()

    if (targetProfile && targetProfile.id !== user.id) {
      activeChatUser = targetProfile
      initialMessages = await getMessagesWithUser(targetProfile.id)
    }
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
