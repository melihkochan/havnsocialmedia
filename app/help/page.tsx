import { createClient } from '@/lib/supabase/server'
import { MainLayout } from '@/components/layout/MainLayout'
import HelpClient from './HelpClient'

export const metadata = {
  title: 'Havn Yardım Merkezi — Sıkça Sorulan Sorular ve Rehber',
  description: 'Havn platformunun özellikleri, seviye/XP sistemi, kısayollar ve kullanım rehberi.',
}

export const dynamic = 'force-dynamic'

export default async function HelpPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profile = null
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('id, username, first_name, last_name, avatar_url, is_verified, is_gold, updated_at')
      .eq('id', user.id)
      .single()
    profile = data
  }

  return (
    <MainLayout currentUser={profile}>
      <HelpClient currentUser={profile} />
    </MainLayout>
  )
}
