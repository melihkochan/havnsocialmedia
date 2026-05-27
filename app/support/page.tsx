import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MainLayout } from '@/components/layout/MainLayout'
import { SupportForm } from './SupportForm'
import { getSupportTickets } from '@/lib/actions/support'
import { isFounder as checkIsFounder } from '@/lib/founder'

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

  const [profileResult, initialTickets] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    getSupportTickets()
  ])

  const profile = profileResult.data
  if (!profile) redirect('/login')

  const isFounder = checkIsFounder(profile)

  const { data: userProfiles } = isFounder
    ? await supabase
        .from('profiles')
        .select('id, username, first_name, last_name')
        .neq('id', user.id)
        .order('username')
    : { data: [] }

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
