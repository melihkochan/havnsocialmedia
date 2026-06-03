import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import { detectLocaleFromAcceptLanguage, detectLocaleFromCountry, DEFAULT_LOCALE, type Locale } from './index'

/**
 * Detect the active locale on the server side (Server Components / Server Actions).
 * Priority: 
 *  1. Authenticated user's DB profile bio metadata (preferred_language)
 *  2. Fallback to profile country code (TR -> tr, others -> en)
 *  3. Fallback to Accept-Language header
 *  4. Fallback to default locale (tr)
 */
export async function getServerLocale(): Promise<Locale> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('bio, country')
        .eq('id', user.id)
        .single()

      if (profile) {
        if (profile.bio) {
          const parts = profile.bio.split('\u200B')
          if (parts.length > 1) {
            try {
              const meta = JSON.parse(parts[1])
              if (meta.preferred_language === 'tr' || meta.preferred_language === 'en') {
                return meta.preferred_language
              }
            } catch {}
          }
        }

        const countryCode = (profile as any).country
        const countryLocale = detectLocaleFromCountry(countryCode)
        if (countryLocale) {
          return countryLocale
        }
      }
    }
  } catch {}

  try {
    const headerList = await headers()
    const acceptLang = headerList.get('accept-language')
    return detectLocaleFromAcceptLanguage(acceptLang)
  } catch {
    return DEFAULT_LOCALE
  }
}
