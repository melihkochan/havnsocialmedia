import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MainLayout } from '@/components/layout/MainLayout'
import { SettingsClient } from '@/components/havn/SettingsClient'
import { enrichProfile } from '@/lib/profile-enrich'

export const metadata = { title: 'Ayarlar — HAVN' }
export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
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

  return (
    <MainLayout currentUser={enrichedProfile}>
      <SettingsClient profile={enrichedProfile as any} email={user.email} />
    </MainLayout>
  )
}
