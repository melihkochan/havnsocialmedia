'use client'

import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'
import { Globe, Users, TrendingUp, MapPin } from 'lucide-react'

// Dynamically import DeckGL Map to avoid SSR errors/window is not defined
const HQDeckGLMap = dynamic(() => import('./HQDeckGLMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[380px] bg-[#07070f] flex flex-col items-center justify-center gap-2 rounded-xl border border-white/5 animate-pulse">
      <Globe className="w-8 h-8 text-primary animate-spin" />
      <span className="text-xs text-slate-500">deck.gl siber veri haritası yükleniyor...</span>
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
  UA: 'Ukrayna',
  PL: 'Polonya',
  RO: 'Romanya',
  GR: 'Yunanistan',
  BG: 'Bulgaristan',
  SE: 'İsveç',
  NO: 'Norveç',
  FI: 'Finlandiya',
  EG: 'Mısır',
  SA: 'Suudi Arabistan',
  KZ: 'Kazakistan',
}

export function HQMap({ stats }: HQMapProps) {
  const totalUsers = stats.reduce((acc, curr) => acc + curr.count, 0)

  return (
    <div className="relative w-full h-[calc(100vh-220px)] min-h-[550px] rounded-3xl border border-white/10 bg-[#07070f] overflow-hidden shadow-2xl">
      {/* Real DeckGL Map - Spans Full Container */}
      <div className="absolute inset-0 w-full h-full z-0">
        {totalUsers > 0 ? (
          <HQDeckGLMap stats={stats} totalUsers={totalUsers} />
        ) : (
          <div className="w-full h-full bg-[#07070f] flex flex-col items-center justify-center gap-2">
            <Globe className="w-8 h-8 text-slate-700 animate-pulse" />
            <span className="text-xs text-slate-500">Aktif konum verisi bulunmuyor.</span>
          </div>
        )}
      </div>

      {/* Floating HUD Panel: Title & Info (Top-Left Overlay) */}
      <div className="absolute top-4 left-4 z-10 bg-slate-950/85 backdrop-blur-md border border-white/10 p-4 rounded-2xl shadow-2xl max-w-xs pointer-events-auto select-none">
        <div className="flex items-center gap-2 mb-1.5">
          <Globe className="w-4 h-4 text-violet-400 animate-pulse" />
          <h3 className="text-xs font-black text-white uppercase tracking-wider">Siber Dağılım Haritası</h3>
        </div>
        <p className="text-[10px] text-slate-400 leading-normal font-medium">
          Üyelerin coğrafi yoğunluğu, regional siber telemetry radar dalgaları ile anlık haritalandırılmıştır.
        </p>
        <div className="flex items-center gap-2 mt-3 text-[9px] font-black text-violet-400 uppercase bg-violet-500/10 px-2 py-1 rounded-lg border border-violet-500/20 w-fit">
          <span>{stats.length} Aktif Bölge</span>
        </div>
      </div>

      {/* Floating HUD Panel: Bölgesel Yoğunluk (Right Overlay) */}
      <div className="absolute top-4 right-4 bottom-4 w-80 z-10 bg-slate-950/85 backdrop-blur-md border border-white/10 p-5 rounded-2xl shadow-2xl flex flex-col justify-between pointer-events-auto overflow-hidden select-none">
        <div className="space-y-4 flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between pb-3 border-b border-white/5 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-500" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Bölgesel Yoğunluk</h3>
            </div>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>

          {/* Scrollable list */}
          <div className="space-y-4 overflow-y-auto flex-1 pr-1 custom-scrollbar min-h-0">
            {stats.map((stat, idx) => {
              const percentage = totalUsers > 0 ? (stat.count / totalUsers) * 100 : 0
              const countryCode = stat.country.toUpperCase()
              const countryName = COUNTRY_NAMES[countryCode] || stat.country

              return (
                <div key={stat.country} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-[10px] font-black text-slate-500 w-4">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <span className="font-bold text-slate-200 truncate">{countryName}</span>
                      <span className="text-[9px] uppercase font-black text-slate-500 flex-shrink-0">
                        ({stat.country})
                      </span>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <span className="font-black text-white">{stat.count}</span>
                      <span className="text-[9px] text-slate-400 ml-1">
                        ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-1.5 w-full bg-slate-900/60 rounded-full overflow-hidden border border-white/5">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-600"
                    />
                  </div>
                </div>
              )
            })}

            {stats.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center space-y-2">
                <Globe className="w-6 h-6 text-slate-600 animate-pulse" />
                <p className="text-xs text-slate-400 font-semibold">Konum verisi bulunamadı</p>
                <p className="text-[10px] text-slate-500 max-w-xs leading-relaxed">
                  Henüz konumunu profilinde belirten kayıtlı kullanıcı bulunmuyor.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Small box for summary */}
        <div className="mt-4 p-3 rounded-xl bg-white/[0.02] border border-white/5 text-[10px] leading-relaxed text-slate-400 flex items-center justify-between flex-shrink-0">
          <span>Toplam Konumlu Üye:</span>
          <span className="font-black text-white font-mono">{totalUsers} Üye</span>
        </div>
      </div>

      {/* Floating HUD Panel: Info Hint (Bottom-Left Overlay) */}
      <div className="absolute bottom-4 left-4 z-10 bg-slate-950/85 backdrop-blur-md border border-white/10 px-3.5 py-2 rounded-xl shadow-2xl flex items-center gap-1.5 text-[9px] text-slate-400 max-w-xs pointer-events-none select-none">
        <MapPin className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
        <span className="leading-tight">Üye konum bilgileri profil ayarlarına göre anonimleştirilerek haritalandırılmıştır.</span>
      </div>
    </div>
  )
}
