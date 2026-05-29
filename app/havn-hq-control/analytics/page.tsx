import { getMonthlyUserGrowth, getHourlyActivity, getHQOverviewStats } from '@/lib/actions/hq-admin'
import { requireHQAccess } from '@/lib/actions/hq-auth'
import { HQAreaChart, HQBarChart } from '@/components/havn/hq/HQCharts'
import { BarChart3, TrendingUp, Clock } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Analitik — HAVN HQ' }

export default async function HQAnalyticsPage() {
  await requireHQAccess()

  const [monthlyData, hourlyData, stats] = await Promise.all([
    getMonthlyUserGrowth(),
    getHourlyActivity(),
    getHQOverviewStats(),
  ])

  const totalInteractions = stats.totalPosts + stats.totalComments + stats.totalLikes
  const interactionBreakdown = [
    {
      label: 'Gönderiler',
      count: stats.totalPosts,
      pct: totalInteractions > 0 ? ((stats.totalPosts / totalInteractions) * 100).toFixed(1) : '0',
      color: '#3b82f6',
    },
    {
      label: 'Yorumlar',
      count: stats.totalComments,
      pct: totalInteractions > 0 ? ((stats.totalComments / totalInteractions) * 100).toFixed(1) : '0',
      color: '#34d399',
    },
    {
      label: 'Beğeniler',
      count: stats.totalLikes,
      pct: totalInteractions > 0 ? ((stats.totalLikes / totalInteractions) * 100).toFixed(1) : '0',
      color: '#f59e0b',
    },
  ]

  const peakHour = hourlyData.reduce(
    (max, d) => (d.posts > max.posts ? d : max),
    { hour: '-', posts: 0 }
  )

  return (
    <div className="w-full p-8 space-y-8">
      {/* Header */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'rgba(124,58,237,0.8)' }}>
          DAVRANIS KONTROL PANELİ
        </p>
        <h1 className="text-2xl font-black text-white">Gelişmiş Analitik</h1>
        <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Haftalık üye & post artış grafikleri
        </p>
      </div>

      {/* Area chart */}
      <div
        className="rounded-2xl p-5"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(120,80,255,0.12)' }}
      >
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp size={14} style={{ color: '#a78bfa' }} />
          <p className="text-sm font-bold text-white">Haftalık/Aylık Üye Artışı & İçerik Grafiği</p>
        </div>
        <p className="text-[11px] mb-4" style={{ color: 'rgba(255,255,255,0.35)' }}>
          HAVN topluluk büyümesi ve paylaşılan gönderi oransal tırmanış analitiği.
        </p>
        <HQAreaChart data={monthlyData} />
        <div className="flex gap-4 mt-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 rounded" style={{ background: '#7c3aed' }} />
            <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Toplam Üye</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 rounded" style={{ background: '#3b82f6' }} />
            <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Yeni Kayıt</span>
          </div>
        </div>
      </div>

      {/* Bar chart + breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
        <div
          className="rounded-2xl p-5"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(120,80,255,0.12)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock size={14} style={{ color: '#a78bfa' }} />
              <p className="text-sm font-bold text-white">En Çok Etkileşim Saatleri</p>
            </div>
            {peakHour.hour !== '-' && (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(245,158,11,0.15)', color: '#fbbf24' }}
              >
                Peak: {peakHour.hour}
              </span>
            )}
          </div>
          <HQBarChart data={hourlyData} />
          <p className="text-[10px] mt-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
            🟠 Pik yoğunluk {peakHour.hour} saatinde gerçekleşmektedir.
          </p>
        </div>

        {/* Interaction breakdown */}
        <div
          className="rounded-2xl p-5 space-y-4"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(120,80,255,0.12)' }}
        >
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 size={14} style={{ color: '#a78bfa' }} />
            <p className="text-sm font-bold text-white">Etkileşim Türü Dağılımı</p>
          </div>
          {interactionBreakdown.map((item) => (
            <div key={item.label}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                  <span className="text-xs font-bold text-white">{item.label}</span>
                </div>
                <span className="text-xs font-black" style={{ color: item.color }}>{item.pct}%</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${item.pct}%`, background: item.color }}
                />
              </div>
              <p className="text-[10px] mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
                {item.count.toLocaleString('tr-TR')} adet
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
