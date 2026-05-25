'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react'
import { signIn } from '@/lib/actions/auth'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
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

      <form onSubmit={handleSubmit} className="space-y-4">
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
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={loading || !!oauthLoading}
          onClick={() => handleOAuthLogin('google')}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold border border-border bg-card text-foreground hover:bg-accent/60 transition-all disabled:opacity-50 cursor-pointer"
        >
          {oauthLoading === 'google' ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <span className="mr-1">🌐</span>
          )}
          Google
        </button>
        <button
          type="button"
          disabled={loading || !!oauthLoading}
          onClick={() => handleOAuthLogin('apple')}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold border border-border bg-card text-foreground hover:bg-accent/60 transition-all disabled:opacity-50 cursor-pointer"
        >
          {oauthLoading === 'apple' ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <span className="mr-1">🍎</span>
          )}
          Apple
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
