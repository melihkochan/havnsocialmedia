'use client'

import { useState, useTransition, useEffect } from 'react'
import { Check, Loader2, AlertCircle, Sparkles, Eye, EyeOff, Lock, Mail, Info, MapPin } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { completeProfileSetup } from '@/lib/actions/profile'
import { RESERVED_USERNAMES } from '@/lib/reserved-usernames'
import { AvatarUpload } from '@/components/havn/AvatarUpload'
import { SearchableSelect } from '@/components/havn/SearchableSelect'
import { getInitials } from '@/lib/profile-display'
import { getCountriesAction, getCitiesAction } from '@/lib/actions/location'
import type { Profile } from '@/lib/supabase/types'
import { useLocale } from '@/lib/i18n/LocaleContext'
import { t } from '@/lib/i18n'

interface ProfileSetupClientProps {
  profile: Profile
  userEmail: string | null
  isOAuthUser: boolean
}

export function ProfileSetupClient({ profile, userEmail, isOAuthUser }: ProfileSetupClientProps) {
  const { locale } = useLocale()
  const [username, setUsername] = useState(profile.username || '')
  const [firstName, setFirstName] = useState(profile.first_name || '')
  const [lastName, setLastName] = useState(profile.last_name || '')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [skipPassword, setSkipPassword] = useState(false)

  const [selectedCountry, setSelectedCountry] = useState('')
  const [selectedCity, setSelectedCity] = useState('')
  const [countriesList, setCountriesList] = useState<{ value: string; label: string; image: string }[]>([])
  const [citiesList, setCitiesList] = useState<{ value: string; label: string }[]>([])
  const [loadingGeo, setLoadingGeo] = useState(false)

  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    async function loadCountries() {
      try {
        const list = await getCountriesAction()
        setCountriesList(list.map(c => ({
          value: c.code,
          label: c.name,
          image: c.flag
        })))
      } catch (err) {
      }
    }
    loadCountries()
  }, [])

  const handleCountryChange = async (countryCode: string) => {
    setSelectedCountry(countryCode)
    setSelectedCity('')
    setCitiesList([])
    if (!countryCode) return
    setLoadingGeo(true)
    try {
      const list = await getCitiesAction(countryCode)
      const formatted = list.map(city => ({ value: city, label: city }))
      setCitiesList(formatted)
      if (formatted.length > 0) setSelectedCity(formatted[0].value)
    } catch (err) {
    } finally {
      setLoadingGeo(false)
    }
  }

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const cleanUsername = username.trim()
    if (!cleanUsername) {
      setError(locale === 'tr' ? 'Kullanıcı adı zorunludur.' : 'Username is required.')
      return
    }

    if (RESERVED_USERNAMES.includes(cleanUsername.toLowerCase())) {
      setError(locale === 'tr' ? 'Bu kullanıcı adı sistem tarafından rezerve edilmiştir.' : 'This username is reserved by the system.')
      return
    }

    const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/
    if (!usernameRegex.test(cleanUsername)) {
      setError(locale === 'tr' ? 'Kullanıcı adı 3-30 karakter olmalı, sadece harf, rakam ve alt çizgi (_) içermelidir.' : 'Username must be 3-30 characters, containing only letters, numbers, and underscores (_).')
      return
    }

    if (isOAuthUser && !skipPassword && password && password.length < 8) {
      setError(locale === 'tr' ? 'Şifre en az 8 karakter olmalıdır.' : 'Password must be at least 8 characters.')
      return
    }

    const fd = new FormData()
    fd.set('username', cleanUsername)
    fd.set('first_name', firstName.trim())
    fd.set('last_name', lastName.trim())
    if (selectedCountry) fd.set('country', selectedCountry)
    if (selectedCity) fd.set('city', selectedCity)

    if (avatarFile) {
      fd.set('avatar', avatarFile)
    } else if ((profile as any).avatar_url) {
      fd.set('google_avatar_url', (profile as any).avatar_url)
    }

    // Include password only if user is OAuth and didn't skip
    if (isOAuthUser && !skipPassword && password.trim()) {
      fd.set('password', password.trim())
    }

    startTransition(async () => {
      const res = await completeProfileSetup(fd)
      if (res.error) {
        setError(res.error)
      } else {
        // Complete reload to refresh layout sidebar, Zustand state, and auth cookies
        window.location.replace('/feed')
      }
    })
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Title */}
      <div className="text-center space-y-2 select-none">
        <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-primary/10 text-primary mb-1">
          <Sparkles size={22} className="animate-pulse" />
        </div>
        <h2 className="text-xl font-black text-foreground tracking-tight">
          {locale === 'tr' ? 'Profilini Kur' : 'Setup Your Profile'}
        </h2>
        <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
          {locale === 'tr' ? "HAVN'a hoş geldin! Toplulukla tanışmadan önce profilini tamamla." : 'Welcome to HAVN! Complete your profile before meeting the community.'}
        </p>
      </div>

      <form onSubmit={handleComplete} className="space-y-4">
        {/* Avatar */}
        <div className="flex flex-col items-center">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block text-center select-none">
            {locale === 'tr' ? 'Profil Resmi' : 'Profile Picture'}
          </label>
          <AvatarUpload
            currentAvatarUrl={(profile as any).avatar_url}
            username={getInitials(profile)}
            onFileSelect={setAvatarFile}
          />
          {(profile as any).avatar_url && !avatarFile && (
            <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
              {locale === 'tr' ? 'Google profil resmin kullanılıyor — değiştirmek için üstüne tıkla' : 'Your Google profile picture is in use — click to change it'}
            </p>
          )}
        </div>

        {/* First & Last Name */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground" htmlFor="setup-first-name">
              {t('auth.register.first_name', locale)}
            </label>
            <input
              id="setup-first-name"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder={locale === 'tr' ? 'Adınız' : 'First Name'}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground" htmlFor="setup-last-name">
              {t('auth.register.last_name', locale)}
            </label>
            <input
              id="setup-last-name"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder={locale === 'tr' ? 'Soyadınız' : 'Last Name'}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
            />
          </div>
        </div>

        {/* Username */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-muted-foreground" htmlFor="setup-username">
            {t('auth.register.username', locale)}
          </label>
          <input
            id="setup-username"
            type="text"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="kullanici_adi"
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
          />
          <p className="text-[10px] text-muted-foreground leading-normal">
            {locale === 'tr' ? 'Profilinizde @ ile görünür. Harf, rakam ve alt çizgi (_) kullanabilirsiniz.' : 'Shown as @handle on your profile. Letters, numbers, and underscores (_) are allowed.'}
          </p>
        </div>

        {/* Country & City */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground flex items-center gap-1">
              <MapPin size={11} />
              {t('settings.profile.country', locale)}
            </label>
            <SearchableSelect
              value={selectedCountry}
              onChange={handleCountryChange}
              options={countriesList}
              placeholder={t('settings.profile.country_placeholder', locale)}
              selectClassName="py-2.5"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground">
              {t('settings.profile.city', locale)}
            </label>
            <SearchableSelect
              value={selectedCity}
              onChange={setSelectedCity}
              options={citiesList}
              placeholder={loadingGeo ? t('settings.profile.city_loading', locale) : t('settings.profile.city_placeholder', locale)}
              disabled={!selectedCountry || loadingGeo}
              selectClassName="py-2.5"
            />
          </div>
        </div>

        {/* Email — readonly, only for OAuth users */}
        {isOAuthUser && userEmail && (
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground flex items-center gap-1">
              <Mail size={11} />
              {t('auth.register.email', locale)}
            </label>
            <div className="relative">
              <input
                type="email"
                value={userEmail}
                readOnly
                className="w-full px-4 py-3 rounded-xl border border-border/60 bg-muted/30 text-foreground/60 text-sm outline-none cursor-not-allowed select-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-muted-foreground/60 uppercase tracking-wider bg-muted px-1.5 py-0.5 rounded">
                {locale === 'tr' ? 'Kilitli' : 'Locked'}
              </span>
            </div>
          </div>
        )}

        {/* Password — only for OAuth users so they can later login with email+password */}
        {isOAuthUser && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                <Lock size={11} />
                {locale === 'tr' ? 'Şifre Belirle' : 'Set Password'} <span className="text-muted-foreground/60 font-normal">({locale === 'tr' ? 'opsiyonel' : 'optional'})</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setSkipPassword(!skipPassword)
                  if (!skipPassword) setPassword('')
                }}
                className="text-[10px] font-semibold text-primary hover:underline transition-colors"
              >
                {skipPassword ? (locale === 'tr' ? 'Şifre Belirle' : 'Set Password') : (locale === 'tr' ? 'Atla' : 'Skip')}
              </button>
            </div>
            <AnimatePresence>
              {!skipPassword && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="relative">
                    <input
                      id="setup-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={locale === 'tr' ? 'En az 8 karakter' : 'At least 8 characters'}
                      minLength={8}
                      className="w-full pl-4 pr-12 py-3 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(s => !s)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  <div
                    className="mt-2 flex items-start gap-2 p-3 rounded-xl text-[10px] leading-relaxed"
                    style={{
                      background: 'color-mix(in oklch, var(--primary) 6%, var(--card))',
                      border: '1px solid color-mix(in oklch, var(--primary) 15%, var(--border))',
                      color: 'color-mix(in oklch, var(--primary) 80%, var(--muted-foreground))',
                    }}
                  >
                    <Info size={12} className="flex-shrink-0 mt-0.5" />
                    <span>
                      {locale === 'tr'
                        ? 'Şifre belirleyerek daha sonra kullanıcı adı + şifre ile de giriş yapabilirsin. Atlarsan sadece Google ile giriş yapabilirsin.'
                        : 'By setting a password, you can log in later with username + password. If you skip, you can only log in with Google.'}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Error message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="flex items-start gap-2 px-4 py-3 rounded-xl text-xs font-semibold border"
            style={{
              background: 'color-mix(in oklch, var(--destructive) 8%, var(--card))',
              color: 'var(--destructive)',
              borderColor: 'color-mix(in oklch, var(--destructive) 20%, var(--border))',
            }}
          >
            <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}

        {/* Submit */}
        <motion.button
          type="submit"
          disabled={isPending}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-75 cursor-pointer mt-2 shadow-md shadow-primary/10"
          style={{
            background: 'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))'
          }}
        >
          {isPending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <>
              <Check size={16} />
              {locale === 'tr' ? 'Kurulumu Tamamla' : 'Complete Setup'}
            </>
          )}
        </motion.button>
      </form>
    </div>
  )
}
