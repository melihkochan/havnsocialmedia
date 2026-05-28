'use client'

import { useState, useTransition } from 'react'
import { Check, Loader2, AlertCircle, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import { completeProfileSetup } from '@/lib/actions/profile'
import { AvatarUpload } from '@/components/havn/AvatarUpload'
import { getInitials } from '@/lib/profile-display'
import type { Profile } from '@/lib/supabase/types'

interface ProfileSetupClientProps {
  profile: Profile
}

export function ProfileSetupClient({ profile }: ProfileSetupClientProps) {
  const [username, setUsername] = useState(profile.username || '')
  const [firstName, setFirstName] = useState(profile.first_name || '')
  const [lastName, setLastName] = useState(profile.last_name || '')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const cleanUsername = username.trim()
    if (!cleanUsername) {
      setError('Kullanıcı adı zorunludur.')
      return
    }

    const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/
    if (!usernameRegex.test(cleanUsername)) {
      setError('Kullanıcı adı 3-30 karakter olmalı, sadece harf, rakam ve alt çizgi (_) içermelidir.')
      return
    }

    const fd = new FormData()
    fd.set('username', cleanUsername)
    fd.set('first_name', firstName.trim())
    fd.set('last_name', lastName.trim())
    
    if (avatarFile) {
      fd.set('avatar', avatarFile)
    } else if (profile.avatar_url) {
      fd.set('google_avatar_url', profile.avatar_url)
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
    <div className="flex flex-col gap-6">
      {/* Title */}
      <div className="text-center space-y-2 select-none">
        <div className="inline-flex items-center justify-center p-2.5 rounded-2xl bg-primary/10 text-primary mb-1">
          <Sparkles size={24} className="animate-pulse" />
        </div>
        <h2 className="text-xl font-black text-foreground">Profilini Kur</h2>
        <p className="text-xs text-muted-foreground max-w-xs mx-auto">
          HAVN ağına katılmadan önce profil bilgilerinizi onaylayın veya özelleştirin.
        </p>
      </div>

      <form onSubmit={handleComplete} className="space-y-4">
        {/* Avatar */}
        <div className="flex flex-col items-center">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block text-center select-none">
            Profil Resmi
          </label>
          <AvatarUpload
            currentAvatarUrl={profile.avatar_url}
            username={getInitials(profile)}
            onFileSelect={setAvatarFile}
          />
        </div>

        {/* Username */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-muted-foreground" htmlFor="setup-username">
            Kullanıcı Adı
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
            Profilinizde ve paylaşımlarınızda küçük yazıyla görünür. Benzersiz olmalıdır.
          </p>
        </div>

        {/* First & Last Name */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground" htmlFor="setup-first-name">
              Ad
            </label>
            <input
              id="setup-first-name"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Adınız"
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground" htmlFor="setup-last-name">
              Soyad
            </label>
            <input
              id="setup-last-name"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Soyadınız"
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
            />
          </div>
        </div>

        {/* Error message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-2 px-4 py-3 rounded-xl text-xs font-semibold"
            style={{
              background: 'color-mix(in oklch, var(--destructive) 12%, transparent)',
              color: 'var(--destructive)',
              border: '1px solid color-mix(in oklch, var(--destructive) 25%, transparent)',
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
          className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-75 cursor-pointer mt-2"
          style={{
            background: 'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))'
          }}
        >
          {isPending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <>
              <Check size={16} />
              Kurulumu Tamamla
            </>
          )}
        </motion.button>
      </form>
    </div>
  )
}
