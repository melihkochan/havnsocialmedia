'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { User, Lock, Eye, EyeOff, ArrowRight, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { signIn } from '@/lib/actions/auth'
import { createClient } from '@/lib/supabase/client'

// Animated placeholder hook
function useTypingPlaceholder(phrases: string[], speed = 60, pause = 1800) {
  const [placeholder, setPlaceholder] = useState('')
  const [focused, setFocused] = useState(false)
  const phraseIdx = useRef(0)
  const charIdx = useRef(0)
  const deleting = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (focused) return
    function tick() {
      const phrase = phrases[phraseIdx.current]
      if (!deleting.current) {
        if (charIdx.current < phrase.length) {
          setPlaceholder(phrase.slice(0, ++charIdx.current))
          timer.current = setTimeout(tick, speed)
        } else {
          deleting.current = true
          timer.current = setTimeout(tick, pause)
        }
      } else {
        if (charIdx.current > 0) {
          setPlaceholder(phrase.slice(0, --charIdx.current))
          timer.current = setTimeout(tick, speed / 2)
        } else {
          deleting.current = false
          phraseIdx.current = (phraseIdx.current + 1) % phrases.length
          timer.current = setTimeout(tick, 300)
        }
      }
    }
    timer.current = setTimeout(tick, speed)
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [focused, phrases, speed, pause])

  return { placeholder, setFocused }
}

export default function LoginPage() {
  const searchParams = useSearchParams()
  const reason = searchParams?.get('reason')
  const errorParam = searchParams?.get('error')

  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(errorParam || null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<string | null>(null)
  const [identifierFocused, setIdentifierFocused] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)
  const [identifierValue, setIdentifierValue] = useState('')
  const [passwordValue, setPasswordValue] = useState('')

  const { placeholder: identifierPlaceholder, setFocused: setTypingFocused } = useTypingPlaceholder(
    ['sen@ornek.com', 'kullanici_adin', 'havn_kullanicisi'],
    65,
    2000
  )

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const result = await signIn(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  async function handleOAuthLogin(provider: 'google' | 'apple') {
    setError(null)
    setOauthLoading(provider)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) {
      setError(error.message)
      setOauthLoading(null)
    }
  }

  const inputBase =
    'w-full py-3.5 rounded-2xl border text-foreground text-sm outline-none transition-all duration-200 bg-card/50 backdrop-blur-sm placeholder:text-muted-foreground/50'

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Header */}
      <div className="mb-7">
        <motion.h1
          className="text-[2rem] font-black text-foreground tracking-tight leading-none mb-2"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.4 }}
        >
          Tekrar Hoşgeldin
        </motion.h1>
        <motion.p
          className="text-muted-foreground text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.12 }}
        >
          Hesabına giriş yap ve topluluğuna katıl.
        </motion.p>
      </div>

      {/* Multi-session warning */}
      <AnimatePresence>
        {reason === 'multi_session' && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: 20 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="p-4 rounded-2xl text-xs font-semibold flex items-start gap-3 border overflow-hidden"
            style={{
              background: 'color-mix(in oklch, var(--primary) 8%, var(--card))',
              color: 'var(--primary)',
              borderColor: 'color-mix(in oklch, var(--primary) 20%, var(--border))',
            }}
          >
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0 animate-pulse" />
            <div>
              <p className="font-extrabold uppercase tracking-wider text-[10px] mb-0.5">Oturum Sonlandırıldı</p>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Başka bir cihazdan giriş yapıldığı için bu oturumunuz kapatıldı.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Identifier */}
        <motion.div
          className="space-y-1.5"
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
        >
          <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest block" htmlFor="identifier">
            E-posta veya Kullanıcı Adı
          </label>
          <div className="relative group">
            {/* Animated focus ring */}
            <div
              className="absolute inset-0 rounded-2xl transition-opacity duration-300 pointer-events-none"
              style={{
                opacity: identifierFocused ? 1 : 0,
                boxShadow: '0 0 0 3px color-mix(in oklch, var(--primary) 18%, transparent)',
              }}
            />
            <User
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200 pointer-events-none z-10"
              style={{ color: identifierFocused ? 'var(--primary)' : 'var(--muted-foreground)' }}
            />
            <input
              id="identifier"
              name="identifier"
              type="text"
              required
              autoComplete="username"
              value={identifierValue}
              onChange={e => setIdentifierValue(e.target.value)}
              placeholder={identifierFocused ? '' : identifierPlaceholder + '|'}
              onFocus={() => { setIdentifierFocused(true); setTypingFocused(true) }}
              onBlur={() => { setIdentifierFocused(false); setTypingFocused(false) }}
              className={`${inputBase} pl-11 pr-4 border-border focus:border-primary`}
              style={{
                borderColor: identifierFocused
                  ? 'var(--primary)'
                  : 'var(--border)',
              }}
            />
          </div>
        </motion.div>

        {/* Password */}
        <motion.div
          className="space-y-1.5"
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest" htmlFor="password">
              Şifre
            </label>
            <Link
              href="/forgot-password"
              className="text-[11px] font-bold text-primary hover:underline transition-colors"
            >
              Şifremi Unuttum
            </Link>
          </div>
          <div className="relative group">
            <div
              className="absolute inset-0 rounded-2xl transition-opacity duration-300 pointer-events-none"
              style={{
                opacity: passwordFocused ? 1 : 0,
                boxShadow: '0 0 0 3px color-mix(in oklch, var(--primary) 18%, transparent)',
              }}
            />
            <Lock
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200 pointer-events-none z-10"
              style={{ color: passwordFocused ? 'var(--primary)' : 'var(--muted-foreground)' }}
            />
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              value={passwordValue}
              onChange={e => setPasswordValue(e.target.value)}
              placeholder="••••••••••"
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
              className={`${inputBase} pl-11 pr-12`}
              style={{
                borderColor: passwordFocused ? 'var(--primary)' : 'var(--border)',
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(s => !s)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors z-10"
              tabIndex={-1}
            >
              <AnimatePresence mode="wait">
                {showPassword ? (
                  <motion.span key="off" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }} transition={{ duration: 0.15 }}>
                    <EyeOff size={16} />
                  </motion.span>
                ) : (
                  <motion.span key="on" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }} transition={{ duration: 0.15 }}>
                    <Eye size={16} />
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>
        </motion.div>

        {/* Error / Success feedback */}
        <AnimatePresence>
          {error && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.2 }}
              className="p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-3 border"
              style={{
                background: 'color-mix(in oklch, var(--destructive) 8%, var(--card))',
                color: 'var(--destructive)',
                borderColor: 'color-mix(in oklch, var(--destructive) 20%, var(--border))',
              }}
            >
              <AlertCircle size={15} className="flex-shrink-0" />
              <span className="leading-relaxed">{error}</span>
            </motion.div>
          )}
          {success && (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6 }}
              className="p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-3 border"
              style={{
                background: 'color-mix(in oklch, var(--success, #22c55e) 8%, var(--card))',
                color: 'var(--success, #22c55e)',
                borderColor: 'color-mix(in oklch, var(--success, #22c55e) 20%, var(--border))',
              }}
            >
              <CheckCircle2 size={15} className="flex-shrink-0" />
              <span>{success}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <motion.button
            type="submit"
            disabled={loading || !!oauthLoading}
            whileHover={{ scale: loading ? 1 : 1.015 }}
            whileTap={{ scale: loading ? 1 : 0.985 }}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl text-sm font-extrabold transition-all duration-200 disabled:opacity-70 cursor-pointer relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))',
              color: 'white',
              boxShadow: '0 4px 20px color-mix(in oklch, var(--havn-gradient-start) 35%, transparent)',
            }}
          >
            {/* Shimmer on hover */}
            <span
              className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none"
              style={{
                background:
                  'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.12) 50%, transparent 60%)',
                backgroundSize: '200% 100%',
              }}
            />
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.span
                  key="loader"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center gap-2"
                >
                  <Loader2 size={17} className="animate-spin" />
                  <span>Giriş yapılıyor…</span>
                </motion.span>
              ) : (
                <motion.span
                  key="label"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex items-center gap-2"
                >
                  Giriş Yap
                  <ArrowRight size={16} />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </motion.div>
      </form>

      {/* Divider */}
      <div className="relative my-7 flex items-center">
        <div className="flex-1 border-t border-border/60" />
        <span className="mx-4 text-[10px] font-black text-muted-foreground/50 uppercase tracking-widest">
          Veya
        </span>
        <div className="flex-1 border-t border-border/60" />
      </div>

      {/* OAuth Buttons */}
      <div className="grid grid-cols-2 gap-3">
        {/* Google */}
        <motion.button
          type="button"
          disabled={loading || !!oauthLoading}
          onClick={() => handleOAuthLogin('google')}
          whileHover={{ scale: 1.02, y: -1 }}
          whileTap={{ scale: 0.97 }}
          className="flex items-center justify-center gap-2.5 py-3 px-4 rounded-2xl text-xs font-bold border border-border/70 bg-card hover:bg-accent/30 transition-all disabled:opacity-50 cursor-pointer relative overflow-hidden"
          style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}
        >
          <AnimatePresence mode="wait">
            {oauthLoading === 'google' ? (
              <motion.span key="load" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Loader2 size={16} className="animate-spin text-muted-foreground" />
              </motion.span>
            ) : (
              <motion.span key="icon" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                </svg>
                Google
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>

        {/* Apple */}
        <motion.button
          type="button"
          disabled={loading || !!oauthLoading}
          onClick={() => handleOAuthLogin('apple')}
          whileHover={{ scale: 1.02, y: -1 }}
          whileTap={{ scale: 0.97 }}
          className="flex items-center justify-center gap-2.5 py-3 px-4 rounded-2xl text-xs font-bold border border-border/70 bg-card hover:bg-accent/30 transition-all disabled:opacity-50 cursor-pointer relative overflow-hidden"
          style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}
        >
          <AnimatePresence mode="wait">
            {oauthLoading === 'apple' ? (
              <motion.span key="load" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Loader2 size={16} className="animate-spin text-muted-foreground" />
              </motion.span>
            ) : (
              <motion.span key="icon" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0 text-foreground">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.21.67-2.93 1.49-.62.69-1.16 1.84-1.01 2.96 1.12.09 2.27-.58 2.95-1.39z" />
                </svg>
                Apple
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      <p className="text-center text-sm text-muted-foreground mt-8">
        Hesabın yok mu?{' '}
        <Link href="/register" className="font-bold text-primary hover:underline transition-colors">
          Kayıt Ol
        </Link>
      </p>
    </motion.div>
  )
}
