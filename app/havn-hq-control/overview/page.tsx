import { getHQOverviewStats } from '@/lib/actions/hq-admin'
import { requireHQAccess } from '@/lib/actions/hq-auth'
import { HQSystemLog } from '@/components/havn/hq/HQSystemLog'
import { Users, Activity, FileText, Ticket, Server, Shield, Cpu, HardDrive } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Genel Durum — HAVN HQ' }

function MetricCard({
  title,
  value,
  sub,
  icon: Icon,
  color,
  progress,
  progressColor,
}: {
  title: string
  value: number | string
  sub?: string
  icon: any
  color: string
  progress?: number
  progressColor?: string
}) {
  return (
    <div
      className="rounded-2xl p-5 flex flex-col justify-between min-h-[140px] relative overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(120,80,255,0.12)',
      }}
    >
      <div
        className="absolute top-0 right-0 w-24 h-24 rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${color}14 0%, transparent 70%)`,
          transform: 'translate(30%, -30%)',
        }}
      />
      <div>
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
            {title}
          </p>
          <Icon size={16} style={{ color }} />
        </div>
        <p className="text-2xl font-black text-white mt-3">{typeof value === 'number' ? value.toLocaleString('tr-TR') : value}</p>
      </div>

      <div className="mt-2.5">
        {progress !== undefined ? (
          <div className="space-y-1.5">
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progress}%`, background: progressColor || color }}
              />
            </div>
            {sub && <p className="text-[9px] text-slate-500 font-medium">{sub}</p>}
          </div>
        ) : (
          sub && <p className="text-[10px] text-slate-400">{sub}</p>
        )}
      </div>
    </div>
  )
}

function StatusCard({ label, value, status }: { label: string; value: string; status: 'ok' | 'warn' | 'off' }) {
  const colors = { ok: '#34d399', warn: '#fbbf24', off: 'rgba(255,255,255,0.3)' }
  return (
    <div
      className="rounded-xl p-4"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(120,80,255,0.08)' }}
    >
      <p className="text-[10px] font-bold uppercase tracking-wider mb-2 text-slate-400">
        {label}
      </p>
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: colors[status] }} />
        <p className="text-xs font-bold" style={{ color: colors[status] }}>
          {value}
        </p>
      </div>
    </div>
  )
}

export default async function HQOverviewPage() {
  await requireHQAccess()
  const stats = await getHQOverviewStats()

  return (
    <div className="w-full p-8 space-y-8">
      {/* Top Header Row with status badge */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-white/5">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-1 text-primary">
            DAVRANIŞ KONTROL PANELİ
          </p>
          <h1 className="text-3xl font-black text-white tracking-tight">Genel Durum</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-[9px] font-black text-emerald-400 uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Sistem Sunucusu: Aktif (Online)
          </span>
        </div>
      </div>

      {/* Node status bar */}
      <div
        className="flex items-center justify-between rounded-2xl px-5 py-4"
        style={{
          background: 'rgba(16,185,129,0.04)',
          border: '1px solid rgba(16,185,129,0.15)',
        }}
      >
        <div className="flex items-center gap-3.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <div>
            <p className="text-sm font-black text-white">HAVN Core Active Node</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {stats.uptime || 'Uptime: Hesaplanıyor...'} · Supabase PostgreSQL + Realtime WebSocket
            </p>
          </div>
        </div>
        <p className="text-[10px] text-slate-500 font-mono">
          Son güncelleme: {new Date().toLocaleTimeString('tr-TR')}
        </p>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Toplam Üye"
          value={stats.totalUsers}
          icon={Users}
          color="#a78bfa"
          sub="Platforma kayıtlı tüm kullanıcılar"
        />
        <MetricCard
          title="Aktif & Çevrimiçi"
          value={stats.onlineUsers}
          icon={Activity}
          color="#34d399"
          sub="Son 5 dakikada aktif olanlar"
        />
        <MetricCard
          title="CPU Tüketimi"
          value={`%${stats.cpuUsage}`}
          icon={Cpu}
          color="#ec4899"
          progress={stats.cpuUsage}
          progressColor="linear-gradient(90deg, #ec4899, #f43f5e)"
          sub="Sanal çekirdek · Sunucu Toplam Yükü"
        />
        <MetricCard
          title="Bellek (RAM)"
          value={`${stats.ramUsed} GB`}
          icon={HardDrive}
          color="#fbbf24"
          progress={stats.ramProgress}
          progressColor="linear-gradient(90deg, #fbbf24, #f59e0b)"
          sub={`Sanal bellek · ${stats.ramUsed} GB / ${stats.ramTotal} GB`}
        />
      </div>

      {/* Bottom grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        {/* Security Status */}
        <div
          className="rounded-2xl p-6 flex flex-col justify-between"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(120,80,255,0.12)',
          }}
        >
          <div>
            <div className="flex items-center gap-2 mb-5">
              <Shield size={16} className="text-primary" />
              <p className="text-xs font-bold text-white uppercase tracking-wider">Node Güvenlik & Denetleme Durumu</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <StatusCard label="Network Hızı" value="Kararlı (0.8ms gecikme)" status="ok" />
              <StatusCard label="Zaman Sorgulama Limiti" value="Slow Mode: Devre Dışı" status="ok" />
              <StatusCard label="Onaylanmamış Bekleyenler" value={`${stats.openTickets} Yeni Moderasyon Talebi`} status={stats.openTickets > 0 ? 'warn' : 'ok'} />
              <StatusCard label="Kullanıcı Önerileri" value={`${stats.totalSuggestions || 0} toplam öneri`} status="ok" />
            </div>
          </div>

          {/* Totals rows */}
          <div className="flex flex-col gap-4 mt-6 pt-5 border-t border-white/5">
            {/* Row 1: Content metrics */}
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-xl p-3.5 text-center bg-blue-500/5 border border-blue-500/10">
                <p className="text-sm font-black text-white">{stats.totalPosts.toLocaleString('tr-TR')}</p>
                <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-wider">Gönderi</p>
              </div>
              <div className="rounded-xl p-3.5 text-center bg-violet-500/5 border border-violet-500/10">
                <p className="text-sm font-black text-white">{stats.totalComments.toLocaleString('tr-TR')}</p>
                <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-wider">Yorum</p>
              </div>
              <div className="rounded-xl p-3.5 text-center bg-amber-500/5 border border-amber-500/10">
                <p className="text-sm font-black text-white">{stats.totalLikes.toLocaleString('tr-TR')}</p>
                <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-wider">Beğeni</p>
              </div>
            </div>

            {/* Row 2: Management/Platform metrics */}
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-xl p-3.5 text-center bg-rose-500/5 border border-rose-500/10">
                <p className="text-sm font-black text-white">{(stats.totalTickets || 0).toLocaleString('tr-TR')}</p>
                <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-wider">Destek Talebi</p>
              </div>
              <div className="rounded-xl p-3.5 text-center bg-emerald-500/5 border border-emerald-500/10">
                <p className="text-sm font-black text-white">{(stats.repliedTickets || 0).toLocaleString('tr-TR')}</p>
                <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-wider">Cevaplanan Talep</p>
              </div>
              <div className="rounded-xl p-3.5 text-center bg-indigo-500/5 border border-indigo-500/10">
                <p className="text-sm font-black text-white">{(stats.totalCommunities || 0).toLocaleString('tr-TR')}</p>
                <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-wider">Topluluk</p>
              </div>
            </div>
          </div>
        </div>

        {/* Live Log */}
        <div className="h-full">
          <HQSystemLog />
        </div>
      </div>
    </div>
  )
}
