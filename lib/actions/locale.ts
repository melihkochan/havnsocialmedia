'use server'

import { createClient } from '@/lib/supabase/server'
import { saveProfileMetadata } from '@/lib/actions/profile-db'
import type { Locale } from '@/lib/i18n'

/**
 * Save the user's language preference to the database.
 * Called fire-and-forget from the client LocaleContext.
 */
export async function saveLanguagePreference(locale: Locale) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }
    return saveProfileMetadata(user.id, { preferred_language: locale })
  } catch {
    return { error: 'Failed to save language preference' }
  }
}
