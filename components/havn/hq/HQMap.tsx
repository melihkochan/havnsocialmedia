'use client'

import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'
import { Globe, Users, TrendingUp, MapPin } from 'lucide-react'

// Dynamically import Leaflet Map to avoid SSR errors/window is not defined
const HQLeafletMap = dynamic(() => import('./HQLeafletMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[380px] bg-slate-950 flex flex-col items-center justify-center gap-2 rounded-xl border border-white/5 animate-pulse">
      <Globe className="w-8 h-8 text-primary animate-spin" />
      <span className="text-xs text-muted-foreground">Etkileşim haritası yükleniyor...</span>
    </div>
  ),
})

interface CountryStat {
  country: string
  count: number
}

interface HQMapProps {
  stats: CountryStat[]
}

const COUNTRY_NAMES: Record<string, string> = {
  TR: 'Türkiye',
  US: 'Amerika Birleşik Devletleri',
  DE: 'Almanya',
  GB: 'Birleşik Krallık',
  FR: 'Fransa',
  NL: 'Hollanda',
  AZ: 'Azerbaycan',
  IT: 'İtalya',
  ES: 'İspanya',
  JP: 'Japonya',
  RU: 'Rusya',
  CN: 'Çin',
  IN: 'Hindistan',
  BR: 'Brezilya',
  AU: 'Avustralya',
  CA: 'Kanada',
}

export function HQMap({ stats }: HQMapProps) {
  const totalUsers = stats.reduce((acc, curr) => acc + curr.count, 0)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Visual Leaflet Map Container */}
      <div
        className="lg:col-span-2 rounded-2xl border border-border bg-card/40 backdrop-blur-md p-6 flex flex-col justify-between relative overflow-hidden min-h-[480px]"
      >
        {/* Header */}
        <div className="flex items-center justify-between z-10 pb-4">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-bold text-foreground">Etkileşim Haritası</h3>
          </div>
          <span className="text-[10px] font-bold text-muted-foreground uppercase bg-muted/30 px-2 py-0.5 rounded-md border border-border/50">
            {stats.length} Aktif Bölge
          </span>
        </div>

        {/* Real Leaflet Map */}
        <div className="flex-1 w-full h-[380px] rounded-xl overflow-hidden relative border border-border/60">
          {totalUsers > 0 ? (
            <HQLeafletMap stats={stats} totalUsers={totalUsers} />
          ) : (
            <div className="w-full h-full bg-slate-950 flex flex-col items-center justify-center gap-2">
              <Globe className="w-8 h-8 text-muted-foreground/30 animate-pulse" />
              <span className="text-xs text-muted-foreground">Aktif konum verisi bulunmuyor.</span>
            </div>
          )}
        </div>

        {/* Hint footer */}
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60 mt-4">
          <MapPin className="w-3.5 h-3.5" />
          <span>Üye konum bilgileri profil ayarlarına göre anonimleştirilerek haritalandırılmıştır.</span>
        </div>
      </div>

      {/* Country List & Leaderboard */}
      <div
        className="rounded-2xl border border-border bg-card/40 backdrop-blur-md p-6 flex flex-col justify-between"
      >
        <div className="space-y-4 flex-1">
          <div className="flex items-center justify-between pb-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-500" />
              <h3 className="text-xs font-bold text-foreground">Bölgesel Yoğunluk</h3>
            </div>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>

          <div className="space-y-4 overflow-y-auto max-h-[350px] pr-1">
            {stats.map((stat, idx) => {
              const percentage = totalUsers > 0 ? (stat.count / totalUsers) * 100 : 0
              const countryCode = stat.country.toUpperCase()
              const countryName = COUNTRY_NAMES[countryCode] || stat.country

              return (
                <div key={stat.country} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-black text-muted-foreground/60 w-4">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <span className="font-bold text-foreground/80">{countryName}</span>
                      <span className="text-[9px] uppercase font-black text-muted-foreground/50">
                        ({stat.country})
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-foreground">{stat.count}</span>
                      <span className="text-[10px] text-muted-foreground ml-1">
                        ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-1.5 w-full bg-muted/30 rounded-full overflow-hidden border border-border/20">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className="h-full rounded-full bg-primary"
                    />
                  </div>
                </div>
              )
            })}

            {stats.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center space-y-2">
                <Globe className="w-6 h-6 text-muted-foreground/35" />
                <p className="text-xs text-muted-foreground font-semibold">Konum verisi bulunamadı</p>
                <p className="text-[10px] text-muted-foreground/50 max-w-xs">
                  Henüz konumunu profilinde belirten kayıtlı kullanıcı bulunmuyor.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Small box for summary */}
        <div className="mt-4 p-3 rounded-xl bg-muted/20 border border-border/50 text-[10px] leading-relaxed text-muted-foreground/80 flex items-center justify-between">
          <span>Toplam Konumlu Üye:</span>
          <span className="font-black text-foreground">{totalUsers}</span>
        </div>
      </div>
    </div>
  )
}
