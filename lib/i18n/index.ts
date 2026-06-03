import { tr } from './tr'
import { en } from './en'

export type Locale = 'tr' | 'en'
import type { TranslationKey } from './tr'
export type { TranslationKey }
export type TranslationDict = Record<TranslationKey, string>

export const translations: Record<Locale, TranslationDict> = { tr, en }

export const SUPPORTED_LOCALES: Locale[] = ['tr', 'en']
export const DEFAULT_LOCALE: Locale = 'tr'

export const LOCALE_LABELS: Record<Locale, { label: string; flag: string; nativeLabel: string }> = {
  tr: { label: 'Türkçe', flag: '🇹🇷', nativeLabel: 'Türkçe' },
  en: { label: 'English', flag: '🇬🇧', nativeLabel: 'English' },
}

/**
 * Translate a key to the given locale.
 * Falls back to Turkish, then the key itself if not found.
 * Supports {variable} interpolation.
 */
export function t(
  key: keyof TranslationDict,
  locale: Locale,
  vars?: Record<string, string | number>
): string {
  const dict = translations[locale] ?? translations[DEFAULT_LOCALE]
  let text: string = (dict as any)[key] ?? (translations[DEFAULT_LOCALE] as any)[key] ?? key
  if (vars) {
    Object.entries(vars).forEach(([k, v]) => {
      text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
    })
  }
  return text
}

/**
 * Detect locale from browser Accept-Language header string.
 * Priority: Turkish > English (default)
 */
export function detectLocaleFromAcceptLanguage(header: string | null | undefined): Locale {
  if (!header) return DEFAULT_LOCALE
  const langs = header
    .split(',')
    .map((part) => {
      const [lang, q] = part.trim().split(';q=')
      return { lang: lang.trim().toLowerCase(), q: q ? parseFloat(q) : 1 }
    })
    .sort((a, b) => b.q - a.q)

  for (const { lang } of langs) {
    if (lang.startsWith('tr')) return 'tr'
    if (lang.startsWith('en')) return 'en'
  }
  return DEFAULT_LOCALE
}

/**
 * Detect locale from a country code (ISO 3166-1 alpha-2).
 * Turkey → 'tr', everything else → 'en'.
 */
export function detectLocaleFromCountry(countryCode: string | null | undefined): Locale | null {
  if (!countryCode) return null
  if (countryCode.toUpperCase() === 'TR') return 'tr'
  // For all other countries, default to English
  return 'en'
}
