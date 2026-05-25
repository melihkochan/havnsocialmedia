'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return

    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    })

    setLoading(false)
    if (resetError) {
      setError(resetError.message)
    } else {
      setSuccess(true)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="mb-8">
        <Link
          href="/login"
          className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft size={14} /> Giriş Sayfasına Dön
        </Link>
        <h1 className="text-3xl font-black text-foreground mb-2">Şifremi Unuttum</h1>
        <p className="text-muted-foreground">
          E-posta adresini girerek şifreni sıfırlamak için güvenli bir bağlantı al.
        </p>
      </div>

      {success ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-green-500/10 border border-green-500/20 text-green-500 rounded-2xl p-5 text-center flex flex-col items-center gap-3"
        >
          <CheckCircle2 size={36} className="text-green-500" />
          <div>
            <h3 className="font-bold text-sm text-foreground">Sıfırlama Bağlantısı Gönderildi</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              E-posta kutunu (ve spam klasörünü) kontrol et. Şifreni güncellemek için bağlantıya tıklayabilirsin.
            </p>
          </div>
        </motion.div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="email">
              E-posta Adresi
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="sen@ornek.com"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
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
            disabled={loading || !email}
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
              'Sıfırlama Bağlantısı Gönder'
            )}
          </motion.button>
        </form>
      )}
    </motion.div>
  )
}
