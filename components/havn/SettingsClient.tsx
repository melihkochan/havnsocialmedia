'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { User, Lock, Palette, Loader2, Check, AlertCircle, Camera, LogOut, ArrowLeft, HelpCircle, Send, Bell, Volume2, VolumeX, Undo, Sliders, Globe, Info } from 'lucide-react'
import { updateProfile, changePassword, updateAccentTheme, updatePreferences } from '@/lib/actions/profile'
import { signOut } from '@/lib/actions/auth'
import { ThemeToggle } from '@/components/havn/ThemeToggle'
import { AvatarUpload } from '@/components/havn/AvatarUpload'
import { cn, getSafeTimestamp } from '@/lib/utils'
import Link from 'next/link'
import { getInitials } from '@/lib/profile-display'
import type { Profile } from '@/lib/supabase/types'
import { sendSupportRequest } from '@/lib/actions/support'
import { createClient } from '@/lib/supabase/client'
import { SearchableSelect } from '@/components/havn/SearchableSelect'
import { getCountriesAction, getCitiesAction } from '@/lib/actions/location'
import { LanguageSwitcher } from '@/components/havn/LanguageSwitcher'
import { useLocale } from '@/lib/i18n/LocaleContext'

interface SettingsClientProps { profile: Profile; email?: string }

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-2xl overflow-visible shadow-sm"
    >
      <div className="px-6 py-4 border-b border-border flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'color-mix(in oklch, var(--primary) 12%, transparent)' }}>
          <Icon size={16} style={{ color: 'var(--primary)' }} />
        </div>
        <h2 className="text-sm font-bold text-foreground">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </motion.div>
  )
}

function TabButton({ active, label, icon: Icon, onClick }: { active: boolean; label: string; icon: React.ElementType; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all relative overflow-hidden text-left cursor-pointer",
        active
          ? "text-primary-foreground font-black"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
      )}
      style={
        active
          ? { background: "linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))" }
          : {}
      }
    >
      <Icon size={16} className={cn("flex-shrink-0", active ? "text-primary-foreground" : "text-muted-foreground")} />
      <span>{label}</span>
    </button>
  )
}

function StatusMsg({ type, msg }: { type: 'success' | 'error'; msg: string }) {
  return (
    <div
      className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium"
      style={{
        background: type === 'success'
          ? 'color-mix(in oklch, var(--mod-color) 12%, transparent)'
          : 'color-mix(in oklch, var(--destructive) 12%, transparent)',
        color: type === 'success' ? 'var(--mod-color)' : 'var(--destructive)',
        border: `1px solid ${type === 'success' ? 'color-mix(in oklch, var(--mod-color) 30%, transparent)' : 'color-mix(in oklch, var(--destructive) 30%, transparent)'}`,
      }}
    >
      {type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
      {msg}
    </div>
  )
}

function Switch({ checked, onChange, label, description }: { checked: boolean; onChange: (val: boolean) => void; label: string; description?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-border/40 last:border-0">
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-xs font-bold text-foreground">{label}</span>
        {description && <span className="text-[10px] text-muted-foreground leading-relaxed">{description}</span>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={cn(
          "w-10 h-5.5 rounded-full p-0.5 transition-all duration-200 focus:outline-none cursor-pointer flex-shrink-0 relative",
          checked ? "bg-primary" : "bg-muted border border-border"
        )}
        style={checked ? { background: "linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))" } : {}}
      >
        <div
          className={cn(
            "w-4.5 h-4.5 rounded-full bg-white shadow-sm transition-all duration-200 transform",
            checked ? "translate-x-4.5" : "translate-x-0"
          )}
        />
      </button>
    </div>
  )
}


export function SettingsClient({ profile, email }: SettingsClientProps) {
  const { t, locale } = useLocale()
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'appearance' | 'preferences' | 'notifications' | 'support' | 'language' | 'account' | 'help'>('profile')
  const [notifPrefs, setNotifPrefs] = useState({
    all: true,
    support: true,
    likes: true,
    comments: true,
  })
  const [mutedUsers, setMutedUsers] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)

  // Enriched profile states
  const [isPrivate, setIsPrivate] = useState((profile as any).is_private || false)
  const [showStatus, setShowStatus] = useState((profile as any).show_status !== false)
  const [showXp, setShowXp] = useState((profile as any).show_xp !== false)
  const [showBadges, setShowBadges] = useState((profile as any).show_badges !== false)
  const [showActivityMap, setShowActivityMap] = useState((profile as any).show_activity_map !== false)
  const [twitter, setTwitter] = useState((profile as any).social_links?.twitter || '')
  const [instagram, setInstagram] = useState((profile as any).social_links?.instagram || '')
  const [github, setGithub] = useState((profile as any).social_links?.github || '')

  const [selectedCountry, setSelectedCountry] = useState((profile as any).country || '')
  const [selectedCity, setSelectedCity] = useState((profile as any).city || '')
  const [countriesList, setCountriesList] = useState<{ value: string; label: string; image: string }[]>([])
  const [citiesList, setCitiesList] = useState<{ value: string; label: string }[]>([])
  const [loadingGeo, setLoadingGeo] = useState(false)
  const isFirstLoad = useRef(true)

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

  useEffect(() => {
    if (!selectedCountry) {
      setCitiesList([])
      return
    }
    async function loadCities() {
      setLoadingGeo(true)
      try {
        const list = await getCitiesAction(selectedCountry)
        const formatted = list.map(city => ({ value: city, label: city }))
        setCitiesList(formatted)
        
        if (!isFirstLoad.current) {
          if (formatted.length > 0) {
            setSelectedCity(formatted[0].value)
          } else {
            setSelectedCity('')
          }
        } else {
          isFirstLoad.current = false
        }
      } catch (err) {
      } finally {
        setLoadingGeo(false)
      }
    }
    loadCities()
  }, [selectedCountry])

  const handleCountryChange = (countryCode: string) => {
    isFirstLoad.current = false
    setSelectedCountry(countryCode)
    setSelectedCity('')
  }


  const [accentTheme, setAccentTheme] = useState('purple')

  useEffect(() => {
    const dbTheme = (profile as any).accent_theme || 'purple'
    const saved = localStorage.getItem('havn_accent_theme') || dbTheme
    setAccentTheme(saved)
    document.documentElement.setAttribute('data-accent', saved)
  }, [profile])

  const changeAccentTheme = async (themeName: string) => {
    setAccentTheme(themeName)
    localStorage.setItem('havn_accent_theme', themeName)
    document.documentElement.setAttribute('data-accent', themeName)
    await updateAccentTheme(themeName)
  }

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSuggestions([])
      return
    }

    const delayDebounceFn = setTimeout(async () => {
      setLoadingSuggestions(true)
      const supabase = createClient()
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, first_name, last_name, avatar_url')
        .ilike('username', `%${searchQuery.trim().replace('@', '')}%`)
        .limit(5)

      if (!error && data) {
        setSuggestions(data)
      } else {
        setSuggestions([])
      }
      setLoadingSuggestions(false)
    }, 300)

    return () => clearTimeout(delayDebounceFn)
  }, [searchQuery])

  useEffect(() => {
    const savedPrefs = localStorage.getItem('havn_notif_prefs')
    if (savedPrefs) {
      try {
        setNotifPrefs(JSON.parse(savedPrefs))
      } catch (e) {}
    }
    const savedMuted = localStorage.getItem('havn_muted_users')
    if (savedMuted) {
      try {
        setMutedUsers(JSON.parse(savedMuted))
      } catch (e) {}
    }
  }, [])

  const updateNotifPref = (key: keyof typeof notifPrefs, value: boolean) => {
    const newPrefs = { ...notifPrefs, [key]: value }
    setNotifPrefs(newPrefs)
    localStorage.setItem('havn_notif_prefs', JSON.stringify(newPrefs))
  }

  const muteUser = (username: string) => {
    const cleanUsername = username.trim().replace('@', '').toLowerCase()
    if (!cleanUsername) return
    if (mutedUsers.includes(cleanUsername)) return
    const newMuted = [...mutedUsers, cleanUsername]
    setMutedUsers(newMuted)
    localStorage.setItem('havn_muted_users', JSON.stringify(newMuted))
  }

  const unmuteUser = (username: string) => {
    const cleanUsername = username.trim().toLowerCase()
    const newMuted = mutedUsers.filter(u => u !== cleanUsername)
    setMutedUsers(newMuted)
    localStorage.setItem('havn_muted_users', JSON.stringify(newMuted))
  }
  const [resetPending, setResetPending] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)

  async function handleForgotPassword() {
    if (!email) return
    setResetPending(true)
    setResetError(null)
    setResetSent(false)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      })
      if (error) {
        setResetError(error.message)
      } else {
        setResetSent(true)
      }
    } catch (err: any) {
      setResetError(err.message || 'Bir hata oluştu.')
    } finally {
      setResetPending(false)
    }
  }
  const [profileResult, setProfileResult] = useState<{ error?: string; success?: boolean } | null>(null)
  const [passwordResult, setPasswordResult] = useState<{ error?: string; success?: boolean } | null>(null)
  const [supportResult, setSupportResult] = useState<{ error?: string; success?: boolean } | null>(null)
  const [preferencesResult, setPreferencesResult] = useState<{ error?: string; success?: boolean } | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [bannerPreview, setBannerPreview] = useState<string | null>(profile.banner_url)
  const [isBannerDeleted, setIsBannerDeleted] = useState(false)
  const bannerInputRef = useRef<HTMLInputElement>(null)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [profilePending, startProfileTransition] = useTransition()
  const [passwordPending, startPasswordTransition] = useTransition()
  const [supportPending, startSupportTransition] = useTransition()
  const [preferencesPending, startPreferencesTransition] = useTransition()

  useEffect(() => {
    if (profile.banner_url) {
      setBannerPreview(`${profile.banner_url}?t=${getSafeTimestamp(profile.updated_at)}`)
    } else {
      setBannerPreview(null)
    }
    setAvatarFile(null)
    setBannerFile(null)
    setIsBannerDeleted(false)
  }, [profile.updated_at, profile.banner_url])

  async function handleBannerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const { compressImage } = await import('@/lib/image-compression')
    const compressed = await compressImage(file, 1200, 0.8)
    setBannerFile(compressed)
    setBannerPreview(URL.createObjectURL(compressed))
    setIsBannerDeleted(false)
  }

  function handleRemoveBanner() {
    setBannerFile(null)
    setBannerPreview(null)
    setIsBannerDeleted(true)
    if (bannerInputRef.current) bannerInputRef.current.value = ''
  }

  function handleUndoBanner() {
    setIsBannerDeleted(false)
    if (profile.banner_url) {
      setBannerPreview(`${profile.banner_url}?t=${getSafeTimestamp(profile.updated_at)}`)
    } else {
      setBannerPreview(null)
    }
  }

  async function handleProfileSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    if (avatarFile) fd.set('avatar', avatarFile)
    if (bannerFile) fd.set('banner', bannerFile)
    fd.set('delete_banner', isBannerDeleted.toString())
    fd.set('is_private', isPrivate.toString())
    fd.set('show_status', showStatus.toString())
    fd.set('show_xp', showXp.toString())
    fd.set('show_badges', showBadges.toString())
    fd.set('show_activity_map', showActivityMap.toString())
    fd.set('twitter', twitter)
    fd.set('instagram', instagram)
    fd.set('github', github)
    startProfileTransition(async () => {
      const res = await updateProfile(fd)
      setProfileResult(res)
    })
  }

  async function handlePreferencesSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPreferencesResult(null)
    startPreferencesTransition(async () => {
      const fd = new FormData()
      fd.set('is_private', isPrivate.toString())
      fd.set('show_status', showStatus.toString())
      fd.set('show_xp', showXp.toString())
      fd.set('show_badges', showBadges.toString())
      fd.set('show_activity_map', showActivityMap.toString())
      const res = await updatePreferences(fd)
      setPreferencesResult(res)
    })
  }

  async function handlePasswordSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    startPasswordTransition(async () => {
      const res = await changePassword(currentPassword, newPassword)
      setPasswordResult(res)
      if (!res.error) { setCurrentPassword(''); setNewPassword('') }
    })
  }

  async function handleSupportSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSupportResult(null)
    const fd = new FormData(e.currentTarget)
    startSupportTransition(async () => {
      const res = await sendSupportRequest(fd)
      setSupportResult(res)
      if (!res.error) {
        // Clear fields
        const messageTextarea = document.getElementById('support_message') as HTMLTextAreaElement
        if (messageTextarea) messageTextarea.value = ''
        const subjectInput = document.getElementById('support_subject') as HTMLInputElement
        if (subjectInput) subjectInput.value = ''
      }
    })
  }

  const tabs = [
    { id: 'profile' as const, label: t('settings.tab.profile'), icon: User },
    { id: 'password' as const, label: t('settings.tab.password'), icon: Lock },
    { id: 'appearance' as const, label: t('settings.tab.appearance'), icon: Palette },
    { id: 'preferences' as const, label: t('settings.tab.preferences'), icon: Sliders },
    { id: 'notifications' as const, label: t('settings.tab.notifications'), icon: Bell },
    { id: 'support' as const, label: t('settings.tab.support'), icon: HelpCircle },
    { id: 'help' as const, label: locale === 'tr' ? 'Yardım & Rehber' : 'Help & Guide', icon: Info },
    { id: 'language' as const, label: t('settings.tab.language'), icon: Globe },
    { id: 'account' as const, label: t('settings.tab.account'), icon: LogOut },
  ]

  return (
    <div className="w-full space-y-6">
      {/* Page Header (Sitting naturally on the background, no card layout) */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-black text-foreground tracking-tight">{t('settings.title')}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{t('settings.subtitle')}</p>
        </div>
        <Link
          href={`/profile/${profile.username}`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all group"
        >
          <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" />
          <span>{t('settings.back_to_profile')}</span>
        </Link>
      </div>

      {/* Main Grid: Left Tabs List, Right Active Section Card */}
      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6 items-start">
        {/* Left Sidebar Navigation (Borderless & floating glass buttons) */}
        <div className="bg-card/40 backdrop-blur-md border border-border/80 rounded-2xl p-3 flex md:flex-col gap-1.5 overflow-x-auto md:overflow-x-visible no-scrollbar shrink-0">
          {tabs.map((tab) => (
            <TabButton
              key={tab.id}
              active={activeTab === tab.id}
              label={tab.label}
              icon={tab.icon}
              onClick={() => setActiveTab(tab.id)}
            />
          ))}
        </div>

        {/* Content Display Area (Inside clean Section card) */}
        <div className="min-w-0">
          <AnimatePresence mode="wait">
            {activeTab === 'profile' && (
              <motion.div
                key="profile"
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
              >
                <Section title={t('settings.profile.title')} icon={User}>
                  <div className="relative">
                    {profilePending && (
                      <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] z-50 flex flex-col items-center justify-center rounded-2xl gap-3">
                        <div className="flex items-center gap-2 bg-card border border-border/80 px-4 py-3 rounded-2xl shadow-lg">
                          <Loader2 size={16} className="animate-spin text-primary" />
                          <span className="text-xs font-bold text-foreground">{t('settings.saving_changes')}</span>
                        </div>
                      </div>
                    )}
                    <form onSubmit={handleProfileSubmit} className="space-y-5">
                      {/* Banner */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-semibold text-muted-foreground block">{t('settings.profile.banner')}</label>
                          {isBannerDeleted ? (
                            <button
                              type="button"
                              onClick={handleUndoBanner}
                              className="text-[10px] font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <Undo size={11} />
                              {t('settings.profile.banner_undo')}
                            </button>
                          ) : (bannerPreview || bannerFile) ? (
                            <button
                              type="button"
                              onClick={handleRemoveBanner}
                              className="text-[10px] font-semibold text-muted-foreground hover:text-destructive transition-all cursor-pointer"
                            >
                              {t('settings.profile.banner_remove')}
                            </button>
                          ) : null}
                        </div>
                        <input type="hidden" name="delete_banner" value={isBannerDeleted ? 'true' : 'false'} />
                        <div
                          className="relative h-32 rounded-xl overflow-hidden border border-border group bg-muted/30 cursor-pointer transition-all duration-200 hover:border-primary/50 hover:bg-accent/40"
                          onClick={() => bannerInputRef.current?.click()}
                        >
                          {bannerPreview ? (
                            <img src={bannerPreview} alt={t('settings.profile.banner')} className="w-full h-full object-cover" />
                          ) : (
                            <div
                              className="w-full h-full opacity-70"
                              style={{
                                background: 'linear-gradient(135deg, var(--havn-gradient-start) 0%, var(--havn-gradient-end) 100%)',
                              }}
                            />
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-xs font-bold gap-1.5 backdrop-blur-[1px]">
                            <Camera size={20} />
                            <span>{t('settings.profile.banner_pick')}</span>
                          </div>
                        </div>
                        <input
                          ref={bannerInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleBannerChange}
                        />
                        <p className="text-[10px] text-muted-foreground mt-1.5">
                          {t('settings.profile.banner_hint')}
                        </p>
                      </div>

                    {/* Avatar */}
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground block mb-2">{t('settings.profile.avatar')}</label>
                      <AvatarUpload
                        key={profile.updated_at}
                        currentAvatarUrl={profile.avatar_url}
                        username={getInitials(profile)}
                        onFileSelect={setAvatarFile}
                      />
                    </div>

                    {/* Ad & Soyad */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground" htmlFor="first_name">{t('settings.profile.first_name')}</label>
                        <input
                          id="first_name"
                          name="first_name"
                          type="text"
                          defaultValue={profile.first_name ?? ''}
                          maxLength={50}
                          placeholder={t('settings.profile.first_name_placeholder')}
                          className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground" htmlFor="last_name">{t('settings.profile.last_name')}</label>
                        <input
                          id="last_name"
                          name="last_name"
                          type="text"
                          defaultValue={profile.last_name ?? ''}
                          maxLength={50}
                          placeholder={t('settings.profile.last_name_placeholder')}
                          className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                      </div>
                    </div>

                    {/* Username */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground" htmlFor="username">{t('settings.profile.username')}</label>
                      <p className="text-[10px] text-muted-foreground -mt-0.5">{t('settings.profile.username_hint')}</p>
                      <input
                        id="username"
                        name="username"
                        type="text"
                        defaultValue={profile.username}
                        minLength={3}
                        maxLength={30}
                        pattern="[a-zA-Z0-9_]+"
                        className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                    </div>

                    {/* Bio */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground" htmlFor="bio">{t('settings.profile.bio')}</label>
                      <textarea
                        id="bio"
                        name="bio"
                        defaultValue={profile.bio ?? ''}
                        rows={3}
                        maxLength={160}
                        placeholder={t('settings.profile.bio_placeholder')}
                        className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none placeholder:text-muted-foreground"
                      />
                    </div>

                    {/* Ülke & Şehir Seçimi */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground">{t('settings.profile.country')}</label>
                        <SearchableSelect
                          value={selectedCountry}
                          onChange={handleCountryChange}
                          options={countriesList}
                          placeholder={t('settings.profile.country_placeholder')}
                          selectClassName="bg-background py-3"
                        />
                        <input type="hidden" name="country" value={selectedCountry} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground">{t('settings.profile.city')}</label>
                        <SearchableSelect
                          value={selectedCity}
                          onChange={setSelectedCity}
                          options={citiesList}
                          placeholder={loadingGeo ? t('settings.profile.city_loading') : t('settings.profile.city_placeholder')}
                          disabled={!selectedCountry || loadingGeo}
                          selectClassName="bg-background py-3"
                        />
                        <input type="hidden" name="city" value={selectedCity} />
                      </div>
                    </div>

                    {/* Sosyal Medya Bağlantıları */}
                    <div className="pt-4 border-t border-border/40 space-y-4">
                      <h3 className="text-xs font-bold text-foreground">{t('settings.profile.social')}</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-semibold text-muted-foreground">{t('settings.profile.social.twitter')}</label>
                          <input
                            type="text"
                            value={twitter}
                            onChange={(e) => setTwitter(e.target.value)}
                            placeholder={t('settings.profile.social.username_placeholder')}
                            className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-muted-foreground"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-semibold text-muted-foreground">{t('settings.profile.social.instagram')}</label>
                          <input
                            type="text"
                            value={instagram}
                            onChange={(e) => setInstagram(e.target.value)}
                            placeholder={t('settings.profile.social.username_placeholder')}
                            className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-muted-foreground"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-semibold text-muted-foreground">{t('settings.profile.social.github')}</label>
                          <input
                            type="text"
                            value={github}
                            onChange={(e) => setGithub(e.target.value)}
                            placeholder={t('settings.profile.social.username_placeholder')}
                            className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-muted-foreground"
                          />
                        </div>
                      </div>
                    </div>

                    {profileResult && (
                      <StatusMsg
                        type={profileResult.error ? 'error' : 'success'}
                        msg={profileResult.error ? t(profileResult.error as any) : t('settings.profile.success')}
                      />
                    )}

                    <motion.button
                      type="submit"
                      disabled={profilePending}
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      style={{
                        background: 'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))',
                        color: 'var(--primary-foreground)',
                      }}
                    >
                      {profilePending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                      {t('settings.save')}
                    </motion.button>
                  </form>
                </div>
              </Section>
              </motion.div>
            )}

            {activeTab === 'password' && (
              <motion.div
                key="password"
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
              >
                <Section title={t('settings.password.title')} icon={Lock}>
                  <form onSubmit={handlePasswordSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">{t('settings.password.current')}</label>
                      <input
                        type="password"
                        required
                        value={currentPassword}
                        onChange={e => setCurrentPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">{t('settings.password.new')}</label>
                      <input
                        type="password"
                        required
                        minLength={8}
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder={t('settings.password.new_hint')}
                        className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                    </div>

                    {passwordResult && (
                      <StatusMsg
                        type={passwordResult.error ? 'error' : 'success'}
                        msg={passwordResult.error ? t(passwordResult.error as any) : t('settings.password.success')}
                      />
                    )}

                    <motion.button
                      type="submit"
                      disabled={passwordPending}
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold border border-border text-foreground hover:bg-accent transition-all cursor-pointer"
                    >
                      {passwordPending ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
                      {t('settings.password.submit')}
                    </motion.button>
                  </form>

                  {email && (
                    <div className="mt-4 pt-4 border-t border-border/60 flex flex-col gap-2">
                      <button
                        type="button"
                        disabled={resetPending}
                        onClick={handleForgotPassword}
                        className="text-xs font-bold text-primary hover:underline cursor-pointer text-left w-fit disabled:opacity-50"
                      >
                        {resetPending ? t('settings.password.forgot_sending') : t('settings.password.forgot')}
                      </button>
                      {resetSent && (
                        <p className="text-xs text-green-500 font-semibold mt-1">
                          {t('settings.password.forgot_sent', { email })}
                        </p>
                      )}
                      {resetError && (
                        <p className="text-xs text-destructive font-semibold mt-1">
                          {t(resetError as any)}
                        </p>
                      )}
                    </div>
                  )}
                </Section>
              </motion.div>
            )}

            {activeTab === 'appearance' && (
              <motion.div
                key="appearance"
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
              >
                <Section title={t('settings.appearance.title')} icon={Palette}>
                  <div className="space-y-6">
                    {/* Tema seçimi */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground">{t('settings.appearance.theme')}</p>
                      <div className="max-w-xs">
                        <ThemeToggle variant="sidebar" />
                      </div>
                    </div>

                    {/* Renk Teması */}
                    <div className="space-y-3 pt-4 border-t border-border/40">
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground">{t('settings.appearance.accent')}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{t('settings.appearance.accent_hint')}</p>
                      </div>
                      <div className="flex flex-wrap gap-2.5">
                        {[
                          { id: "purple", label: t('settings.appearance.accent.purple'), start: "oklch(0.48 0.22 264)", end: "oklch(0.55 0.22 290)" },
                          { id: "indigo", label: t('settings.appearance.accent.indigo'), start: "oklch(0.50 0.20 280)", end: "oklch(0.58 0.20 305)" },
                          { id: "rose", label: t('settings.appearance.accent.rose'), start: "oklch(0.55 0.22 350)", end: "oklch(0.62 0.20 15)" },
                          { id: "amber", label: t('settings.appearance.accent.amber'), start: "oklch(0.62 0.20 50)", end: "oklch(0.68 0.18 70)" },
                          { id: "teal", label: t('settings.appearance.accent.teal'), start: "oklch(0.50 0.18 170)", end: "oklch(0.58 0.15 195)" },
                        ].map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => changeAccentTheme(item.id)}
                            className={cn(
                              "flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all duration-200 cursor-pointer hover:scale-[1.02] active:scale-98",
                              accentTheme === item.id
                                ? "border-primary bg-primary/10 text-foreground"
                                : "border-border bg-card text-muted-foreground hover:text-foreground"
                            )}
                          >
                            <span
                              className="w-3.5 h-3.5 rounded-full flex-shrink-0 shadow-sm"
                              style={{
                                background: `linear-gradient(135deg, ${item.start}, ${item.end})`
                              }}
                            />
                            {item.label}
                            {accentTheme === item.id && (
                              <span className="w-1 h-1 rounded-full bg-primary" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </Section>
              </motion.div>
            )}

            {activeTab === 'preferences' && (
              <motion.div
                key="preferences"
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
              >
                <Section title={t('settings.preferences.title')} icon={Sliders}>
                  <div className="relative">
                    {preferencesPending && (
                      <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] z-50 flex flex-col items-center justify-center rounded-2xl gap-3">
                        <div className="flex items-center gap-2 bg-card border border-border/80 px-4 py-3 rounded-2xl shadow-lg">
                          <Loader2 size={16} className="animate-spin text-primary" />
                          <span className="text-xs font-bold text-foreground">{t('settings.saving_changes')}</span>
                        </div>
                      </div>
                    )}
                    <form onSubmit={handlePreferencesSubmit} className="space-y-6">
                      <p className="text-xs text-muted-foreground">
                        {t('settings.preferences.subtitle')}
                      </p>
                      
                      <div className="bg-muted/10 border border-border/60 rounded-2xl px-5 py-1">
                        {/* Profil Gizliliği */}
                        <Switch
                          checked={isPrivate}
                          onChange={setIsPrivate}
                          label={t('settings.preferences.private')}
                          description={t('settings.preferences.private_desc')}
                        />

                        {/* Çevrimiçi Durumu */}
                        <Switch
                          checked={showStatus}
                          onChange={setShowStatus}
                          label={t('settings.preferences.show_status_label')}
                          description={t('settings.preferences.show_status_desc_new')}
                        />

                        {/* XP ve Seviye Gösterimi */}
                        <Switch
                          checked={showXp}
                          onChange={setShowXp}
                          label={t('settings.preferences.show_xp_label')}
                          description={t('settings.preferences.show_xp_desc_new')}
                        />

                        {/* Rozet Gösterimi */}
                        <Switch
                          checked={showBadges}
                          onChange={setShowBadges}
                          label={t('settings.preferences.show_badges_label')}
                          description={t('settings.preferences.show_badges_desc_new')}
                        />

                        {/* Aktivite Haritası Gösterimi */}
                        <Switch
                          checked={showActivityMap}
                          onChange={setShowActivityMap}
                          label={t('settings.preferences.show_activity_map_label')}
                          description={t('settings.preferences.show_activity_map_desc')}
                        />
                      </div>

                      {preferencesResult && (
                        <StatusMsg
                          type={preferencesResult.error ? 'error' : 'success'}
                          msg={preferencesResult.error ? t(preferencesResult.error as any) : t('settings.preferences.success')}
                        />
                      )}

                      <motion.button
                        type="submit"
                        disabled={preferencesPending}
                        whileTap={{ scale: 0.98 }}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                        style={{
                          background: 'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))',
                          color: 'var(--primary-foreground)',
                        }}
                      >
                        {preferencesPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                        {t('settings.save')}
                      </motion.button>
                    </form>
                  </div>
                </Section>
              </motion.div>
            )}

            {activeTab === 'notifications' && (
              <motion.div
                key="notifications"
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
              >
                <Section title={t('settings.notifications.title')} icon={Bell}>
                  <div className="space-y-6">
                    {/* Toggles */}
                    <div className="space-y-1">
                      <h3 className="text-xs font-bold text-foreground mb-3 select-none">{t('settings.notifications.types')}</h3>
                      <div className="bg-muted/10 border border-border/60 rounded-2xl px-5 py-1">
                        <Switch
                          checked={notifPrefs.all}
                          onChange={(val) => updateNotifPref('all', val)}
                          label={t('settings.notifications.all')}
                          description={t('settings.notifications.all_desc_new')}
                        />
                        {notifPrefs.all && (
                          <>
                            <Switch
                              checked={notifPrefs.likes}
                              onChange={(val) => updateNotifPref('likes', val)}
                              label={t('settings.notifications.likes_label')}
                              description={t('settings.notifications.likes_desc_new')}
                            />
                            <Switch
                              checked={notifPrefs.comments}
                              onChange={(val) => updateNotifPref('comments', val)}
                              label={t('settings.notifications.comments_label')}
                              description={t('settings.notifications.comments_desc_new')}
                            />
                            <Switch
                              checked={notifPrefs.support}
                              onChange={(val) => updateNotifPref('support', val)}
                              label={t('settings.notifications.support_label')}
                              description={t('settings.notifications.support_desc_new')}
                            />
                          </>
                        )}
                      </div>
                    </div>

                    {/* Muted Users list */}
                    <div className="space-y-3 pt-2">
                      <div>
                        <h3 className="text-xs font-bold text-foreground select-none">{t('settings.notifications.muted_users')}</h3>
                        <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{t('settings.notifications.mute_desc_new')}</p>
                      </div>
                      
                      {/* Manual mute input with Autocomplete Suggestions */}
                      <div className="relative">
                        <div className="flex gap-2">
                          <input
                            id="mute-username-input"
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={t('settings.notifications.mute_placeholder')}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs outline-none focus:border-primary transition-all"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const val = searchQuery.trim()
                                if (val) {
                                  muteUser(val)
                                  setSearchQuery('')
                                }
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const val = searchQuery.trim()
                              if (val) {
                                  muteUser(val)
                                  setSearchQuery('')
                              }
                            }}
                            className="px-4 py-2.5 rounded-xl text-xs font-bold border border-border text-foreground hover:bg-accent transition-all cursor-pointer flex-shrink-0"
                          >
                            {t('settings.notifications.mute_add')}
                          </button>
                        </div>

                        {/* Autocomplete Suggestions Dropdown */}
                        <AnimatePresence>
                          {suggestions.length > 0 && (
                            <motion.div
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -4 }}
                              className="absolute left-0 right-0 mt-1.5 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden"
                            >
                              {suggestions.map((u) => {
                                const isAlreadyMuted = mutedUsers.includes(u.username.toLowerCase())
                                return (
                                  <div
                                    key={u.id}
                                    onClick={() => {
                                      if (!isAlreadyMuted) {
                                        muteUser(u.username)
                                      }
                                      setSearchQuery('')
                                    }}
                                    className={cn(
                                      "flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors cursor-pointer border-b border-border/40 last:border-0",
                                      isAlreadyMuted && "opacity-60 cursor-default hover:bg-transparent"
                                    )}
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      {u.avatar_url ? (
                                        <img src={u.avatar_url} alt={u.username} className="w-6 h-6 rounded-full object-cover ring-1 ring-border" />
                                      ) : (
                                        <div
                                          className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px]"
                                          style={{
                                            background: `linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))`,
                                            filter: `hue-rotate(${(u.username.charCodeAt(0) * 17) % 360}deg)`,
                                            color: 'var(--primary-foreground)',
                                          }}
                                        >
                                          {u.username.slice(0, 2).toUpperCase()}
                                        </div>
                                      )}
                                      <div className="flex flex-col min-w-0">
                                        <span className="text-xs font-bold text-foreground truncate">
                                          {u.first_name || u.last_name
                                            ? `${u.first_name || ''} ${u.last_name || ''}`.trim()
                                            : `@${u.username}`}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground truncate">@{u.username}</span>
                                      </div>
                                    </div>
                                    <span className="text-[10px] font-bold text-primary flex-shrink-0">
                                      {isAlreadyMuted ? (locale === 'tr' ? 'Sessizde' : 'Muted') : t('settings.notifications.mute_add')}
                                    </span>
                                  </div>
                                )
                              })}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Muted users list items */}
                      <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                        {mutedUsers.length === 0 ? (
                          <div className="text-center py-6 border border-dashed border-border/80 rounded-2xl text-[11px] text-muted-foreground">
                            {t('settings.notifications.empty_muted')}
                          </div>
                        ) : (
                          mutedUsers.map((username) => (
                            <div
                              key={username}
                              className="flex items-center justify-between gap-3 p-3 bg-muted/20 border border-border/60 rounded-xl"
                            >
                              <span className="text-xs font-semibold text-foreground">@{username}</span>
                              <button
                                type="button"
                                onClick={() => unmuteUser(username)}
                                className="px-2.5 py-1.5 rounded-lg border border-border text-[10px] font-bold text-muted-foreground hover:text-destructive hover:border-destructive/20 hover:bg-destructive/5 transition-all cursor-pointer flex-shrink-0"
                              >
                                {t('settings.notifications.unmute')}
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </Section>
              </motion.div>
            )}

            {activeTab === 'support' && (
              <motion.div
                key="support"
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
              >
                <Section title={t('settings.support.title')} icon={HelpCircle}>
                  <form onSubmit={handleSupportSubmit} className="space-y-4">
                    <p className="text-xs text-muted-foreground">
                      {t('settings.support.desc')}
                    </p>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground" htmlFor="support_subject">{t('settings.support.subject')}</label>
                      <input
                        id="support_subject"
                        name="subject"
                        type="text"
                        required
                        placeholder={t('settings.support.subject_placeholder_new')}
                        className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground" htmlFor="support_message">{t('settings.support.message')}</label>
                      <textarea
                        id="support_message"
                        name="message"
                        required
                        rows={5}
                        placeholder={t('settings.support.message_placeholder_new')}
                        className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none placeholder:text-muted-foreground"
                      />
                    </div>

                    {supportResult && (
                      <StatusMsg
                        type={supportResult.error ? 'error' : 'success'}
                        msg={supportResult.error ? t(supportResult.error as any) : t('settings.support.success_new')}
                      />
                    )}

                    <motion.button
                      type="submit"
                      disabled={supportPending}
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      style={{
                        background: 'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))',
                        color: 'var(--primary-foreground)',
                      }}
                    >
                      {supportPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                      {t('settings.support.submit')}
                    </motion.button>
                  </form>
                </Section>
              </motion.div>
            )}

            {activeTab === 'account' && (
              <motion.div
                key="account"
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
              >
                <Section title={t('settings.account.title')} icon={LogOut}>
                  <div className="space-y-4">
                    <div className="bg-destructive/5 border border-destructive/10 rounded-xl p-4">
                      <h3 className="text-xs font-bold text-destructive mb-1">{t('settings.account.logout')}</h3>
                      <p className="text-xs text-muted-foreground mb-3">{t('settings.account.logout_desc')}</p>
                      <form action={signOut}>
                        <motion.button
                          type="submit"
                          whileTap={{ scale: 0.97 }}
                          className="px-4 py-2.5 rounded-xl text-xs font-bold border transition-all hover:opacity-90 cursor-pointer"
                          style={{
                            color: 'var(--destructive)',
                            borderColor: 'color-mix(in oklch, var(--destructive) 40%, transparent)',
                            background: 'color-mix(in oklch, var(--destructive) 8%, transparent)',
                          }}
                        >
                          {t('settings.account.logout')}
                        </motion.button>
                      </form>
                    </div>
                  </div>
                </Section>
              </motion.div>
            )}

            {activeTab === 'language' && (
              <motion.div
                key="language"
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
              >
                <Section title={t('settings.language.title')} icon={Globe}>
                  <LanguageSwitcher variant="settings" />
                </Section>
              </motion.div>
            )}

            {activeTab === 'help' && (
              <motion.div
                key="help"
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
              >
                <Section title={locale === 'tr' ? 'Yardım & Platform Rehberi' : 'Help & Platform Guide'} icon={Info}>
                  <div className="space-y-4">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {locale === 'tr' 
                        ? 'Platform kullanımı, seviye ve XP sistemi, rozetler ve sıkça sorulan sorular hakkında detaylı bilgi almak için rehberimizi inceleyebilirsiniz.' 
                        : 'You can check our guide to get detailed information about platform usage, level and XP system, badges, and frequently asked questions.'}
                    </p>
                    <Link
                      href="/help"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md w-fit"
                      style={{
                        background: 'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))',
                        color: 'var(--primary-foreground)',
                      }}
                    >
                      <HelpCircle size={14} />
                      {locale === 'tr' ? 'Yardım Merkezi\'ne Git' : 'Go to Help Center'}
                    </Link>
                  </div>
                </Section>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
