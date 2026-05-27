import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MainLayout } from '@/components/layout/MainLayout'
import { getSuggestions } from '@/lib/actions/suggestions'
import { isFounder as checkIsFounder } from '@/lib/founder'
import { SuggestionsClient } from './SuggestionsClient'

export const metadata = { title: 'Öneriler ve Geri Bildirim — HAVN' }
export const dynamic = 'force-dynamic'

export default async function SuggestionsPage({
  searchParams
}: {
  searchParams: Promise<{ suggestionId?: string }>
}) {
  const { suggestionId } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [profileResult, initialSuggestions] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    getSuggestions('all', 'votes')
  ])

  const profile = profileResult.data
  if (!profile) redirect('/login')

  const isAdmin = profile.is_gold || checkIsFounder(profile)

  return (
    <MainLayout currentUser={profile}>
      <SuggestionsClient 
        profile={profile} 
        isAdmin={isAdmin} 
        initialSuggestions={initialSuggestions} 
        focusedSuggestionId={suggestionId}
      />
    </MainLayout>
  )
}
