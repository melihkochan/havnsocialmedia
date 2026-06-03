'use client'

import { useState, useEffect, useTransition, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Users, Trophy, Clock, SortAsc, BadgeCheck, Loader2, Crown, UserPlus, UserCheck, Clock3, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { getMembers, type MemberProfile } from '@/lib/actions/members'
import { followUser, unfollowUser } from '@/lib/actions/follows'
import { cn } from '@/lib/utils'
import { getDisplayName } from '@/lib/profile-display'

function MemberAvatar({ username, avatarUrl, isOnline, size = 'md' }: { username: string; avatarUrl: string | null; isOnline: boolean; size?: 'sm' | 'md' }) {
  const dim = size === 'md' ? 'w-11 h-11' : 'w-9 h-9'
  const dot = size === 'md' ? 'w-2.5 h-2.5' : 'w-2 h-2'
  return (
    <div className={cn('relative flex-shrink-0')}>
      {avatarUrl ? (
        <img src={avatarUrl} alt={username} className={cn(dim, 'rounded-full object-cover ring-1 ring-border/40')} />
      ) : (
        <div
          className={cn(dim, 'rounded-full flex items-center justify-center font-bold text-sm text-primary-foreground select-none')}
          style={{
            background: `linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))`,
            filter: `hue-rotate(${(username.charCodeAt(0) * 17) % 360}deg)`,
          }}
        >
          {username.slice(0, 2).toUpperCase()}
        </div>
      )}
      {isOnline && (
        <span className={cn('absolute bottom-0 right-0 border-2 border-background rounded-full bg-emerald-500', dot)} />
      )}
    </div>
  )
}

type SortOption = 'xp' | 'new' | 'name'

const SORT_LABELS: Record<SortOption, { label: string; icon: React.ReactNode }> = {
  xp:   { label: 'XP Sırası',   icon: <Trophy size={13} /> },
  new:  { label: 'Yeni Üyeler', icon: <Clock size={13} /> },
  name: { label: 'İsme Göre',   icon: <SortAsc size={13} /> },
}

function getOnlineStatus(updatedAt: string) {
  const diff = Date.now() - new Date(updatedAt).getTime()
  if (diff < 5 * 60 * 1000)  return 'online'
  if (diff < 15 * 60 * 1000) return 'away'
  return 'offline'
}

interface FollowState {
  [userId: string]: 'none' | 'following' | 'requested' | 'loading'
}

interface MembersClientProps {
  initialMembers: MemberProfile[]
  initialTotal: number
  currentUserId?: string | null
  initialFollowingIds?: string[]
}

export function MembersClient({
  initialMembers,
  initialTotal,
  currentUserId,
  initialFollowingIds = [],
}: MembersClientProps) {
  const [members, setMembers]       = useState<MemberProfile[]>(initialMembers)
  const [total, setTotal]           = useState(initialTotal)
  const [search, setSearch]         = useState('')
  const [sortBy, setSortBy]         = useState<SortOption>('xp')
  const [page, setPage]             = useState(0)
  const [hasMore, setHasMore]       = useState(initialTotal > initialMembers.length)
  const [isPending, startTransition] = useTransition()
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [followState, setFollowState] = useState<FollowState>(() => {
    const state: FollowState = {}
    for (const id of initialFollowingIds) state[id] = 'following'
    return state
  })
  const searchTimeout = useRef<NodeJS.Timeout | null>(null)
  const PAGE_SIZE = 30

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      startTransition(async () => {
        const res = await getMembers({ search, sortBy, page: 0, pageSize: PAGE_SIZE })
        setMembers(res.members)
        setTotal(res.total)
        setPage(0)
        setHasMore(res.members.length < res.total)
      })
    }, 300)
  }, [search, sortBy])

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return
    setIsLoadingMore(true)
    const nextPage = page + 1
    const res = await getMembers({ search, sortBy, page: nextPage, pageSize: PAGE_SIZE })
    setMembers(prev => [...prev, ...res.members])
    setPage(nextPage)
    setHasMore((nextPage + 1) * PAGE_SIZE < res.total)
    setIsLoadingMore(false)
  }, [isLoadingMore, hasMore, page, search, sortBy])

  const handleFollow = async (member: MemberProfile) => {
    if (!currentUserId) return
    const prev = followState[member.id] ?? 'none'
    if (prev === 'loading') return

    setFollowState(s => ({ ...s, [member.id]: 'loading' }))

    if (prev === 'following') {
      await unfollowUser(member.id)
      setFollowState(s => ({ ...s, [member.id]: 'none' }))
    } else {
      const res = await followUser(member.id)
      if (res.error) {
        setFollowState(s => ({ ...s, [member.id]: prev }))
      } else {
        setFollowState(s => ({ ...s, [member.id]: res.status === 'requested' ? 'requested' : 'following' }))
      }
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Search + Sort Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            id="members-search"
            type="text"
            placeholder="İsim veya kullanıcı adı ara..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>

        <div className="flex items-center gap-1 bg-card/60 border border-border/80 rounded-xl p-1 flex-shrink-0">
          {(Object.entries(SORT_LABELS) as [SortOption, { label: string; icon: React.ReactNode }][]).map(([key, val]) => (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap',
                sortBy === key
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
              )}
            >
              {val.icon}
              <span className="hidden sm:inline">{val.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Count Bar */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Users size={15} className="text-emerald-500" />
        <span>
          <span className="font-black text-foreground">{total.toLocaleString('tr-TR')}</span> kayıtlı üye
          {search && (
            <span className="ml-1">
              — <span className="text-primary font-semibold">"{search}"</span> için {members.length} sonuç
            </span>
          )}
        </span>
        {isPending && <Loader2 size={13} className="animate-spin text-primary ml-1" />}
      </div>

      {/* Members List */}
      <AnimatePresence mode="wait">
        {isPending && members.length === 0 ? (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 size={24} className="animate-spin text-primary" />
          </motion.div>
        ) : members.length === 0 ? (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
            <Users size={40} className="opacity-20" />
            <p className="text-sm">Sonuç bulunamadı.</p>
          </motion.div>
        ) : (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col divide-y divide-border/50 rounded-2xl overflow-hidden border border-border/60 bg-card/40">
            {members.map((member, idx) => {
              const isOnline   = getOnlineStatus(member.updated_at) === 'online'
              const isFounder  = member.role === 'founder'
              const isAdmin    = member.role === 'admin'
              const fState     = followState[member.id] ?? 'none'
              const isSelf     = currentUserId === member.id

              return (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx * 0.015, 0.25) }}
                  className="flex items-center gap-4 px-4 py-3.5 bg-card/0 hover:bg-accent/30 transition-colors duration-150"
                >
                  {/* Rank */}
                  {sortBy === 'xp' && (
                    <span className={cn(
                      'text-[11px] font-black font-mono w-5 text-center flex-shrink-0 leading-none',
                      idx === 0 ? 'text-amber-400' :
                      idx === 1 ? 'text-slate-400' :
                      idx === 2 ? 'text-amber-600' :
                      'text-muted-foreground/40'
                    )}>
                      {idx + 1}
                    </span>
                  )}

                  {/* Avatar */}
                  <Link href={`/profile/${member.username}`} className="flex-shrink-0">
                    <MemberAvatar username={member.username} avatarUrl={member.avatar_url} isOnline={isOnline} />
                  </Link>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Link href={`/profile/${member.username}`} className="text-sm font-bold text-foreground hover:text-primary transition-colors truncate">
                        {getDisplayName(member) ?? member.username}
                      </Link>
                      {(isFounder || member.username === 'havn') && (
                        <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded bg-gradient-to-tr from-yellow-400 via-amber-500 to-yellow-600 border border-amber-400/30 flex-shrink-0">
                          <span className="text-[7px] font-black text-black leading-none">H</span>
                        </span>
                      )}
                      {(isFounder || member.is_gold) && (
                        <BadgeCheck size={13} className="fill-[#eab308] text-background flex-shrink-0" />
                      )}
                      {!isFounder && !member.is_gold && member.is_verified && (
                        <BadgeCheck size={13} className="fill-[#0ea5e9] text-background flex-shrink-0" />
                      )}
                      {isFounder && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-[8px] font-black text-amber-500 uppercase tracking-wider flex-shrink-0">
                          <Crown size={8} className="fill-amber-500/30" />
                          Kurucu
                        </span>
                      )}
                      {isAdmin && !isFounder && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-[8px] font-black text-blue-500 uppercase tracking-wider flex-shrink-0">
                          Admin
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground font-mono">@{member.username}</p>
                    {member.bio && (
                      <p className="text-xs text-muted-foreground/70 truncate mt-0.5 hidden sm:block">
                        {member.bio.split('\u200B')[0]}
                      </p>
                    )}
                  </div>

                  {/* Right side: XP + Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* XP badge */}
                    {member.xp > 0 && (
                      <span className={cn(
                        'hidden sm:inline-flex text-[10px] font-black px-2 py-1 rounded-lg font-mono border select-none',
                        idx === 0 && sortBy === 'xp' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                        idx === 1 && sortBy === 'xp' ? 'bg-slate-400/10 border-slate-400/20 text-slate-400' :
                        idx === 2 && sortBy === 'xp' ? 'bg-amber-700/10 border-amber-700/20 text-amber-700' :
                        'bg-muted/50 border-border/60 text-muted-foreground'
                      )}>
                        {member.xp} XP
                      </span>
                    )}

                    {/* Follow Button */}
                    {currentUserId && !isSelf && (
                      <button
                        onClick={() => handleFollow(member)}
                        disabled={fState === 'loading'}
                        className={cn(
                          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border',
                          fState === 'following'
                            ? 'bg-primary/10 border-primary/20 text-primary hover:bg-rose-500/10 hover:border-rose-500/20 hover:text-rose-400'
                            : fState === 'requested'
                            ? 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                            : 'bg-primary text-primary-foreground border-primary hover:opacity-90',
                          fState === 'loading' && 'opacity-50 cursor-wait'
                        )}
                      >
                        {fState === 'loading' ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : fState === 'following' ? (
                          <><UserCheck size={12} /><span className="hidden sm:inline">Takipte</span></>
                        ) : fState === 'requested' ? (
                          <><Clock3 size={12} /><span className="hidden sm:inline">İstekte</span></>
                        ) : (
                          <><UserPlus size={12} /><span className="hidden sm:inline">Takip Et</span></>
                        )}
                      </button>
                    )}

                    {/* Profile Link */}
                    <Link
                      href={`/profile/${member.username}`}
                      className="p-1.5 rounded-lg border border-border/60 text-muted-foreground hover:text-foreground hover:border-border transition-all"
                      title="Profili Gör"
                    >
                      <ExternalLink size={13} />
                    </Link>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Load More */}
      {hasMore && (
        <div className="flex justify-center pt-2">
          <button
            onClick={loadMore}
            disabled={isLoadingMore}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl border border-border bg-card text-sm font-bold text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-accent/40 transition-all cursor-pointer disabled:opacity-50"
          >
            {isLoadingMore ? (
              <><Loader2 size={14} className="animate-spin" /> Yükleniyor...</>
            ) : (
              <>Daha fazla yükle</>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
