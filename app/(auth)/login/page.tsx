'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { User, Lock, Eye, EyeOff, ArrowRight, Loader2, AlertCircle } from 'lucide-react'
import { signIn } from '@/lib/actions/auth'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const searchParams = useSearchParams()
  const reason = searchParams?.get('reason')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
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
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      setError(error.message)
      setOauthLoading(null)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <div className="mb-8">
        <h1 className="text-3xl font-black text-foreground mb-2 tracking-tight">Tekrar Hoşgeldin</h1>
        <p className="text-muted-foreground text-sm">Hesabına giriş yap ve topluluğuna katıl.</p>
      </div>

      {reason === 'multi_session' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-6 p-4 rounded-2xl text-xs font-semibold flex items-start gap-3 shadow-sm border"
          style={{
            background: 'color-mix(in oklch, var(--primary) 8%, var(--card))',
            color: 'var(--primary)',
            borderColor: 'color-mix(in oklch, var(--primary) 20%, var(--border))',
          }}
        >
          <AlertCircle size={18} className="mt-0.5 flex-shrink-0 text-primary animate-pulse" />
          <div>
            <p className="font-extrabold uppercase tracking-wider text-[10px] mb-0.5">OTURUM SONLANDIRILDI</p>
            <p className="text-muted-foreground leading-relaxed text-[11px]">Hesabınıza başka bir konumdan veya tarayıcıdan giriş yapıldığı için bu cihazdaki oturumunuz kapatıldı.</p>
          </div>
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Identifier */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block" htmlFor="identifier">
            E-posta veya Kullanıcı Adı
          </label>
          <div className="relative group">
            <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
            <input
              id="identifier"
              name="identifier"
              type="text"
              required
              autoComplete="username"
              placeholder="sen@ornek.com veya kullanıcıadı"
              className="w-full pl-11 pr-4 py-3 rounded-2xl border border-border bg-card/60 backdrop-blur-sm text-foreground placeholder:text-muted-foreground text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all duration-200"
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider" htmlFor="password">
              Şifre
            </label>
            <Link
              href="/forgot-password"
              className="text-xs font-bold text-primary hover:underline hover:text-primary-hover transition-colors"
            >
              Şifremi Unuttum
            </Link>
          </div>
          <div className="relative group">
            <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full pl-11 pr-12 py-3 rounded-2xl border border-border bg-card/60 backdrop-blur-sm text-foreground placeholder:text-muted-foreground text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all duration-200"
            />
            <button
              type="button"
              onClick={() => setShowPassword(s => !s)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="p-4 rounded-2xl text-xs font-semibold flex items-center gap-3 border shadow-sm"
            style={{
              background: 'color-mix(in oklch, var(--destructive) 8%, var(--card))',
              color: 'var(--destructive)',
              borderColor: 'color-mix(in oklch, var(--destructive) 20%, var(--border))',
            }}
          >
            <AlertCircle size={18} className="flex-shrink-0 text-destructive" />
            <span className="leading-relaxed text-[11px]">{error}</span>
          </motion.div>
        )}

        {/* Submit */}
        <motion.button
          type="submit"
          disabled={loading || !!oauthLoading}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-2xl text-sm font-extrabold transition-all duration-200 disabled:opacity-70 cursor-pointer shadow-md shadow-primary/10"
          style={{
            background: 'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))',
            color: 'var(--primary-foreground)',
          }}
        >
          {loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <>
              Giriş Yap
              <ArrowRight size={16} />
            </>
          )}
        </motion.button>
      </form>

      {/* Divider */}
      <div className="relative my-8 flex items-center justify-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border/80" />
        </div>
        <span className="relative px-4 bg-background text-[10px] font-black text-muted-foreground uppercase tracking-widest">
          Veya
        </span>
      </div>

      {/* OAuth Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={loading || !!oauthLoading}
          onClick={() => handleOAuthLogin('google')}
          className="flex items-center justify-center gap-2.5 py-3 px-4 rounded-2xl text-xs font-bold border border-border/80 bg-card hover:bg-accent/40 active:scale-95 transition-all disabled:opacity-50 cursor-pointer shadow-sm relative overflow-hidden"
        >
          {oauthLoading === 'google' ? (
            <Loader2 size={16} className="animate-spin text-muted-foreground" />
          ) : (
            <svg viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
            </svg>
          )}
          Google
        </button>
        <button
          type="button"
          disabled={loading || !!oauthLoading}
          onClick={() => handleOAuthLogin('apple')}
          className="flex items-center justify-center gap-2.5 py-3 px-4 rounded-2xl text-xs font-bold border border-border/80 bg-card hover:bg-accent/40 active:scale-95 transition-all disabled:opacity-50 cursor-pointer shadow-sm relative overflow-hidden"
        >
          {oauthLoading === 'apple' ? (
            <Loader2 size={16} className="animate-spin text-muted-foreground" />
          ) : (
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0 text-foreground">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.21.67-2.93 1.49-.62.69-1.16 1.84-1.01 2.96 1.12.09 2.27-.58 2.95-1.39z" />
            </svg>
          )}
          Apple
        </button>
      </div>

      <p className="text-center text-sm text-muted-foreground mt-8">
        Hesabın yok mu?{' '}
        <Link href="/register" className="font-bold text-primary hover:underline hover:text-primary-hover transition-colors">
          Kayıt Ol
        </Link>
      </p>
    </motion.div>
  )
}
