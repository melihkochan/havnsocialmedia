import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MainLayout } from '@/components/layout/MainLayout'
import { SupportForm } from './SupportForm'
import { getSupportTickets } from '@/lib/actions/support'
import { isFounder as checkIsFounder, FOUNDER_ID } from '@/lib/founder'

export const metadata = { title: 'Destek ve Yardım — HAVN' }
export const dynamic = 'force-dynamic'

export default async function SupportPage({
  searchParams
}: {
  searchParams: Promise<{ ticketId?: string }>
}) {
  const { ticketId } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const isUserFounder = user.id === FOUNDER_ID

  const [profileResult, initialTickets, userProfilesResult] = await Promise.all([
    supabase.from('profiles').select('id, username, first_name, last_name, avatar_url, is_verified, is_gold, updated_at').eq('id', user.id).single(),
    getSupportTickets(),
    isUserFounder
      ? supabase.from('profiles').select('id, username, first_name, last_name').neq('id', user.id).order('username')
      : Promise.resolve({ data: [] })
  ])

  const profile = profileResult.data
  if (!profile) redirect('/login')

  const isFounder = checkIsFounder(profile)

  let userProfiles = userProfilesResult.data || []
  if (isFounder && !isUserFounder) {
    const { data } = await supabase
      .from('profiles')
      .select('id, username, first_name, last_name')
      .neq('id', user.id)
      .order('username')
    userProfiles = data || []
  }

  return (
    <MainLayout currentUser={profile}>
      <SupportForm 
        profile={profile} 
        isFounder={isFounder} 
        initialTickets={initialTickets} 
        userProfiles={userProfiles || []}
        focusedTicketId={ticketId}
      />
    </MainLayout>
  )
}
