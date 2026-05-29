'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Shield, Zap, Activity, MessageSquare, Ticket, RefreshCw, BarChart2, Loader2 } from 'lucide-react'
import { getHQModLogs } from '@/lib/actions/hq-chat'

interface DashboardStats {
  totalUsers: number
  onlineUsers: number
  weeklyActive: number
  weeklyPosts: number
  dailyPosts: number
  openTickets: number
  totalPosts: number
  totalComments: number
  totalLikes: number
  totalTickets: number
  repliedTickets: number
  totalCommunities: number
  totalSuggestions: number
  cpuUsage: number
  ramUsed: string
  ramTotal: string
  ramProgress: number
  uptime: string
  latency: number
  slowModeActive: boolean
  registrationOpen: boolean
  doubleXpActive: boolean
  userGrowthPct: number
  activeGrowthPct: number
}

export function HQSystemLog({ stats }: { stats?: DashboardStats }) {
  const [latestLogs, setLatestLogs] = useState<any[]>([])
  const [loadingLogs, setLoadingLogs] = useState(true)

  const loadLogs = async () => {
    try {
      const data = await getHQModLogs()
      setLatestLogs(data.slice(0, 3)) // only keep latest 3 logs for overview preview
    } catch (e) {
      console.error('Failed to load logs for dashboard overview:', e)
    } finally {
      setLoadingLogs(false)
    }
  }

  useEffect(() => {
    loadLogs()
  }, [])

  // Math for support ticket resolution rate radial dial
  const totalTickets = stats?.totalTickets || 0
  const repliedTickets = stats?.repliedTickets || 0
  const resolutionRate = totalTickets > 0 ? Math.round((repliedTickets / totalTickets) * 100) : 100

  const radius = 40
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (resolutionRate / 100) * circumference

  return (
    <div
      className="rounded-2xl p-5 flex flex-col h-full gap-5"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(120,80,255,0.12)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-2">
          <BarChart2 size={15} className="text-primary" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">Aktivite ve Performans Kontrolü</span>
        </div>
        <span
          className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 tracking-wider uppercase"
        >
          Canlı Veri
        </span>
      </div>

      {/* Main Metrics Visualizer */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-shrink-0">
        
        {/* Radial Ticket Resolution Gauge */}
        <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] flex items-center justify-between gap-3">
          <div className="space-y-1">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Talepleri Çözümleme Oranı</h4>
            <div className="flex items-baseline gap-1.5 mt-1.5">
              <span className="text-xl font-black text-white">{resolutionRate}%</span>
              <span className="text-[9px] text-slate-500 font-mono">({repliedTickets}/{totalTickets})</span>
            </div>
            <p className="text-[8px] text-slate-500 leading-normal mt-0.5">Destek taleplerine geri dönüş hızı oranı.</p>
          </div>
          
          <div className="relative w-16 h-16 flex-shrink-0 flex items-center justify-center">
            {/* SVG Circle Gauge */}
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="32"
                cy="32"
                r={radius}
                className="stroke-white/5"
                strokeWidth="5"
                fill="transparent"
              />
              <motion.circle
                cx="32"
                cy="32"
                r={radius}
                className="stroke-primary"
                strokeWidth="5"
                fill="transparent"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-white font-mono">
              <Ticket size={10} className="text-primary/70" />
            </div>
          </div>
        </div>

        {/* Live Chatting Users & Stream Metrics */}
        <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Anlık Chatleşenler</h4>
              <p className="text-[8px] text-slate-500">Ekip ve üyeler arası anlık etkileşim hızı.</p>
            </div>
            <div className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </div>
          </div>

          <div className="flex items-center gap-5">
            <div className="flex items-center gap-1.5">
              <MessageSquare size={12} className="text-emerald-400" />
              <div className="flex flex-col">
                <span className="text-xs font-black text-white">{stats?.onlineUsers || 0} Kişi</span>
                <span className="text-[7px] font-bold text-slate-500 uppercase">Aktif</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 border-l border-white/5 pl-5">
              <Activity size={12} className="text-purple-400" />
              <div className="flex flex-col">
                <span className="text-xs font-black text-white">{(stats?.dailyPosts || 0) + (stats?.weeklyPosts || 0)} Akış</span>
                <span className="text-[7px] font-bold text-slate-500 uppercase">24sa Gönderi</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Latest Mod Activities Preview */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between pb-2 border-b border-white/5 mb-3">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Shield size={12} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Son Moderasyon İşlemleri</span>
          </div>
          <button
            onClick={loadLogs}
            disabled={loadingLogs}
            className="text-[9px] font-bold text-slate-500 hover:text-white transition-all flex items-center gap-1"
          >
            {loadingLogs ? <RefreshCw size={9} className="animate-spin" /> : <RefreshCw size={9} />}
            Tazele
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2.5 custom-scrollbar pr-0.5 min-h-0">
          {loadingLogs ? (
            <div className="flex flex-col items-center justify-center py-8 gap-1.5">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
              <span className="text-[9px] text-slate-600">Yükleniyor...</span>
            </div>
          ) : latestLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed border-white/5 rounded-xl text-slate-600">
              <span className="text-[9px] font-bold">Kayıt Bulunamadı</span>
            </div>
          ) : (
            latestLogs.map((log) => {
              const labelColors: Record<string, string> = {
                role_change: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
                user_warn: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                verification_toggle: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                xp_award: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
                community_approve: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                community_reject: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
              }
              const labels: Record<string, string> = {
                role_change: 'Rol',
                user_warn: 'Uyarı',
                verification_toggle: 'Rozet',
                xp_award: 'Ödül',
                community_approve: 'Onay',
                community_reject: 'Red',
              }

              return (
                <div
                  key={log.id}
                  className="p-3 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col gap-1.5 hover:bg-white/[0.02] transition-all"
                >
                  <div className="flex items-center justify-between text-[8px] text-slate-500">
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-slate-400">{log.actor?.name}</span>
                      <span className="text-slate-600">(@{log.actor?.username})</span>
                    </div>
                    <span>{new Date(log.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="text-[10px] text-slate-300 leading-relaxed font-medium">
                    {log.details}
                  </div>
                  {log.action && labels[log.action] && (
                    <div className="flex">
                      <span className={`px-1 rounded text-[7px] font-black uppercase tracking-wider border ${labelColors[log.action] || 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
                        {labels[log.action] || 'Sistem'}
                      </span>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
