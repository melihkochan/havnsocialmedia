import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { enrichProfile } from '@/lib/profile-enrich'
import { ProfileSetupClient } from '@/components/havn/ProfileSetupClient'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Profil Kurulumu — HAVN',
  description: 'Giriş işlemlerinizi tamamlamak için profil detaylarınızı seçin.',
}

export default async function ProfileSetupPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profileRaw } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const profile = enrichProfile(profileRaw)

  if (profile && profile.is_setup_completed !== false) {
    redirect('/feed')
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        {/* Glowing Background Effect */}
        <div 
          className="absolute -right-16 -top-16 w-44 h-44 rounded-full opacity-[0.03] blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, var(--primary) 0%, transparent 70%)' }}
        />
        <ProfileSetupClient profile={profile as any} />
      </div>
    </div>
  )
}
