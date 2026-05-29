'use client'

import { useEffect, useState, useTransition } from 'react'
import { motion } from 'framer-motion'
import { Shield, Zap, ToggleLeft, ToggleRight, Loader2, Save, CheckCircle2, AlertCircle } from 'lucide-react'
import { updateSystemSetting, getSystemSettings } from '@/lib/actions/hq-admin'
import { useSystemSettingsStore } from '@/lib/store/useSystemSettingsStore'

export function HQSystemSettings() {
  const { settings, setSettings, setSetting } = useSystemSettingsStore()
  const [isPending, startTransition] = useTransition()
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    async function loadSettings() {
      try {
        const data = await getSystemSettings()
        setSettings({
          maintenance_mode: !!data.maintenance_mode,
          auto_verification: !!data.auto_verification,
          double_xp_active: !!data.double_xp_active,
          registration_open: data.registration_open !== false, // default true
          slow_mode_active: !!data.slow_mode_active,
          community_approval_required: !!data.community_approval_required,
          lockdown_mode: !!data.lockdown_mode,
          media_upload_lock: !!data.media_upload_lock,
        })
      } catch (err) {
        console.error('Failed to load settings:', err)
      } finally {
        setLoading(false)
      }
    }
    loadSettings()
  }, [setSettings])

  const handleToggle = (key: keyof typeof settings) => {
    const newValue = !settings[key]

    // Optimistic update
    setSetting(key, newValue)

    startTransition(async () => {
      setFeedback(null)
      const res = await updateSystemSetting(key, newValue)
      if (res?.error) {
        // Revert on error
        setSetting(key, !newValue)
        setFeedback({ type: 'error', message: `Ayar güncellenemedi: ${res.error}` })
      } else {
        setFeedback({ type: 'success', message: 'Sistem ayarı başarıyla güncellendi.' })
        setTimeout(() => setFeedback(null), 3000)
      }
    })
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-xs text-muted-foreground">Sistem ayarları yükleniyor...</p>
      </div>
    )
  }

  const settingItems = [
    {
      key: 'lockdown_mode' as const,
      label: '🚨 Acil Durum Modu (Lockdown)',
      description: 'Tüm platformu anlık olarak salt okunur (read-only) moduna alır. Yeni gönderi, yorum, DM gönderilemez ve profiller değiştirilemez.',
      icon: Shield,
      color: 'text-red-500 bg-red-500/10 border-red-500/20',
      activeColor: 'bg-red-600',
    },
    {
      key: 'media_upload_lock' as const,
      label: '📁 Medya Yükleme Kilidi',
      description: 'Platform genelinde her türlü görsel, video veya dosya yüklenmesini devre dışı bırakır. Metin paylaşımları açıktır.',
      icon: Shield,
      color: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
      activeColor: 'bg-orange-500',
    },
    {
      key: 'maintenance_mode' as const,
      label: 'Bakım Modu',
      description: 'Platformu genel erişime kapatır. Sadece kurucu ve yöneticiler giriş yapabilir.',
      icon: Shield,
      color: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
      activeColor: 'bg-rose-500',
    },
    {
      key: 'registration_open' as const,
      label: 'Yeni Kayıtlar',
      description: 'Yeni kullanıcıların platforma kayıt olmasına izin verir.',
      icon: CheckCircle2,
      color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
      activeColor: 'bg-emerald-500',
    },
    {
      key: 'double_xp_active' as const,
      label: '2X XP Haftası',
      description: 'Tüm etkileşimlerden (gönderi, yorum, beğeni vb.) kazanılan XP miktarını ikiye katlar.',
      icon: Zap,
      color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
      activeColor: 'bg-amber-500',
    },
    {
      key: 'slow_mode_active' as const,
      label: 'Platform Geneli Yavaş Mod',
      description: 'Kullanıcıların peş peşe gönderi/yorum paylaşmasını engellemek için gönderiler arasına 15 saniyelik bekleme koyar.',
      icon: Shield,
      color: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
      activeColor: 'bg-rose-500',
    },
    {
      key: 'community_approval_required' as const,
      label: 'Ücretsiz Topluluk Sınırı (Onay)',
      description: 'Sıradan kullanıcıların durmadan boş sunucu açmasını engeller. Kurulumları kurucu onayına bağlar.',
      icon: Zap,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      activeColor: 'bg-amber-500',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Feedback Alert */}
      {feedback && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={`flex items-center gap-2 p-4 rounded-xl border text-xs font-semibold ${feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-500'
            }`}
        >
          {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{feedback.message}</span>
        </motion.div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {settingItems.map((item) => {
          const Icon = item.icon
          const isActive = settings[item.key]

          return (
            <motion.div
              key={item.key}
              whileHover={{ y: -2 }}
              className="p-5 rounded-2xl border border-border bg-card/40 backdrop-blur-md flex flex-col justify-between gap-4 transition-all"
            >
              <div className="flex gap-4 items-start">
                <div className={`p-3 rounded-xl border ${item.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">{item.label}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-1">{item.description}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  DURUM: {isActive ? 'AKTİF' : 'PASİF'}
                </span>

                <button
                  onClick={() => handleToggle(item.key)}
                  disabled={isPending}
                  className="relative focus:outline-none cursor-pointer disabled:opacity-50"
                >
                  <div
                    className={`w-11 h-6 rounded-full transition-colors duration-300 ${isActive ? item.activeColor : 'bg-muted border border-border'
                      }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300 absolute top-1 left-1 ${isActive ? 'translate-x-5' : 'translate-x-0'
                        }`}
                    />
                  </div>
                </button>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Database sync status */}
      <div className="p-4 rounded-xl border border-border/50 bg-muted/20 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Supabase Realtime Sync aktif. Değişiklikler anında sunucuya yansıtılır.</span>
        </div>
        {isPending && (
          <div className="flex items-center gap-1.5 text-xs text-primary font-semibold">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Kaydediliyor...</span>
          </div>
        )}
      </div>
    </div>
  )
}
