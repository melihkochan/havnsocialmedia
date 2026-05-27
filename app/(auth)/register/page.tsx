'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, Loader2, Check } from 'lucide-react'
import { signUp } from '@/lib/actions/auth'
import { AvatarUpload } from '@/components/havn/AvatarUpload'

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [password, setPassword] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [usernameInput, setUsernameInput] = useState('')

  const strength = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ]
  const strengthCount = strength.filter(Boolean).length

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    if (avatarFile) formData.set('avatar', avatarFile)
    const result = await signUp(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="mb-8">
        <h1 className="text-3xl font-black text-foreground mb-2">Topluluğa Katıl</h1>
        <p className="text-muted-foreground">HAVN'da hesabını oluştur, limanını bul.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Avatar Picker */}
        <div className="flex flex-col items-center justify-center pb-2">
          <AvatarUpload
            currentAvatarUrl={null}
            username={usernameInput || 'HV'}
            onFileSelect={setAvatarFile}
          />
        </div>

        {/* Ad & Soyad */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="first_name">Ad</label>
            <input
              id="first_name"
              name="first_name"
              type="text"
              required
              maxLength={50}
              placeholder="Adınız"
              className="w-full px-4 py-3 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="last_name">Soyad</label>
            <input
              id="last_name"
              name="last_name"
              type="text"
              required
              maxLength={50}
              placeholder="Soyadınız"
              className="w-full px-4 py-3 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
        </div>

        {/* Username */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground" htmlFor="username">
            Kullanıcı Adı
          </label>
          <p className="text-xs text-muted-foreground -mt-0.5">Profilinde @ ile görünen benzersiz takma ad.</p>
          <div className="relative">
            <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              id="username"
              name="username"
              type="text"
              required
              minLength={3}
              maxLength={30}
              pattern="[a-zA-Z0-9_]+"
              placeholder="kullanici_adi"
              value={usernameInput}
              onChange={e => setUsernameInput(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          <p className="text-xs text-muted-foreground">Yalnızca harf, rakam ve alt çizgi</p>
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground" htmlFor="email">
            E-posta
          </label>
          <div className="relative">
            <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="sen@ornek.com"
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground" htmlFor="reg-password">
            Şifre
          </label>
          <div className="relative">
            <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              id="reg-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              required
              minLength={8}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-10 pr-12 py-3 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(s => !s)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {/* Strength bar */}
          {password && (
            <div className="space-y-2">
              <div className="flex gap-1">
                {[0,1,2,3].map(i => (
                  <div
                    key={i}
                    className="h-1 flex-1 rounded-full transition-all duration-300"
                    style={{
                      background: i < strengthCount
                        ? strengthCount <= 1 ? 'var(--destructive)'
                          : strengthCount <= 2 ? 'var(--owner-color)'
                          : 'var(--mod-color)'
                        : 'var(--border)',
                    }}
                  />
                ))}
              </div>
              <div className="grid grid-cols-2 gap-1">
                {[
                  [strength[0], '8+ karakter'],
                  [strength[1], 'Büyük harf'],
                  [strength[2], 'Rakam'],
                  [strength[3], 'Özel karakter'],
                ].map(([ok, label]) => (
                  <div key={label as string} className="flex items-center gap-1.5 text-xs">
                    <Check size={11} className={ok ? 'text-emerald-500' : 'text-muted-foreground'} />
                    <span className={ok ? 'text-foreground' : 'text-muted-foreground'}>{label as string}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-4 py-3 rounded-xl text-sm font-medium"
            style={{
              background: 'color-mix(in oklch, var(--destructive) 12%, transparent)',
              color: 'var(--destructive)',
              border: '1px solid color-mix(in oklch, var(--destructive) 25%, transparent)',
            }}
          >
            {error}
          </motion.div>
        )}

        <motion.button
          type="submit"
          disabled={loading}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl text-sm font-bold transition-all disabled:opacity-70"
          style={{
            background: 'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))',
            color: 'var(--primary-foreground)',
          }}
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <><ArrowRight size={16} />Hesap Oluştur</>}
        </motion.button>
      </form>

      <p className="text-center text-sm text-muted-foreground mt-6">
        Zaten hesabın var mı?{' '}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Giriş Yap
        </Link>
      </p>
    </motion.div>
  )
}
