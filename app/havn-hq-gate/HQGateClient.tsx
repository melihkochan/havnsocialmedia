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
    <div className="min-h-screen bg-[#06060c] flex items-center justify-center p-4 relative overflow-hidden font-mono select-none text-slate-300">
      {/* Cyber Grid Background */}
      <div 
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(124, 58, 237, 0.15) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(124, 58, 237, 0.15) 1px, transparent 1px)
          `,
          backgroundSize: '30px 30px',
        }}
      />

      {/* Cyber Telemetry & Radar Scan Background */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-0">
        {/* Glow circles */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-primary/5 blur-[120px] animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-violet-500/5 blur-[80px]" />

        {/* Large SVG Radar */}
        <svg className="w-[600px] h-[600px] opacity-25 md:opacity-40 animate-pulse" viewBox="0 0 200 200">
          {/* Concentric Radar Rings */}
          <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(124, 58, 237, 0.2)" strokeWidth="0.5" strokeDasharray="3 3" />
          <circle cx="100" cy="100" r="70" fill="none" stroke="rgba(124, 58, 237, 0.25)" strokeWidth="0.5" />
          <circle cx="100" cy="100" r="50" fill="none" stroke="rgba(124, 58, 237, 0.3)" strokeWidth="0.5" strokeDasharray="1 2" />
          <circle cx="100" cy="100" r="30" fill="none" stroke="rgba(124, 58, 237, 0.35)" strokeWidth="0.5" />
          <circle cx="100" cy="100" r="10" fill="none" stroke="rgba(124, 58, 237, 0.4)" strokeWidth="0.5" />

          {/* Crosshairs */}
          <line x1="10" y1="100" x2="190" y2="100" stroke="rgba(124, 58, 237, 0.15)" strokeWidth="0.5" />
          <line x1="100" y1="10" x2="100" y2="190" stroke="rgba(124, 58, 237, 0.15)" strokeWidth="0.5" />
          
          {/* Angle grids */}
          <line x1="36.36" y1="36.36" x2="163.64" y2="163.64" stroke="rgba(124, 58, 237, 0.08)" strokeWidth="0.5" strokeDasharray="2 2" />
          <line x1="163.64" y1="36.36" x2="36.36" y2="163.64" stroke="rgba(124, 58, 237, 0.08)" strokeWidth="0.5" strokeDasharray="2 2" />

          {/* Glowing Target Points (Simulated threats) */}
          <circle cx="65" cy="55" r="1.5" fill="#10b981" className="animate-ping" style={{ animationDuration: '3s' }} />
          <circle cx="65" cy="55" r="1" fill="#10b981" />

          <circle cx="145" cy="120" r="1.5" fill="#10b981" className="animate-ping" style={{ animationDuration: '4s' }} />
          <circle cx="145" cy="120" r="1" fill="#10b981" />

          {/* Sweep Line */}
          <g className="origin-[100px_100px] animate-[spin_6s_linear_infinite]">
            <line x1="100" y1="100" x2="100" y2="10" stroke="url(#radarSweepGrad)" strokeWidth="1.5" />
          </g>

          <defs>
            <linearGradient id="radarSweepGrad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="transparent" />
              <stop offset="70%" stopColor="rgba(139, 92, 246, 0.15)" />
              <stop offset="100%" stopColor="rgba(139, 92, 246, 0.8)" />
            </linearGradient>
          </defs>
        </svg>

        {/* Telemetry labels */}
        <div className="absolute left-6 top-6 hidden lg:flex flex-col gap-1 text-[9px] font-mono text-slate-500">
          <p className="text-violet-400 font-bold">SYSTEM TELEMETRY</p>
          <p>PING LATENCY: 24ms</p>
          <p>HOST RESOLUTION: DUAL-STACK</p>
          <p>NODE FREQUENCY: 5.2GHZ</p>
          <p>STATUS: ACTIVE SCANNING...</p>
        </div>

        <div className="absolute right-6 bottom-6 hidden lg:flex flex-col gap-1 text-[9px] font-mono text-slate-500 text-right">
          <p className="text-emerald-400 font-bold">SECURITY ENVELOPE</p>
          <p>SSL PROTOCOL: TLSv1.3</p>
          <p>RLS RULES: FORCED ACTIVE</p>
          <p>THREAT LEVEL: SAFE (0 DETECTED)</p>
          <p>SESSION ID: HQ_SECURE_GATE</p>
        </div>
      </div>

      {/* Main Glassmorphism Form Card */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md p-8 rounded-[28px] border border-white/[0.07] bg-[#0c0c16]/55 backdrop-blur-2xl relative z-10 space-y-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
        style={{
          boxShadow: '0 0 40px rgba(124, 58, 237, 0.05), inset 0 1px 1px rgba(255,255,255,0.05)'
        }}
      >
        {/* Glowing top line */}
        <div className="absolute top-0 left-10 right-10 h-px bg-gradient-to-right from-transparent via-violet-500/50 to-transparent" />

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3.5 rounded-2xl bg-violet-600/10 text-violet-400 mb-2 border border-violet-500/20 shadow-lg shadow-violet-500/5 relative overflow-hidden group">
            {/* Animated scanning glow */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-violet-500/20 to-transparent w-full h-1/2 -top-1/2 group-hover:top-full transition-all duration-1000 ease-in-out" />
            <ShieldAlert size={28} className="relative z-10 animate-[pulse_2s_infinite]" />
          </div>
          <h2 className="text-lg font-black text-white tracking-widest uppercase">HAVN HQ GATEWAY</h2>
          <p className="text-[10px] text-slate-400 max-w-xs mx-auto leading-relaxed uppercase tracking-wider font-semibold">
            Güvenlik Geçidi • Yetkilendirme Kontrolü
          </p>
        </div>

        {/* Info panel */}
        <div className="bg-[#090912]/60 border border-white/[0.04] rounded-xl px-4 py-2.5 flex items-center justify-between text-[8px] font-mono select-none">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-emerald-400 font-bold">SECURE CHANNEL</span>
          </div>
          <span className="text-slate-500">SYS_AUTH_LEVEL_0</span>
        </div>

        {/* Form */}
        <form onSubmit={handleVerify} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5" htmlFor="gate-password">
              <Lock size={10} className="text-violet-400" />
              Yönetici Sudo Şifresi
            </label>
            <div className="relative">
              <input
                id="gate-password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Geçiş şifresini girin"
                className="w-full px-4 py-3 rounded-xl border border-white/5 bg-[#090914]/80 text-white text-xs outline-none focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/10 transition-all placeholder:text-slate-700 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(s => !s)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-start gap-2 p-3 rounded-xl text-[10px] font-bold border bg-rose-500/5 border-rose-500/15 text-rose-400"
            >
              <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          {/* Submit */}
          <motion.button
            type="submit"
            disabled={isPending}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl text-[10px] font-black tracking-widest uppercase text-white transition-all disabled:opacity-75 cursor-pointer mt-2 shadow-lg shadow-violet-500/5 border border-violet-500/20"
            style={{
              background: 'linear-gradient(135deg, #7c3aed, #4f46e5)'
            }}
          >
            {isPending ? (
              <Loader2 size={13} className="animate-spin text-white" />
            ) : (
              <>
                <span>Doğrula ve Geçiş Yap</span>
                <ArrowRight size={12} />
              </>
            )}
          </motion.button>
        </form>
      </motion.div>
    </div>
  )
}
