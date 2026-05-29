'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Lock, Eye, EyeOff, Loader2, AlertCircle, ArrowRight, ShieldAlert } from 'lucide-react'
import { verifyHQSudo } from '@/lib/actions/hq-auth'

export default function HQGateClient() {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!password.trim()) {
      setError('Lütfen şifrenizi girin.')
      return
    }

    startTransition(async () => {
      const res = await verifyHQSudo(password)
      if (res?.error) {
        setError(res.error)
      } else {
        // Redirect to overview page on success
        router.replace('/havn-hq-control/overview')
        router.refresh()
      }
    })
  }

  return (
    <div className="min-h-screen bg-[#080810] flex items-center justify-center p-4">
      {/* Background gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/3 w-[300px] h-[300px] rounded-full bg-violet-600/5 blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md p-8 rounded-3xl border border-white/10 bg-slate-950/60 backdrop-blur-xl relative z-10 space-y-6 shadow-2xl"
      >
        {/* Header */}
        <div className="text-center space-y-2 select-none">
          <div className="inline-flex items-center justify-center p-4 rounded-2xl bg-primary/10 text-primary mb-2 border border-primary/20 shadow-lg shadow-primary/5">
            <ShieldAlert size={28} className="animate-pulse" />
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">Güvenlik Geçidi</h2>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
            Kontrol merkezine erişmek üzeresiniz. Lütfen hesabınızın yetkili şifresini girin.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleVerify} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5" htmlFor="gate-password">
              <Lock size={12} />
              Yönetici Şifresi
            </label>
            <div className="relative">
              <input
                id="gate-password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Şifrenizi girin"
                className="w-full px-4 py-3 rounded-xl border border-white/10 bg-slate-900/50 text-white text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/40"
              />
              <button
                type="button"
                onClick={() => setShowPassword(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-start gap-2 p-3 rounded-xl text-xs font-semibold border bg-rose-500/10 border-rose-500/20 text-rose-500"
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
            className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-75 cursor-pointer mt-2 shadow-md shadow-primary/10"
            style={{
              background: 'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))'
            }}
          >
            {isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>
                <span>Doğrula ve Giriş Yap</span>
                <ArrowRight size={14} />
              </>
            )}
          </motion.button>
        </form>
      </motion.div>
    </div>
  )
}
