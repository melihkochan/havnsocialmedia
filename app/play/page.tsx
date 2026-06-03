import { createClient } from '@/lib/supabase/server'
import { MainLayout } from '@/components/layout/MainLayout'
import { PlayClient } from '@/components/havn/PlayClient'

export const metadata = {
  title: 'Oyun Alanı — HAVN',
  description: 'Mini oyunlar oynayarak eğlenin, liderlik tablosunda yarışın ve XP kazanın!',
}

export const dynamic = 'force-dynamic'

export default async function PlayPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profile = null
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('id, username, first_name, last_name, avatar_url, is_verified, is_gold, xp, updated_at')
      .eq('id', user.id)
      .single()
    profile = data
  }

  return (
    <MainLayout currentUser={profile}>
      <PlayClient currentUser={profile} />
    </MainLayout>
  )
}
