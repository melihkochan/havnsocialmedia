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
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="mb-8">
        <h1 className="text-3xl font-black text-foreground mb-2">Tekrar Hoşgeldin</h1>
        <p className="text-muted-foreground">Hesabına giriş yap ve topluluğuna katıl.</p>
      </div>

      {reason === 'multi_session' && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-xl text-xs font-semibold flex items-start gap-2.5"
          style={{
            background: 'color-mix(in oklch, var(--primary) 12%, transparent)',
            color: 'var(--primary)',
            border: '1px solid color-mix(in oklch, var(--primary) 25%, transparent)',
          }}
        >
          <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-black uppercase tracking-wider text-[9px] mb-0.5">OTURUM SONLANDIRILDI</p>
            <p className="text-muted-foreground leading-relaxed text-[11px]">Hesabınıza başka bir konumdan veya tarayıcıdan giriş yapıldığı için bu cihazdaki oturumunuz kapatıldı.</p>
          </div>
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Identifier */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground" htmlFor="identifier">
            E-posta veya Kullanıcı Adı
          </label>
          <div className="relative">
            <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              id="identifier"
              name="identifier"
              type="text"
              required
              autoComplete="username"
              placeholder="sen@ornek.com veya kullanıcıadı"
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-foreground" htmlFor="password">
              Şifre
            </label>
            <Link
              href="/forgot-password"
              className="text-xs font-semibold text-primary hover:underline"
            >
              Şifremi Unuttum
            </Link>
          </div>
          <div className="relative">
            <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full pl-10 pr-12 py-3 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(s => !s)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
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

        {/* Submit */}
        <motion.button
          type="submit"
          disabled={loading || !!oauthLoading}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl text-sm font-bold transition-all disabled:opacity-70 cursor-pointer"
          style={{
            background: 'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))',
            color: 'var(--primary-foreground)',
          }}
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <>
              Giriş Yap
              <ArrowRight size={16} />
            </>
          )}
        </motion.button>
      </form>

      {/* Divider */}
      <div className="relative my-6 flex items-center justify-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <span className="relative px-3 bg-background text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
          Veya
        </span>
      </div>

      {/* OAuth Buttons */}
      <div className="space-y-3">
        <button
          type="button"
          disabled={loading || !!oauthLoading}
          onClick={() => handleOAuthLogin('google')}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl text-sm font-semibold border border-border/80 bg-background text-foreground hover:bg-accent/50 active:bg-accent/80 transition-all disabled:opacity-50 cursor-pointer shadow-sm relative overflow-hidden"
        >
          {oauthLoading === 'google' ? (
            <Loader2 size={18} className="animate-spin text-muted-foreground" />
          ) : (
            <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
            </svg>
          )}
          Google ile Devam Et
        </button>
      </div>

      <p className="text-center text-sm text-muted-foreground mt-6">
        Hesabın yok mu?{' '}
        <Link href="/register" className="font-semibold text-primary hover:underline">
          Kayıt Ol
        </Link>
      </p>
    </motion.div>
  )
}
