'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import {
  type Locale,
  type TranslationDict,
  DEFAULT_LOCALE,
  translations,
  t as tFn,
} from '@/lib/i18n'
import { saveLanguagePreference } from '@/lib/actions/locale'

interface LocaleContextValue {
  locale: Locale
  setLocale: (l: Locale) => Promise<void>
  t: (key: keyof TranslationDict, vars?: Record<string, string | number>) => string
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: DEFAULT_LOCALE,
  setLocale: async () => {},
  t: (key) => key as string,
})

interface LocaleProviderProps {
  children: ReactNode
  initialLocale: Locale
}

export function LocaleProvider({ children, initialLocale }: LocaleProviderProps) {
  // Hydrate from localStorage first (client-side override), then fall back to server-determined locale
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('havn_locale') as Locale | null
      if (saved && (saved === 'tr' || saved === 'en')) return saved
    }
    return initialLocale
  })

  // Sync html[lang] on mount and on change
  useEffect(() => {
    document.documentElement.setAttribute('lang', locale)
  }, [locale])

  const setLocale = useCallback(async (l: Locale) => {
    setLocaleState(l)
    localStorage.setItem('havn_locale', l)
    document.documentElement.setAttribute('lang', l)
    try {
      await saveLanguagePreference(l)
    } catch (e) {
      console.error(e)
    }
    window.location.reload()
  }, [])

  const translate = useCallback(
    (key: keyof TranslationDict, vars?: Record<string, string | number>) =>
      tFn(key, locale, vars),
    [locale]
  )

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t: translate }}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale() {
  return useContext(LocaleContext)
}
