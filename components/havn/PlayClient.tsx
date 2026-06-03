'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Timer, CheckCircle2, XCircle, RefreshCw, Play, 
  Clock, Award, Loader2, Trophy, Zap, Lock
} from 'lucide-react'
import { submitGameScore, getGameLeaderboard, type LeaderboardEntry } from '@/lib/actions/games'
import { useLocale } from '@/lib/i18n/LocaleContext'
import { cn } from '@/lib/utils'

interface PlayClientProps {
  currentUser: {
    id: string
    username: string
    first_name: string | null
    last_name: string | null
    avatar_url: string | null
    is_verified?: boolean
    is_gold?: boolean
    xp?: number
  } | null
}

export function PlayClient({ currentUser }: PlayClientProps) {
  const { t, locale } = useLocale()
  
  // Custom Toast State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null)
  
  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToast({ message, type })
  }

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(timer)
  }, [toast])

  // ==========================================
  // REFLEX (REACTION TIME) GAME ENGINE
  // ==========================================
  const [rState, setRState] = useState<'idle' | 'waiting' | 'ready' | 'result' | 'early'>('idle')
  const [rResult, setRResult] = useState<number | null>(null)
  const [rLoading, setRLoading] = useState(false)
  const rStartTime = useRef<number>(0)
  const rTimeoutId = useRef<NodeJS.Timeout | null>(null)

  // Local Session Stats
  const [personalBest, setPersonalBest] = useState<number | null>(null)
  const [attempts, setAttempts] = useState<number>(0)
  const [totalMs, setTotalMs] = useState<number>(0)

  const startReflex = () => {
    setRState('waiting')
    setRResult(null)
    
    const randomDelay = 2000 + Math.random() * 3000 // 2-5 seconds
    rTimeoutId.current = setTimeout(() => {
      setRState('ready')
      rStartTime.current = Date.now()
    }, randomDelay)
  }

  const triggerReflexClick = () => {
    if (rState === 'waiting') {
      // Too early!
      if (rTimeoutId.current) clearTimeout(rTimeoutId.current)
      setRState('early')
    } else if (rState === 'ready') {
      const elapsed = Date.now() - rStartTime.current
      setRResult(elapsed)
      setRState('result')
      
      // Update local session stats
      setAttempts(a => a + 1)
      setTotalMs(t => t + elapsed)
      setPersonalBest(pb => (pb === null || elapsed < pb) ? elapsed : pb)

      saveReflexScore(elapsed)
    }
  }

  const saveReflexScore = async (timeMs: number) => {
    if (!currentUser) return
    // Guard against auto-clickers (<50ms is inhuman)
    if (timeMs < 50) return

    setRLoading(true)
    const res = await submitGameScore('reflex', timeMs)
    setRLoading(false)

    if (res.error) {
      showToast(res.error, 'error')
    } else if (res.success) {
      if (res.xpEarned && res.xpEarned > 0) {
        showToast(t('games.xp_reward', { xp: res.xpEarned }), 'success')
      } else {
        showToast(res.message || t('games.score_saved'), 'success')
      }
      // Refresh leaderboard list automatically
      fetchLeaderboard()
    }
  }

  useEffect(() => {
    return () => {
      if (rTimeoutId.current) clearTimeout(rTimeoutId.current)
    }
  }, [])

  // ==========================================
  // LEADERBOARD MANAGE
  // ==========================================
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<'daily' | 'weekly' | 'all'>('daily')
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([])
  const [leaderboardLoading, setLeaderboardLoading] = useState(false)

  const fetchLeaderboard = async () => {
    setLeaderboardLoading(true)
    const res = await getGameLeaderboard('reflex', leaderboardPeriod)
    setLeaderboardLoading(false)

    if (res.error) {
      showToast(res.error, 'error')
    } else if (res.leaderboard) {
      setLeaderboardData(res.leaderboard)
    }
  }

  useEffect(() => {
    fetchLeaderboard()
  }, [leaderboardPeriod])

  return (
    <div className="flex flex-col gap-5 w-full py-2">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div>
          <h1 className="text-xl font-black bg-gradient-to-r from-primary via-sky-500 to-indigo-500 bg-clip-text text-transparent flex items-center gap-2">
            <Timer className="text-primary animate-pulse" size={24} />
            {t('games.reflex.title')}
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {t('games.reflex.desc')}
          </p>
        </div>
      </div>

      {/* Guest Warning */}
      {!currentUser && (
        <div className="flex items-center gap-3 p-4 border border-dashed border-amber-500/20 bg-amber-500/5 rounded-2xl">
          <Lock className="text-amber-500 flex-shrink-0" size={18} />
          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
            {t('games.guest_warning')}
          </span>
        </div>
      )}

      {/* TOP SECTION: Reaction Click Pad (Left) & Personal Stats (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 w-full items-stretch">
        
        {/* Left Column: Reaction Click Pad */}
        <div className="lg:col-span-9 bg-card border border-border rounded-3xl p-6 shadow-sm flex flex-col items-center justify-center relative min-h-[300px] overflow-hidden">
          {/* Ambient Background Lights */}
          <div className="absolute inset-0 bg-gradient-to-tr from-accent/5 to-transparent pointer-events-none" />

          {/* Click Test Area */}
          {rState === 'idle' ? (
            <div className="flex flex-col items-center gap-4 text-center max-w-sm py-10 z-10">
              <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 mb-2 border border-indigo-500/20">
                <Zap size={28} className="animate-pulse" />
              </div>
              <h3 className="font-extrabold text-foreground text-sm">{t('games.reflex.title')}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t('games.reflex.xp_reward_hint')}
              </p>
              <button
                onClick={startReflex}
                className="px-6 py-2.5 bg-indigo-500 text-white font-extrabold text-xs rounded-xl hover:bg-indigo-600 transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-500/20 mt-2 select-none"
              >
                <Play size={12} fill="white" />
                {t('games.start')}
              </button>
            </div>
          ) : (
            <div className="w-full h-full flex flex-col gap-4 items-center justify-center z-10">
              <button
                onClick={triggerReflexClick}
                className={cn(
                  "w-full h-64 rounded-2xl border border-border/30 flex flex-col items-center justify-center text-center select-none cursor-pointer transition-all outline-none",
                  rState === 'waiting' && "bg-red-500 text-white animate-pulse border-red-600 shadow-lg shadow-red-500/10",
                  rState === 'ready' && "bg-green-500 text-white border-green-600 ring-8 ring-green-400/20 shadow-lg shadow-green-500/20",
                  rState === 'early' && "bg-amber-500 text-white border-amber-600 shadow-lg shadow-amber-500/10",
                  rState === 'result' && "bg-accent/40 text-foreground"
                )}
              >
                {rState === 'waiting' && (
                  <span className="text-sm font-black tracking-widest uppercase">{t('games.reflex.wait')}</span>
                )}
                {rState === 'ready' && (
                  <span className="text-xl font-black tracking-widest animate-bounce">{t('games.reflex.click')}</span>
                )}
                {rState === 'early' && (
                  <span className="text-sm font-black tracking-wide leading-normal px-6">
                    {t('games.reflex.too_early')}
                  </span>
                )}
                {rState === 'result' && rResult && (
                  <div className="flex flex-col items-center gap-2">
                    <Clock size={32} className="text-indigo-500" />
                    <span className="text-xl font-black">{t('games.reflex.success', { time: rResult })}</span>
                    <span className="text-[10px] text-muted-foreground leading-normal max-w-xs mt-1">
                      {rResult < 350 
                        ? t('games.reflex.success_desc') 
                        : t('games.reflex.xp_reward_hint')}
                    </span>
                  </div>
                )}
              </button>

              {/* Retry Button */}
              {(rState === 'result' || rState === 'early') && (
                <button
                  onClick={startReflex}
                  className="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white font-extrabold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-500/10 mt-1"
                >
                  <RefreshCw size={12} />
                  {t('games.play_again')}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Personal Stats (Stacked) */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          <div className="flex-1 bg-card border border-border rounded-2xl p-5 flex flex-col items-center justify-center text-center shadow-sm">
            <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider block">
              {t('games.reflex.pb')}
            </span>
            <span className="text-xl font-black text-foreground mt-2 block">
              {personalBest !== null ? `${personalBest}ms` : '—'}
            </span>
          </div>
          <div className="flex-1 bg-card border border-border rounded-2xl p-5 flex flex-col items-center justify-center text-center shadow-sm">
            <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider block">
              {t('games.reflex.avg')}
            </span>
            <span className="text-xl font-black text-foreground mt-2 block">
              {attempts > 0 ? `${Math.round(totalMs / attempts)}ms` : '—'}
            </span>
          </div>
        </div>

      </div>

      {/* BOTTOM SECTION: Leaderboard Widget (Full Width) */}
      <div className="bg-card border border-border rounded-3xl p-5 shadow-sm flex flex-col gap-4 w-full">
        <div className="flex items-center justify-between border-b border-border/30 pb-3">
          <h3 className="font-extrabold text-xs text-foreground flex items-center gap-1.5">
            <Trophy size={14} className="text-yellow-500" />
            {t('games.tab.leaderboard')}
          </h3>
          
          {/* Period Select */}
          <div className="flex bg-accent/40 border border-border/50 rounded-lg p-0.5">
            {(['daily', 'weekly', 'all'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setLeaderboardPeriod(period)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[9px] font-black transition-all cursor-pointer",
                  leaderboardPeriod === period 
                    ? "bg-card text-foreground shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {period === 'daily' ? t('games.leaderboard.daily') : period === 'weekly' ? t('games.leaderboard.weekly') : t('games.leaderboard.all')}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        {leaderboardLoading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
            <Loader2 className="animate-spin text-primary" size={16} />
            <span className="text-[10px] font-semibold">
              {t('games.leaderboard.loading')}
            </span>
          </div>
        ) : leaderboardData.length === 0 ? (
          <div className="text-center py-8 text-[11px] text-muted-foreground">
            {t('games.leaderboard.empty')}
          </div>
        ) : (
          <div className="flex flex-col gap-2 max-h-[250px] overflow-y-auto pr-1">
            {leaderboardData.map((entry, idx) => {
              const isTop3 = idx < 3
              const rankIcons = ['🥇', '🥈', '🥉']
              return (
                <div 
                  key={entry.id}
                  className={cn(
                    "flex items-center justify-between p-2.5 rounded-xl border border-transparent transition-colors",
                    entry.user_id === currentUser?.id ? "bg-primary/5 border-primary/20" : "hover:bg-accent/30"
                  )}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span className="w-5 text-[11px] font-black text-muted-foreground text-center">
                      {isTop3 ? rankIcons[idx] : idx + 1}
                    </span>

                    {/* Avatar */}
                    <div className="w-7 h-7 rounded-lg overflow-hidden flex-shrink-0 bg-accent/40 relative">
                      {entry.avatar_url ? (
                        <img src={entry.avatar_url} alt={entry.username} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-tr from-primary to-indigo-500 flex items-center justify-center font-bold text-white text-[10px]">
                          {entry.username.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Nick */}
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[11px] font-bold text-foreground truncate">
                        {entry.first_name ? `${entry.first_name} ${entry.last_name || ''}` : `@${entry.username}`}
                      </span>
                      {entry.is_verified && <span className="text-blue-500 text-[10px]">✓</span>}
                      {entry.is_gold && <span className="text-yellow-500 text-[10px]">👑</span>}
                    </div>
                  </div>

                  <span className="font-mono text-[11px] font-extrabold text-indigo-500 ml-2">
                    {entry.score}ms
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* TOAST POPUP */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className={cn(
              "fixed top-4 left-1/2 -translate-x-1/2 z-[9999] px-4 py-2.5 rounded-2xl shadow-xl border text-xs font-bold flex items-center gap-2 max-w-sm text-center",
              toast.type === 'success' && "bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400",
              toast.type === 'error' && "bg-destructive/10 border-destructive/30 text-destructive",
              toast.type === 'info' && "bg-sky-500/10 border-sky-500/30 text-sky-600 dark:text-sky-400"
            )}
          >
            {toast.type === 'success' ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
