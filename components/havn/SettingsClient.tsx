'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { User, Lock, Palette, Loader2, Check, AlertCircle, Camera, LogOut, ArrowLeft, HelpCircle, Send, Bell, Volume2, VolumeX, Undo } from 'lucide-react'
import { updateProfile, changePassword, updateAccentTheme } from '@/lib/actions/profile'
import { signOut } from '@/lib/actions/auth'
import { ThemeToggle } from '@/components/havn/ThemeToggle'
import { AvatarUpload } from '@/components/havn/AvatarUpload'
import { cn, getSafeTimestamp } from '@/lib/utils'
import Link from 'next/link'
import { getInitials } from '@/lib/profile-display'
import type { Profile } from '@/lib/supabase/types'
import { sendSupportRequest } from '@/lib/actions/support'
import { createClient } from '@/lib/supabase/client'

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
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'appearance' | 'notifications' | 'support' | 'account'>('profile')
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
  const [twitter, setTwitter] = useState((profile as any).social_links?.twitter || '')
  const [instagram, setInstagram] = useState((profile as any).social_links?.instagram || '')
  const [github, setGithub] = useState((profile as any).social_links?.github || '')

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
    fd.set('twitter', twitter)
    fd.set('instagram', instagram)
    fd.set('github', github)
    startProfileTransition(async () => {
      const res = await updateProfile(fd)
      setProfileResult(res)
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
    { id: 'profile' as const, label: 'Profil Bilgileri', icon: User },
    { id: 'password' as const, label: 'Şifre Değiştir', icon: Lock },
    { id: 'appearance' as const, label: 'Görünüm', icon: Palette },
    { id: 'notifications' as const, label: 'Bildirim Tercihleri', icon: Bell },
    { id: 'support' as const, label: 'Destek Talebi', icon: HelpCircle },
    { id: 'account' as const, label: 'Hesap Yönetimi', icon: LogOut },
  ]

  return (
    <div className="w-full space-y-6">
      {/* Page Header (Sitting naturally on the background, no card layout) */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-black text-foreground tracking-tight">Ayarlar</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Profilini, şifreni ve görünüm tercihlerini yönet.</p>
        </div>
        <Link
          href={`/profile/${profile.username}`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all group"
        >
          <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" />
          <span>Profile Dön</span>
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
                <Section title="Profil Bilgileri" icon={User}>
                  <div className="relative">
                    {profilePending && (
                      <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] z-50 flex flex-col items-center justify-center rounded-2xl gap-3">
                        <div className="flex items-center gap-2 bg-card border border-border/80 px-4 py-3 rounded-2xl shadow-lg">
                          <Loader2 size={16} className="animate-spin text-primary" />
                          <span className="text-xs font-bold text-foreground">Değişiklikler Kaydediliyor...</span>
                        </div>
                      </div>
                    )}
                    <form onSubmit={handleProfileSubmit} className="space-y-5">
                      {/* Banner */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-semibold text-muted-foreground block">Kapak Görseli (Banner)</label>
                          {isBannerDeleted ? (
                            <button
                              type="button"
                              onClick={handleUndoBanner}
                              className="text-[10px] font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <Undo size={11} />
                              Geri Al
                            </button>
                          ) : (bannerPreview || bannerFile) ? (
                            <button
                              type="button"
                              onClick={handleRemoveBanner}
                              className="text-[10px] font-semibold text-muted-foreground hover:text-destructive transition-all cursor-pointer"
                            >
                              Kapağı Kaldır
                            </button>
                          ) : null}
                        </div>
                        <input type="hidden" name="delete_banner" value={isBannerDeleted ? 'true' : 'false'} />
                        <div
                          className="relative h-32 rounded-xl overflow-hidden border border-border group bg-muted/30 cursor-pointer transition-all duration-200 hover:border-primary/50 hover:bg-accent/40"
                          onClick={() => bannerInputRef.current?.click()}
                        >
                          {bannerPreview ? (
                            <img src={bannerPreview} alt="Kapak Görseli" className="w-full h-full object-cover" />
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
                            <span>Kapak Resmi Seç</span>
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
                          JPG, PNG — En iyi görünüm için 3:1 veya 16:9 genişlik oranı tavsiye edilir.
                        </p>
                      </div>

                    {/* Avatar */}
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground block mb-2">Profil Fotoğrafı</label>
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
                        <label className="text-xs font-semibold text-muted-foreground" htmlFor="first_name">Ad</label>
                        <input
                          id="first_name"
                          name="first_name"
                          type="text"
                          defaultValue={profile.first_name ?? ''}
                          maxLength={50}
                          placeholder="Adınız"
                          className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground" htmlFor="last_name">Soyad</label>
                        <input
                          id="last_name"
                          name="last_name"
                          type="text"
                          defaultValue={profile.last_name ?? ''}
                          maxLength={50}
                          placeholder="Soyadınız"
                          className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                      </div>
                    </div>

                    {/* Username */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground" htmlFor="username">Kullanıcı Adı</label>
                      <p className="text-[10px] text-muted-foreground -mt-0.5">Profilinde küçük yazıyla görünür; benzersiz olmalıdır.</p>
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
                      <label className="text-xs font-semibold text-muted-foreground" htmlFor="bio">Hakkımda</label>
                      <textarea
                        id="bio"
                        name="bio"
                        defaultValue={profile.bio ?? ''}
                        rows={3}
                        maxLength={160}
                        placeholder="Kendinden kısaca bahset..."
                        className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none placeholder:text-muted-foreground"
                      />
                    </div>

                    {/* Profil Gizliliği */}
                    <div className="pt-2 border-t border-border/40">
                      <Switch
                        checked={isPrivate}
                        onChange={setIsPrivate}
                        label="Gizli Profil"
                        description="Hesabını gizlediğinde gönderilerini yalnızca takipçilerin görebilir."
                      />
                    </div>

                    {/* Çevrimiçi Durumu */}
                    <div className="pt-2 border-t border-border/40">
                      <Switch
                        checked={showStatus}
                        onChange={setShowStatus}
                        label="Çevrimiçi Durumunu Paylaş"
                        description="Açık olduğunda, diğer kullanıcılar çevrimiçi veya en son aktif olduğunuz zamanı görebilir."
                      />
                    </div>

                    {/* Sosyal Medya Bağlantıları */}
                    <div className="pt-4 border-t border-border/40 space-y-4">
                      <h3 className="text-xs font-bold text-foreground">Sosyal Medya Bağlantıları</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-semibold text-muted-foreground">Twitter / X</label>
                          <input
                            type="text"
                            value={twitter}
                            onChange={(e) => setTwitter(e.target.value)}
                            placeholder="Kullanıcı Adı"
                            className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-muted-foreground"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-semibold text-muted-foreground">Instagram</label>
                          <input
                            type="text"
                            value={instagram}
                            onChange={(e) => setInstagram(e.target.value)}
                            placeholder="Kullanıcı Adı"
                            className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-muted-foreground"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-semibold text-muted-foreground">GitHub</label>
                          <input
                            type="text"
                            value={github}
                            onChange={(e) => setGithub(e.target.value)}
                            placeholder="Kullanıcı Adı"
                            className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-muted-foreground"
                          />
                        </div>
                      </div>
                    </div>

                    {profileResult && (
                      <StatusMsg
                        type={profileResult.error ? 'error' : 'success'}
                        msg={profileResult.error ?? 'Profil başarıyla güncellendi!'}
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
                      Kaydet
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
                <Section title="Şifre Değiştir" icon={Lock}>
                  <form onSubmit={handlePasswordSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">Mevcut Şifre</label>
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
                      <label className="text-xs font-semibold text-muted-foreground">Yeni Şifre</label>
                      <input
                        type="password"
                        required
                        minLength={8}
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="En az 8 karakter"
                        className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                    </div>

                    {passwordResult && (
                      <StatusMsg
                        type={passwordResult.error ? 'error' : 'success'}
                        msg={passwordResult.error ?? 'Şifre başarıyla değiştirildi!'}
                      />
                    )}

                    <motion.button
                      type="submit"
                      disabled={passwordPending}
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold border border-border text-foreground hover:bg-accent transition-all cursor-pointer"
                    >
                      {passwordPending ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
                      Şifreyi Güncelle
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
                        {resetPending ? 'Sıfırlama bağlantısı gönderiliyor...' : 'Mevcut Şifremi Unuttum'}
                      </button>
                      {resetSent && (
                        <p className="text-xs text-green-500 font-semibold mt-1">
                          Şifre sıfırlama bağlantısı e-posta adresinize ({email}) gönderildi. E-postayı kontrol edin.
                        </p>
                      )}
                      {resetError && (
                        <p className="text-xs text-destructive font-semibold mt-1">
                          {resetError}
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
                <Section title="Görünüm Ayarları" icon={Palette}>
                  <div className="space-y-6">
                    {/* Tema seçimi */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground">Uygulama Teması</p>
                      <div className="max-w-xs">
                        <ThemeToggle variant="sidebar" />
                      </div>
                    </div>

                    {/* Renk Teması */}
                    <div className="space-y-3 pt-4 border-t border-border/40">
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground">Renk Teması (Accent Color)</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Uygulama genelindeki birincil vurgu rengini seçin.</p>
                      </div>
                      <div className="flex flex-wrap gap-2.5">
                        {[
                          { id: "purple", label: "Havn Moru", start: "oklch(0.48 0.22 264)", end: "oklch(0.55 0.22 290)" },
                          { id: "indigo", label: "İndigo", start: "oklch(0.50 0.20 280)", end: "oklch(0.58 0.20 305)" },
                          { id: "rose", label: "Gül Kurusu", start: "oklch(0.55 0.22 350)", end: "oklch(0.62 0.20 15)" },
                          { id: "amber", label: "Amber", start: "oklch(0.62 0.20 50)", end: "oklch(0.68 0.18 70)" },
                          { id: "teal", label: "Turkuaz", start: "oklch(0.50 0.18 170)", end: "oklch(0.58 0.15 195)" },
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

            {activeTab === 'notifications' && (
              <motion.div
                key="notifications"
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
              >
                <Section title="Bildirim Tercihleri" icon={Bell}>
                  <div className="space-y-6">
                    {/* Toggles */}
                    <div className="space-y-1">
                      <h3 className="text-xs font-bold text-foreground mb-3 select-none">Bildirim Türleri</h3>
                      <div className="bg-muted/10 border border-border/60 rounded-2xl px-5 py-1">
                        <Switch
                          checked={notifPrefs.all}
                          onChange={(val) => updateNotifPref('all', val)}
                          label="Tüm Bildirimler"
                          description="Bildirimlerin genel olarak gösterilmesini kontrol eder"
                        />
                        {notifPrefs.all && (
                          <>
                            <Switch
                              checked={notifPrefs.likes}
                              onChange={(val) => updateNotifPref('likes', val)}
                              label="Beğeniler"
                              description="Gönderileriniz ve yorumlarınız beğenildiğinde bildirim alın"
                            />
                            <Switch
                              checked={notifPrefs.comments}
                              onChange={(val) => updateNotifPref('comments', val)}
                              label="Yorumlar ve Yanıtlar"
                              description="Gönderilerinize yorum yapıldığında veya yorumunuza yanıt geldiğinde bildirim alın"
                            />
                            <Switch
                              checked={notifPrefs.support}
                              onChange={(val) => updateNotifPref('support', val)}
                              label="Destek Talepleri ve Öneriler"
                              description="Destek talepleriniz veya önerileriniz güncellendiğinde, ya da yöneticiden bildirim geldiğinde bildirim alın"
                            />
                          </>
                        )}
                      </div>
                    </div>

                    {/* Muted Users list */}
                    <div className="space-y-3 pt-2">
                      <div>
                        <h3 className="text-xs font-bold text-foreground select-none">Sessize Alınan Kullanıcılar</h3>
                        <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">Sessize aldığınız kullanıcıların beğeni, yorum veya takip bildirimleri size gösterilmez.</p>
                      </div>
                      
                      {/* Manual mute input with Autocomplete Suggestions */}
                      <div className="relative">
                        <div className="flex gap-2">
                          <input
                            id="mute-username-input"
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Kullanıcı adı girin... (Örn: melih)"
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
                            Sessize Al
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
                                      {isAlreadyMuted ? 'Sessizde' : 'Sessize Al'}
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
                            Henüz sessize alınan bir kullanıcı yok.
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
                                Sesi Aç
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
                <Section title="Destek Talebi Gönder" icon={HelpCircle}>
                  <form onSubmit={handleSupportSubmit} className="space-y-4">
                    <p className="text-xs text-muted-foreground">
                      Uygulamayla ilgili bir hata bildiriminde bulunmak, öneri sunmak veya destek almak için talebini iletebilirsin. Talebin doğrudan destek e-posta adresimize gönderilecektir.
                    </p>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground" htmlFor="support_subject">Konu</label>
                      <input
                        id="support_subject"
                        name="subject"
                        type="text"
                        required
                        placeholder="Örn: Profil fotoğrafı yükleme hatası"
                        className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground" htmlFor="support_message">Mesajınız</label>
                      <textarea
                        id="support_message"
                        name="message"
                        required
                        rows={5}
                        placeholder="Karşılaştığınız sorunu veya önerinizi detaylıca yazınız..."
                        className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none placeholder:text-muted-foreground"
                      />
                    </div>

                    {supportResult && (
                      <StatusMsg
                        type={supportResult.error ? 'error' : 'success'}
                        msg={supportResult.error ?? 'Destek talebiniz başarıyla gönderildi! Teşekkür ederiz.'}
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
                      Talebi Gönder
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
                <Section title="Hesap Yönetimi" icon={LogOut}>
                  <div className="space-y-4">
                    <div className="bg-destructive/5 border border-destructive/10 rounded-xl p-4">
                      <h3 className="text-xs font-bold text-destructive mb-1">Oturumu Kapat</h3>
                      <p className="text-xs text-muted-foreground mb-3">Hesabınızdan güvenli bir şekilde çıkış yapın.</p>
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
                          Çıkış Yap
                        </motion.button>
                      </form>
                    </div>
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
