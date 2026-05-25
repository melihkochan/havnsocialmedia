'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Lock, Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function UpdatePasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!password) return

    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({
      password: password,
    })

    setLoading(false)
    if (updateError) {
      setError(updateError.message)
    } else {
      setSuccess(true)
      setTimeout(() => {
        router.push('/feed')
      }, 2000)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md bg-card border border-border rounded-3xl p-8 shadow-xl"
      >
        <div className="mb-6">
          <h1 className="text-2xl font-black text-foreground mb-2">Yeni Şifre Belirle</h1>
          <p className="text-sm text-muted-foreground">
            Lütfen hesabın için güvenli ve yeni bir şifre gir.
          </p>
        </div>

        {success ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-green-500/10 border border-green-500/20 text-green-500 rounded-2xl p-5 text-center flex flex-col items-center gap-3"
          >
            <CheckCircle2 size={36} className="text-green-500" />
            <div>
              <h3 className="font-bold text-sm text-foreground">Şifreniz Güncellendi</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Yönlendiriliyorsunuz, lütfen bekleyin...
              </p>
            </div>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="password">
                Yeni Şifre
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
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
              disabled={loading || !password}
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
                'Şifremi Güncelle'
              )}
            </motion.button>
          </form>
        )}
      </motion.div>
    </div>
  )
}
