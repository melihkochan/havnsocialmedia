import { createClient } from '@/lib/supabase/server'
import { MainLayout } from '@/components/layout/MainLayout'
import HelpClient from './HelpClient'

import { t } from '@/lib/i18n'
import { getServerLocale } from '@/lib/i18n/server'

export async function generateMetadata() {
  const locale = await getServerLocale()
  return {
    title: t('help.meta.title', locale),
    description: t('help.meta.desc', locale),
  }
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
