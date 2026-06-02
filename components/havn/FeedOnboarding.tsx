'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Sparkles, Users, UserPlus, UserCheck, ShieldCheck, 
  ArrowRight, CheckCircle2, Star, Check, HelpCircle, Loader2
} from 'lucide-react'
import { joinCommunity, leaveCommunity } from '@/lib/actions/communities'
import { followUser, unfollowUser } from '@/lib/actions/follows'
import { getRankInfo } from '@/lib/gamification'

interface OnboardingUser {
  id: string
  username: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  bio: string | null
  xp?: number
  is_verified?: boolean
  is_gold?: boolean
  relation?: string
}

interface OnboardingCommunity {
  id: string
  name: string
  slug: string
  description: string | null
  type: string
  community_members?: { id: string }[]
}

interface FeedOnboardingProps {
  suggestedUsers: OnboardingUser[]
  suggestedCommunities: OnboardingCommunity[]
}

export function FeedOnboarding({
  suggestedUsers,
  suggestedCommunities,
}: FeedOnboardingProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Track actions locally for immediate UI updates
  const [followedIds, setFollowedIds] = useState<string[]>([])
  const [joinedIds, setJoinedIds] = useState<string[]>([])
  
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({})

  // Toggle follow action
  const handleFollowToggle = async (targetId: string) => {
    setActionLoading(prev => ({ ...prev, [targetId]: true }))
    try {
      if (followedIds.includes(targetId)) {
        const res = await unfollowUser(targetId)
        if (!res.error) {
          setFollowedIds(prev => prev.filter(id => id !== targetId))
        }
      } else {
        const res = await followUser(targetId)
        if (!res.error) {
          setFollowedIds(prev => [...prev, targetId])
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setActionLoading(prev => ({ ...prev, [targetId]: false }))
    }
  }

  // Toggle join community action
  const handleJoinToggle = async (commId: string, commType: string) => {
    setActionLoading(prev => ({ ...prev, [commId]: true }))
    try {
      if (joinedIds.includes(commId)) {
        const res = await leaveCommunity(commId)
        if (!res.error) {
          setJoinedIds(prev => prev.filter(id => id !== commId))
        }
      } else {
        const res = await joinCommunity(commId, commType)
        if (!res.error) {
          setJoinedIds(prev => [...prev, commId])
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setActionLoading(prev => ({ ...prev, [commId]: false }))
    }
  }

  const followedCount = followedIds.length
  const joinedCount = joinedIds.length

  const hasFollowed = followedCount >= 1
  const hasJoined = joinedCount >= 1
  const isReady = hasFollowed && hasJoined

  // Proceed and refresh page to show feed
  const handleProceed = () => {
    startTransition(() => {
      router.refresh()
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full bg-[#080810]/70 border border-white/5 rounded-3xl p-6 md:p-8 flex flex-col gap-8 shadow-2xl backdrop-blur-md relative overflow-hidden text-slate-200 select-none"
    >
      {/* Decorative gradient glowing backgrounds */}
      <div className="absolute -top-36 -left-36 w-72 h-72 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-36 -right-36 w-72 h-72 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header and Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/5 relative z-10">
        <div className="space-y-2 flex-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-violet-500/10 bg-violet-500/5 text-[9px] font-black text-violet-400 uppercase tracking-widest">
            <Sparkles size={10} className="animate-spin text-violet-400" />
            Yeni Başlangıç
          </div>
          <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">HAVN'a Hoş Geldiniz!</h2>
          <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
            HAVN dünyasına adım attınız. Kişisel akışınızı aktifleştirmek için ilgi duyduğunuz topluluklara katılın ve yeni üyeleri takip edin.
          </p>
        </div>

        {/* Checklist Progress Block */}
        <div className="flex flex-col gap-2 p-4 rounded-2xl bg-white/[0.02] border border-white/5 min-w-[200px] shadow-inner">
          <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Aktivasyon Adımları</span>
          <div className="space-y-1.5 text-xs font-semibold">
            <div className="flex items-center gap-2">
              <span className={`w-4 h-4 rounded-full flex items-center justify-center border transition-all ${
                hasJoined 
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' 
                  : 'border-white/10 text-slate-600'
              }`}>
                {hasJoined ? <Check size={10} strokeWidth={3} /> : '1'}
              </span>
              <span className={hasJoined ? 'text-slate-400 line-through' : 'text-slate-300'}>
                Topluluğa Katıl ({joinedCount}/1)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-4 h-4 rounded-full flex items-center justify-center border transition-all ${
                hasFollowed 
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' 
                  : 'border-white/10 text-slate-600'
              }`}>
                {hasFollowed ? <Check size={10} strokeWidth={3} /> : '2'}
              </span>
              <span className={hasFollowed ? 'text-slate-400 line-through' : 'text-slate-300'}>
                Kişiyi Takip Et ({followedCount}/1)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Columns for Communities & People */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
        
        {/* RECOMMENDED COMMUNITIES */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-2.5">
            <Users size={16} className="text-violet-400" />
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-300">Önerilen Topluluklar</h3>
          </div>

          <div className="grid grid-cols-1 gap-3.5">
            {suggestedCommunities.slice(0, 4).map((comm) => {
              const isJoined = joinedIds.includes(comm.id)
              const isLoading = actionLoading[comm.id]

              return (
                <div 
                  key={comm.id}
                  className={`p-4 rounded-2xl border transition-all duration-300 flex items-center justify-between gap-4 bg-white/[0.01] ${
                    isJoined ? 'border-violet-500/20 bg-violet-500/[0.02]' : 'border-white/5 hover:border-white/10 hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-white hover:underline cursor-pointer">
                        {comm.name}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">#{comm.slug}</span>
                    </div>
                    {comm.description && (
                      <p className="text-[11px] text-slate-400 line-clamp-1 leading-snug">
                        {comm.description}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => handleJoinToggle(comm.id, comm.type)}
                    disabled={isLoading}
                    className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center min-w-[75px] gap-1 cursor-pointer active:scale-95 disabled:opacity-50 ${
                      isJoined
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                        : 'bg-violet-600 hover:bg-violet-700 text-white shadow-md hover:shadow-violet-600/15'
                    }`}
                  >
                    {isLoading ? (
                      <Loader2 size={10} className="animate-spin" />
                    ) : isJoined ? (
                      <>
                        <Check size={9} strokeWidth={3} /> Katılındı
                      </>
                    ) : (
                      'Katıl'
                    )}
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* RECOMMENDED PROFILES */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-2.5">
            <Star size={16} className="text-violet-400" />
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-300">Takip Edebileceğiniz Kişiler</h3>
          </div>

          <div className="grid grid-cols-1 gap-3.5">
            {suggestedUsers.slice(0, 4).map((sUser) => {
              const isFollowed = followedIds.includes(sUser.id)
              const initials = sUser.username.slice(0, 2).toUpperCase()
              const lvl = getRankInfo(sUser.xp ?? 0).level
              const isLoading = actionLoading[sUser.id]

              return (
                <div 
                  key={sUser.id}
                  className={`p-4 rounded-2xl border transition-all duration-300 flex items-center gap-3.5 bg-white/[0.01] ${
                    isFollowed ? 'border-violet-500/20 bg-violet-500/[0.02]' : 'border-white/5 hover:border-white/10 hover:bg-white/[0.02]'
                  }`}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    {sUser.avatar_url ? (
                      <img 
                        src={sUser.avatar_url} 
                        alt={sUser.username} 
                        className="w-10 h-10 rounded-xl object-cover border border-white/10 shadow-md"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white flex items-center justify-center font-black text-xs shadow-md">
                        {initials}
                      </div>
                    )}
                    <span className="absolute -bottom-1 -right-1 px-1 rounded border border-white/5 bg-slate-900 text-[6px] font-mono font-bold text-slate-400">
                      Lv.{lvl}
                    </span>
                  </div>

                  {/* Profile info */}
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-white leading-none">
                        {sUser.first_name ? `${sUser.first_name} ${sUser.last_name || ''}` : sUser.username}
                      </span>
                      {sUser.is_verified && <span className="text-blue-400 text-[9px]">✓</span>}
                      {sUser.is_gold && <span className="text-amber-400 text-[9px]">★</span>}
                    </div>
                    <p className="text-[9px] text-slate-500 font-mono leading-none">@{sUser.username}</p>
                    {sUser.bio && (
                      <p className="text-[10px] text-slate-400 line-clamp-1 leading-snug pt-0.5">
                        {sUser.bio.split('\u200B')[0]}
                      </p>
                    )}
                  </div>

                  {/* Action */}
                  <button
                    onClick={() => handleFollowToggle(sUser.id)}
                    disabled={isLoading}
                    className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center min-w-[75px] gap-1 cursor-pointer active:scale-95 disabled:opacity-50 flex-shrink-0 ${
                      isFollowed
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                        : 'bg-violet-600 hover:bg-violet-700 text-white shadow-md hover:shadow-violet-600/15'
                    }`}
                  >
                    {isLoading ? (
                      <Loader2 size={10} className="animate-spin" />
                    ) : isFollowed ? (
                      <>
                        <Check size={9} strokeWidth={3} /> Takipte
                      </>
                    ) : (
                      'Takip Et'
                    )}
                  </button>
                </div>
              )
            })}
          </div>
        </div>

      </div>

      {/* Footer activation control */}
      <div className="pt-6 border-t border-white/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative z-10 select-none">
        <span className="text-[10px] text-slate-500 font-semibold leading-normal max-w-sm">
          Aktivasyon kriterlerini tamamladığınızda akışınızı hazırlayabilir ve HAVN üzerinde paylaşımlara başlayabilirsiniz.
        </span>

        <button
          onClick={handleProceed}
          disabled={!isReady || isPending}
          className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
            isReady 
              ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-600/25 hover:opacity-90 active:scale-[0.98]' 
              : 'bg-white/5 border border-white/5 text-slate-500'
          }`}
        >
          {isPending ? (
            <>
              <Loader2 size={11} className="animate-spin" /> Akış Hazırlanıyor...
            </>
          ) : (
            <>
              Başla <ArrowRight size={11} />
            </>
          )}
        </button>
      </div>

    </motion.div>
  )
}
