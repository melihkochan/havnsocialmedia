'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  Sparkles, Users, ArrowRight, Star, Check, Loader2, BadgeCheck
} from 'lucide-react'
import { joinCommunity, leaveCommunity } from '@/lib/actions/communities'
import { followUser, unfollowUser } from '@/lib/actions/follows'

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
    } finally {
      setActionLoading(prev => ({ ...prev, [commId]: false }))
    }
  }

  useEffect(() => {
    document.cookie = "havn_onboarding_active=true; path=/; max-age=1800" // 30 minutes
  }, [])

  const followedCount = followedIds.length
  const joinedCount = joinedIds.length

  const hasFollowed = followedCount >= 1
  const hasJoined = joinedCount >= 1
  const isReady = hasFollowed && hasJoined

  // Proceed and refresh page to show feed
  const handleProceed = () => {
    document.cookie = "havn_onboarding_active=false; path=/; max-age=0" // delete cookie
    startTransition(() => {
      router.refresh()
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full bg-card/85 dark:bg-card/70 border border-border/80 dark:border-white/5 rounded-3xl p-6 md:p-8 flex flex-col gap-8 shadow-2xl backdrop-blur-md relative overflow-hidden text-foreground select-none"
    >
      {/* Decorative gradient glowing backgrounds */}
      <div className="absolute -top-36 -left-36 w-72 h-72 bg-violet-600/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-36 -right-36 w-72 h-72 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header and Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-border/40 dark:border-white/5 relative z-10">
        <div className="space-y-2 flex-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-violet-500/10 bg-violet-500/5 text-[9px] font-black text-violet-500 dark:text-violet-400 uppercase tracking-widest">
            <Sparkles size={10} className="animate-spin text-violet-500 dark:text-violet-400" />
            Yeni Başlangıç
          </div>
          <h2 className="text-xl md:text-2xl font-black text-foreground tracking-tight">HAVN'a Hoş Geldiniz!</h2>
          <p className="text-xs text-muted-foreground max-w-xl leading-relaxed">
            HAVN dünyasına adım attınız. Kişisel akışınızı aktifleştirmek için ilgi duyduğunuz topluluklara katılın ve yeni üyeleri takip edin.
          </p>
        </div>

        {/* Checklist Progress Block */}
        <div className="flex flex-col gap-2 p-4 rounded-2xl bg-muted/40 dark:bg-white/[0.02] border border-border/60 dark:border-white/5 min-w-[200px] shadow-inner">
          <span className="text-[9px] font-black uppercase text-muted-foreground/60 tracking-wider">Aktivasyon Adımları</span>
          <div className="space-y-1.5 text-xs font-semibold">
            <div className="flex items-center gap-2">
              <span className={`w-4 h-4 rounded-full flex items-center justify-center border transition-all ${
                hasJoined 
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-600 dark:text-emerald-400' 
                  : 'border-border dark:border-white/10 text-muted-foreground/40'
              }`}>
                {hasJoined ? <Check size={10} strokeWidth={3} /> : '1'}
              </span>
              <span className={hasJoined ? 'text-muted-foreground line-through' : 'text-foreground'}>
                Topluluğa Katıl ({joinedCount}/1)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-4 h-4 rounded-full flex items-center justify-center border transition-all ${
                hasFollowed 
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-600 dark:text-emerald-400' 
                  : 'border-border dark:border-white/10 text-muted-foreground/40'
              }`}>
                {hasFollowed ? <Check size={10} strokeWidth={3} /> : '2'}
              </span>
              <span className={hasFollowed ? 'text-muted-foreground line-through' : 'text-foreground'}>
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
          <div className="flex items-center gap-2 border-b border-border/40 dark:border-white/5 pb-2.5">
            <Users size={16} className="text-violet-500 dark:text-violet-400" />
            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Önerilen Topluluklar</h3>
          </div>

          <div className="grid grid-cols-1 gap-3.5">
            {suggestedCommunities.slice(0, 4).map((comm) => {
              const isJoined = joinedIds.includes(comm.id)
              const isLoading = actionLoading[comm.id]

              return (
                <div 
                  key={comm.id}
                  className={`p-4 rounded-2xl border transition-all duration-300 flex items-center justify-between gap-4 bg-card ${
                    isJoined ? 'border-violet-500/30 bg-violet-500/[0.03]' : 'border-border/60 dark:border-white/5 hover:border-border hover:bg-muted/20 dark:hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-foreground hover:underline cursor-pointer">
                        {comm.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground/60 font-mono">#{comm.slug}</span>
                    </div>
                    {comm.description && (
                      <p className="text-[11px] text-muted-foreground line-clamp-1 leading-snug">
                        {comm.description}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => handleJoinToggle(comm.id, comm.type)}
                    disabled={isLoading}
                    className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center min-w-[75px] gap-1 cursor-pointer active:scale-95 disabled:opacity-50 ${
                      isJoined
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
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
          <div className="flex items-center gap-2 border-b border-border/40 dark:border-white/5 pb-2.5">
            <Star size={16} className="text-violet-500 dark:text-violet-400" />
            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Takip Edebileceğiniz Kişiler</h3>
          </div>

          <div className="grid grid-cols-1 gap-3.5">
            {suggestedUsers.slice(0, 4).map((sUser) => {
              const isFollowed = followedIds.includes(sUser.id)
              const initials = sUser.username.slice(0, 2).toUpperCase()
              const isLoading = actionLoading[sUser.id]

              return (
                <div 
                  key={sUser.id}
                  className={`p-4 rounded-2xl border transition-all duration-300 flex items-center gap-3.5 bg-card ${
                    isFollowed ? 'border-violet-500/30 bg-violet-500/[0.03]' : 'border-border/60 dark:border-white/5 hover:border-border hover:bg-muted/20 dark:hover:bg-white/[0.02]'
                  }`}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    {sUser.avatar_url ? (
                      <img 
                        src={sUser.avatar_url} 
                        alt={sUser.username} 
                        className="w-10 h-10 rounded-xl object-cover border border-border/80 dark:border-white/10 shadow-md"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white flex items-center justify-center font-black text-xs shadow-md">
                        {initials}
                      </div>
                    )}
                  </div>

                  {/* Profile info */}
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-foreground leading-none">
                        {sUser.first_name ? `${sUser.first_name} ${sUser.last_name || ''}` : sUser.username}
                      </span>
                      {sUser.is_gold && (
                        <span className="inline-flex items-center" title="Sistem Ortağı">
                          <BadgeCheck size={14} className="fill-[#eab308] text-background drop-shadow-[0_0_2px_rgba(234,179,8,0.3)]" />
                        </span>
                      )}
                      {!sUser.is_gold && sUser.is_verified && (
                        <span className="inline-flex items-center" title="Doğrulanmış Hesap">
                          <BadgeCheck size={14} className="fill-[#0ea5e9] text-background drop-shadow-[0_0_2px_rgba(14,165,233,0.3)]" />
                        </span>
                      )}
                    </div>
                    <p className="text-[9px] text-muted-foreground/60 font-mono leading-none">@{sUser.username}</p>
                    {sUser.bio && (
                      <p className="text-[10px] text-muted-foreground line-clamp-1 leading-snug pt-0.5">
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
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
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
      <div className="pt-6 border-t border-border/40 dark:border-white/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative z-10 select-none">
        <span className="text-[10px] text-muted-foreground font-semibold leading-normal max-w-sm">
          Aktivasyon kriterlerini tamamladığınızda akışınızı hazırlayabilir ve HAVN üzerinde paylaşımlara başlayabilirsiniz.
        </span>

        <button
          onClick={handleProceed}
          disabled={!isReady || isPending}
          className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
            isReady 
              ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-600/25 hover:opacity-90 active:scale-[0.98]' 
              : 'bg-muted border border-border/80 dark:border-white/5 text-muted-foreground'
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
