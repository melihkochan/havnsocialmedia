'use client'

import { useEffect, useState, startTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Globe, Lock, Users, TrendingUp, ShieldCheck, Crown, ShieldAlert,
  UserMinus, UserCheck, FileText, Eye, Loader2, ArrowRight, Sparkles, Hash, BadgeCheck
} from 'lucide-react'
import { getCommunityStats } from '@/lib/actions/analytics'
import { updateMemberRole, removeMember } from '@/lib/actions/communities'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { getDisplayName, getFullName, getOnlineStatus } from '@/lib/profile-display'
import { ProfileName } from '@/components/havn/ProfileName'
import { cleanBio } from '@/lib/profile-enrich'
import { parseCommunityDescription } from '@/lib/community-rules'
import { getRightBarData } from '@/lib/actions/rightbar'
import { FormattedMessage } from '@/components/havn/FormattedMessage'
import { Award, Volume2 } from 'lucide-react'

interface CommunityData {
  id: string
  name: string
  description: string | null
  type: 'public' | 'request_to_join'
  slug: string
  rules?: any[]
  announcement?: string | null
}

interface Member {
  user_id: string
  role: 'owner' | 'moderator' | 'member'
  status: string
  profiles: {
    id: string
    username: string
    first_name?: string | null
    last_name?: string | null
    avatar_url: string | null
    updated_at?: string
  }
}

interface RightBarProps {
  communityId?: string
  currentUserRole?: 'owner' | 'moderator' | 'member' | null
}

function Avatar({ username, avatarUrl, size = 'sm', updatedAt, isOnline }: { username: string; avatarUrl: string | null; size?: 'sm' | 'md'; updatedAt?: string; isOnline?: boolean }) {
  const sizeCls = size === 'md' ? 'w-10 h-10 text-sm' : 'w-8 h-8 text-xs'
  const dotSize = size === 'md' ? 'w-3 h-3 border-2 border-background' : 'w-2 h-2 border-2 border-background'

  const imgEl = avatarUrl ? (
    <img 
      src={updatedAt ? `${avatarUrl}?t=${new Date(updatedAt).getTime()}` : avatarUrl} 
      alt={username} 
      className={cn(sizeCls, "rounded-full object-cover flex-shrink-0 ring-1 ring-border")} 
    />
  ) : (
    <div
      className={cn(sizeCls, "rounded-full flex items-center justify-center font-bold flex-shrink-0")}
      style={{
        background: `linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))`,
        filter: `hue-rotate(${(username.charCodeAt(0) * 17) % 360}deg)`,
        color: 'var(--primary-foreground)',
      }}
    >
      {username.slice(0, 2).toUpperCase()}
    </div>
  )

  return (
    <div className="relative inline-block flex-shrink-0">
      {imgEl}
      {isOnline && (
        <span className={cn("absolute bottom-0 right-0 bg-emerald-500 rounded-full animate-pulse", dotSize)} />
      )}
    </div>
  )
}

function RoleChip({ role }: { role: string }) {
  if (role === 'owner') {
    return (
      <div
        className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold"
        style={{
          background: 'color-mix(in oklch, var(--owner-color) 12%, transparent)',
          color: 'var(--owner-color)',
          border: '1px solid color-mix(in oklch, var(--owner-color) 25%, transparent)',
        }}
      >
        <Crown size={9} fill="currentColor" /> KURUCU
      </div>
    )
  }
  if (role === 'moderator') {
    return (
      <div
        className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-semibold"
        style={{
          background: 'color-mix(in oklch, var(--mod-color) 12%, transparent)',
          color: 'var(--mod-color)',
          border: '1px solid color-mix(in oklch, var(--mod-color) 25%, transparent)',
        }}
      >
        <ShieldCheck size={9} /> MOD
      </div>
    )
  }
  return null
}

// ─── Global RightBar (no community context) ───────────────────────────────────

function GlobalRightBar() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await getRightBarData()
        setData(res)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()

    const supabase = createClient()
    const channelToken = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    const channel = supabase.channel(`global_rightbar_realtime_${channelToken}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'posts' },
        () => {
          load()
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        () => {
          load()
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [])

  if (loading) {
    return (
      <aside className="h-full py-6 px-4 flex flex-col gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-card border border-border rounded-2xl p-4 animate-pulse">
            <div className="h-4 bg-muted rounded w-2/3 mb-3" />
            <div className="h-3 bg-muted rounded w-full mb-2" />
            <div className="h-3 bg-muted rounded w-4/5" />
          </div>
        ))}
      </aside>
    )
  }

  return (
    <aside className="h-full py-6 px-4 flex flex-col gap-4 overflow-y-auto">
      {/* Platform Stats */}
      <div className="bg-card/65 backdrop-blur-md border border-border/80 rounded-2xl p-4 flex flex-col gap-3 shadow-md transition-all duration-300 hover:border-primary/20 flex-shrink-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 bg-primary/10 text-primary"
            >
              <Sparkles size={12} className="stroke-[2.5]" />
            </div>
            <h2 className="text-xs font-black text-foreground uppercase tracking-wider">HAVN İstatistikleri</h2>
          </div>
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase tracking-wide">Canlı</span>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {/* Communities Stat */}
          <div className="relative overflow-hidden bg-gradient-to-br from-violet-500/8 to-indigo-500/3 hover:from-violet-500/12 hover:to-indigo-500/6 border border-violet-500/15 hover:border-violet-500/30 rounded-xl p-3.5 transition-all duration-300 group/stat hover:-translate-y-0.5">
            <div className="absolute top-0 right-0 w-12 h-12 bg-violet-500/10 blur-lg rounded-full -mr-3 -mt-3 pointer-events-none group-hover/stat:bg-violet-500/20 transition-all duration-300" />
            <div className="flex items-center justify-between text-violet-500 dark:text-violet-400 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider">Topluluklar</span>
              <div className="p-1 rounded-lg bg-violet-500/10 border border-violet-500/10">
                <Hash size={12} className="stroke-[2.5]" />
              </div>
            </div>
            <p className="text-2xl font-black text-foreground tracking-tight drop-shadow-[0_0_12px_rgba(139,92,246,0.15)]">{data?.totalCommunities ?? 0}</p>
          </div>
          {/* Members Stat */}
          <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500/8 to-teal-500/3 hover:from-emerald-500/12 hover:to-teal-500/6 border border-emerald-500/15 hover:border-emerald-500/30 rounded-xl p-3.5 transition-all duration-300 group/stat hover:-translate-y-0.5">
            <div className="absolute top-0 right-0 w-12 h-12 bg-emerald-500/10 blur-lg rounded-full -mr-3 -mt-3 pointer-events-none group-hover/stat:bg-emerald-500/20 transition-all duration-300" />
            <div className="flex items-center justify-between text-emerald-500 dark:text-emerald-400 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider">Üyeler</span>
              <div className="p-1 rounded-lg bg-emerald-500/10 border border-emerald-500/10">
                <Users size={12} className="stroke-[2.5]" />
              </div>
            </div>
            <p className="text-2xl font-black text-foreground tracking-tight drop-shadow-[0_0_12px_rgba(16,185,129,0.15)]">{(data?.totalMembers ?? 0).toLocaleString('tr-TR')}</p>
          </div>
        </div>
      </div>

      {/* HAVN Ekibi (Always Visible) */}
      {data?.team && data.team.length > 0 && (
        <div className="bg-card/65 backdrop-blur-md border border-amber-500/25 rounded-2xl p-4 flex flex-col gap-3 shadow-lg shadow-amber-500/[0.015] relative overflow-hidden group hover:border-amber-500/40 transition-all duration-300 flex-shrink-0">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/[0.02] blur-xl rounded-full -mr-6 -mt-6 pointer-events-none" />
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 bg-gradient-to-tr from-yellow-400 via-amber-500 to-yellow-600 shadow-[0_0_8px_rgba(245,158,11,0.35)]"
            >
              <Crown size={12} className="text-black fill-black" />
            </div>
            <h2 className="text-xs font-black bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 bg-clip-text text-transparent uppercase tracking-wider">Havn Ekibi</h2>
          </div>
          <div className="flex flex-col gap-2">
            {data.team.map((member: any) => {
              const online = getOnlineStatus(member).status === 'online'
              return (
                <div key={member.id} className="flex items-center justify-between gap-2.5 p-2 rounded-xl bg-accent/20 border border-border/30 hover:border-amber-500/15 transition-all">
                  <Link href={`/profile/${member.username}`} className="flex items-center gap-2.5 min-w-0 flex-1 group/item">
                    <Avatar username={member.username} avatarUrl={member.avatar_url} size="sm" isOnline={online} updatedAt={member.updated_at} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="text-xs font-bold text-foreground truncate group-hover/item:text-amber-500 transition-colors">
                          {getFullName(member) ?? member.username}
                        </span>
                        <span className="flex-shrink-0 align-middle inline-flex items-center justify-center w-3 h-3 rounded bg-gradient-to-tr from-yellow-400 via-amber-500 to-yellow-600 text-black border border-amber-400/30 shadow-[0_0_4px_rgba(245,158,11,0.55)]">
                          <span className="text-[7px] font-black text-black leading-none font-mono">H</span>
                        </span>
                      </div>
                      <p className="text-[9px] text-muted-foreground truncate">@{member.username}</p>
                    </div>
                  </Link>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black tracking-wider uppercase border bg-amber-500/10 border-amber-500/20 text-amber-500 select-none">
                    Kurucu
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Resmi Duyuru (Latest announcement by havn) */}
      {data?.announcement && (
        <div className="bg-card/65 backdrop-blur-md border border-violet-500/25 rounded-2xl p-4 flex flex-col gap-3 shadow-lg shadow-violet-500/[0.015] relative overflow-hidden group hover:border-violet-500/40 transition-all duration-300 flex-shrink-0">
          <div className="absolute top-0 right-0 w-20 h-20 bg-violet-500/[0.02] blur-xl rounded-full -mr-5 -mt-5 pointer-events-none" />
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 bg-gradient-to-tr from-[#8b5cf6] via-[#ec4899] to-[#f97316] shadow-[0_0_8px_rgba(139,92,246,0.35)]"
            >
              <Volume2 size={12} className="text-white" />
            </div>
            <h2 className="text-xs font-black bg-gradient-to-r from-[#8b5cf6] via-[#ec4899] to-[#f97316] bg-clip-text text-transparent uppercase tracking-wider">Resmi Duyuru</h2>
          </div>
          <div className="p-3.5 rounded-xl bg-accent/25 border border-border/40 text-xs leading-relaxed flex flex-col gap-2">
            <FormattedMessage text={data.announcement.content || ''} className="text-muted-foreground text-xs font-medium" />
            <div className="flex items-center justify-between border-t border-border/30 pt-2.5 mt-1 text-[9px] text-muted-foreground font-semibold font-mono select-none">
              <span>{data.announcement.profiles ? `@${data.announcement.profiles.username}` : 'Havn'}</span>
              <span>{new Date(data.announcement.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</span>
            </div>
          </div>
        </div>
      )}

      {/* Havn Gündemi (Trending Hashtags) */}
      {data?.trendingTags && data.trendingTags.length > 0 && (
        <div className="bg-card/65 backdrop-blur-md border border-border/80 rounded-2xl p-4 flex flex-col gap-3 shadow-md transition-all duration-300 hover:border-primary/20 flex-shrink-0">
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 bg-primary/10 text-primary"
            >
              <Hash size={12} className="stroke-[3]" />
            </div>
            <h2 className="text-xs font-black text-foreground uppercase tracking-wider">Havn Gündemi</h2>
          </div>
          <div className="flex flex-col gap-2">
            {data.trendingTags.map((t: any, idx: number) => {
              const cleanTagName = t.tag.replace('#', '')
              return (
                <Link
                  key={t.tag}
                  href={`/feed?tag=${cleanTagName}`}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-accent/10 border border-border/30 hover:border-primary/45 hover:bg-primary/[0.02] active:scale-[0.98] transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={cn(
                      "text-[10px] font-black font-mono w-4 text-left flex-shrink-0",
                      idx === 0 ? "text-amber-500 font-extrabold" :
                      idx === 1 ? "text-slate-400 font-bold" :
                      idx === 2 ? "text-amber-700 font-bold" :
                      "text-muted-foreground/80"
                    )}>
                      {idx + 1}.
                    </span>
                    <span className="text-xs font-black text-primary font-mono group-hover:text-primary transition-colors truncate">
                      {t.tag}
                    </span>
                  </div>
                  <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border/40 group-hover:bg-primary/20 group-hover:border-primary/30 group-hover:text-primary transition-all font-mono flex-shrink-0">
                    {t.count} paylaşım
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Liderlik Tablosu */}
      {data?.leaderboard && data.leaderboard.length > 0 && (
        <div className="bg-card/65 backdrop-blur-md border border-border/80 rounded-2xl p-4 flex flex-col gap-3 shadow-md transition-all duration-300 hover:border-primary/20 flex-shrink-0">
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 bg-violet-500/10 text-violet-400"
            >
              <Award size={12} />
            </div>
            <h2 className="text-xs font-black text-foreground uppercase tracking-wider">Liderlik Tablosu</h2>
          </div>
          <div className="flex flex-col gap-2">
            {data.leaderboard.map((u: any, idx: number) => {
              const online = getOnlineStatus(u).status === 'online'
              return (
                <div key={u.id} className="flex items-center justify-between gap-2.5 p-2 rounded-xl bg-accent/20 border border-border/30 hover:border-violet-500/15 transition-all">
                  <Link href={`/profile/${u.username}`} className="flex items-center gap-2.5 min-w-0 flex-1 group/item">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-[10px] font-black font-mono w-4 text-right flex-shrink-0",
                        idx === 0 ? "text-amber-500 font-extrabold" :
                        idx === 1 ? "text-slate-400 font-bold" :
                        idx === 2 ? "text-amber-700 font-bold" :
                        "text-muted-foreground/80"
                      )}>
                        {idx + 1}.
                      </span>
                      <Avatar username={u.username} avatarUrl={u.avatar_url} size="sm" isOnline={online} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="text-xs font-bold text-foreground truncate group-hover/item:text-primary transition-colors">
                          {getFullName(u) ?? u.username}
                        </span>
                        {u.is_gold && (
                          <span className="flex-shrink-0 align-middle inline-flex cursor-help">
                            <BadgeCheck size={12} className="fill-[#eab308] text-background" />
                          </span>
                        )}
                        {u.is_verified && !u.is_gold && (
                          <span className="flex-shrink-0 align-middle inline-flex cursor-help">
                            <BadgeCheck size={12} className="fill-[#0ea5e9] text-background" />
                          </span>
                        )}
                      </div>
                      <p className="text-[9px] text-muted-foreground truncate">@{u.username}</p>
                    </div>
                  </Link>
                  <span className={cn(
                    "text-[9px] font-black px-1.5 py-0.5 rounded-md font-mono border select-none",
                    idx === 0 ? "bg-amber-500/10 border-amber-500/20 text-amber-500" :
                    idx === 1 ? "bg-slate-400/10 border-slate-400/20 text-slate-400" :
                    idx === 2 ? "bg-amber-700/10 border-amber-700/20 text-amber-700" :
                    "bg-violet-500/10 border-violet-500/20 text-violet-400"
                  )}>
                    {u.xp} XP
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Popular Communities */}
      {data?.popularCommunities && data.popularCommunities.length > 0 && (
        <div className="bg-card/65 backdrop-blur-md border border-border/80 rounded-2xl p-4 flex flex-col gap-3 shadow-md transition-all duration-300 hover:border-primary/20 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp size={13} className="text-primary" />
              <h2 className="text-xs font-black text-foreground uppercase tracking-wider">Popüler Topluluklar</h2>
            </div>
            <Link href="/communities" className="text-[10px] font-semibold text-primary hover:opacity-80 transition-opacity flex items-center gap-0.5">
              Tümü <ArrowRight size={10} />
            </Link>
          </div>

          <div className="flex flex-col gap-1 divide-y divide-border/40">
            {data.popularCommunities.map((c: any, i: number) => (
              <Link
                key={c.id}
                href={`/communities/${c.slug}`}
                className="flex items-center gap-2.5 py-2.5 hover:opacity-80 transition-opacity group"
              >
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0 text-primary-foreground"
                  style={{
                    background: `linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))`,
                    filter: `hue-rotate(${(c.name.charCodeAt(0) * 23 + i * 60) % 360}deg)`,
                  }}
                >
                  {c.name.slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">{c.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      <Users size={9} /> {c.memberCount.toLocaleString('tr-TR')} üye
                    </span>
                    <span
                      className="text-[9px] px-1 py-0.5 rounded font-semibold"
                      style={{
                        background: c.type === 'public' ? 'color-mix(in oklch, var(--primary) 10%, transparent)' : 'color-mix(in oklch, var(--owner-color) 10%, transparent)',
                        color: c.type === 'public' ? 'var(--primary)' : 'var(--owner-color)',
                      }}
                    >
                      {c.type === 'public' ? <Globe size={8} className="inline" /> : <Lock size={8} className="inline" />}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Footer note */}
      <p className="text-[10px] text-muted-foreground text-center px-2 pb-2">
        HAVN — Topluluk Platformu
      </p>
    </aside>
  )
}

// ─── Community RightBar ───────────────────────────────────────────────────────

export function RightBar({ communityId: propCommunityId, currentUserRole: propUserRole }: RightBarProps) {
  // If no community context, show the global panel
  if (!propCommunityId) {
    return <GlobalRightBar />
  }

  return <CommunityRightBar communityId={propCommunityId} currentUserRole={propUserRole} />
}

function CommunityRightBar({ communityId: propCommunityId, currentUserRole: propUserRole }: RightBarProps) {
  const [activeTab, setActiveTab] = useState<'about' | 'members'>('about')
  const [memberFilter, setMemberFilter] = useState<'all' | 'staff'>('all')
  const [community, setCommunity] = useState<CommunityData | null>(null)
  const [memberCount, setMemberCount] = useState(0)
  const [members, setMembers] = useState<Member[]>([])
  const [stats, setStats] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionUserId, setActionUserId] = useState<string | null>(null)
  const [role, setRole] = useState<'owner' | 'moderator' | 'member' | null>(propUserRole ?? null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const supabase = createClient()

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user?.id ?? null)

      let activeId = propCommunityId

      if (!activeId) {
        setLoading(false)
        return
      }

      const { data } = await supabase.from('communities').select('*').eq('id', activeId).single()
      if (data) setCommunity(data)

      // Fetch user membership/role if not provided
      if (user && !propUserRole) {
        const { data: membership } = await supabase
          .from('community_members')
          .select('role')
          .eq('community_id', activeId)
          .eq('user_id', user.id)
          .eq('status', 'approved')
          .single()
        setRole(membership?.role ?? null)
      } else if (propUserRole) {
        setRole(propUserRole)
      }

      // Parallel fetch of members, stats, count
      const [membersResult, statsResult, countResult] = await Promise.all([
        supabase
          .from('community_members')
          .select('user_id, role, status, profiles(id, username, first_name, last_name, avatar_url, updated_at)')
          .eq('community_id', activeId)
          .eq('status', 'approved')
          .order('role', { ascending: true }),
        getCommunityStats(activeId),
        supabase.from('community_members').select('*', { count: 'exact', head: true }).eq('community_id', activeId).eq('status', 'approved')
      ])

      if (membersResult.data) {
        setMembers(membersResult.data as unknown as Member[])
      }
      setStats(statsResult)
      setMemberCount(countResult.count ?? 0)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setLoading(true)
    loadData()

    if (!propCommunityId) return

    const channelToken = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    const channel = supabase.channel(`community_rightbar_realtime_${propCommunityId}_${channelToken}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'community_members', filter: `community_id=eq.${propCommunityId}` },
        () => {
          loadData()
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        () => {
          loadData()
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [propCommunityId, propUserRole])

  async function handleToggleMod(member: Member) {
    if (!community) return
    const targetRole = member.role === 'moderator' ? 'member' : 'moderator'
    setActionUserId(member.user_id)
    const result = await updateMemberRole(community.id, member.user_id, targetRole)
    setActionUserId(null)
    if (result?.error) {
      alert(result.error)
    } else {
      loadData()
    }
  }

  async function handleKick(member: Member) {
    if (!community) return
    const confirmKick = confirm(`@${member.profiles.username} kullanıcısını topluluktan çıkarmak istediğinize emin misiniz?`)
    if (!confirmKick) return

    setActionUserId(member.user_id)
    const result = await removeMember(community.id, member.user_id)
    setActionUserId(null)
    if (result?.error) {
      alert(result.error)
    } else {
      loadData()
    }
  }

  if (loading) {
    return (
      <aside className="h-full py-6 px-4 flex flex-col gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-card border border-border rounded-2xl p-4 animate-pulse">
            <div className="h-4 bg-muted rounded w-2/3 mb-3" />
            <div className="h-3 bg-muted rounded w-full mb-2" />
            <div className="h-3 bg-muted rounded w-4/5" />
          </div>
        ))}
      </aside>
    )
  }

  if (!community) return null

  const isOwner = role === 'owner'
  const isMod = role === 'moderator'
  const isAdmin = isOwner || isMod

  return (
    <aside className="h-full py-6 px-4 flex flex-col gap-4 overflow-y-auto">
      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 p-1 bg-card/60 backdrop-blur-md border border-border rounded-2xl shadow-sm flex-shrink-0">
        <button
          onClick={() => setActiveTab('about')}
          className={cn(
            "flex-1 py-2 text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer",
            activeTab === 'about'
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Hakkında
        </button>
        <button
          onClick={() => setActiveTab('members')}
          className={cn(
            "flex-1 py-2 text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer",
            activeTab === 'members'
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Üyeler ({memberCount})
        </button>
      </div>

      {activeTab === 'about' ? (
        <>
          {/* About Panel */}
          <div className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground">Topluluk Hakkında</h2>
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                style={{
                  background: community.type === 'public' ? 'color-mix(in oklch, var(--primary) 12%, transparent)' : 'color-mix(in oklch, var(--owner-color) 12%, transparent)',
                  color: community.type === 'public' ? 'var(--primary)' : 'var(--owner-color)',
                  border: community.type === 'public' ? '1px solid color-mix(in oklch, var(--primary) 25%, transparent)' : '1px solid color-mix(in oklch, var(--owner-color) 25%, transparent)',
                }}
              >
                {community.type === 'public' ? <><Globe size={9} /> Açık</> : <><Lock size={9} /> Başvurulu</>}
              </span>
            </div>
            <div>
              <p className="text-base font-black text-foreground mb-1">{community.name}</p>
              {(() => {
                const parsed = parseCommunityDescription(community.description)
                return parsed.description ? (
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {parsed.description}
                  </p>
                ) : null
              })()}
            </div>

            {/* Standard Stats */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-muted/40 border border-border/40 rounded-xl p-3">
                <div className="flex items-center gap-1 text-muted-foreground mb-1"><Users size={12} /><span className="text-[11px] font-medium">Üyeler</span></div>
                <p className="text-lg font-black text-foreground">{memberCount.toLocaleString('tr-TR')}</p>
              </div>
              <div className="bg-muted/40 border border-border/40 rounded-xl p-3">
                <div className="flex items-center gap-1 text-muted-foreground mb-1"><TrendingUp size={12} /><span className="text-[11px] font-medium">Haftalık Büyüme</span></div>
                <p className="text-lg font-black text-foreground">+{stats?.newMembersThisWeek ?? Math.floor(memberCount * 0.05)}</p>
              </div>
            </div>
          </div>

          {/* Admin Detail Stats Panel */}
          {isAdmin && stats && (
            <div className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-3 flex-shrink-0">
              <div className="flex items-center gap-1.5 border-b border-border/60 pb-2 mb-1">
                <ShieldCheck size={14} className="text-primary" />
                <h3 className="text-xs font-bold text-foreground">Yönetici İstatistikleri</h3>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary ml-auto">Yönetici</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-muted/30 border border-border/30 rounded-xl p-2.5 text-center">
                  <FileText size={14} className="mx-auto mb-1 text-muted-foreground" />
                  <p className="text-base font-black text-foreground">{stats.postCount}</p>
                  <p className="text-[9px] text-muted-foreground font-semibold">Gönderi</p>
                </div>
                <div className="bg-muted/30 border border-border/30 rounded-xl p-2.5 text-center">
                  <Eye size={14} className="mx-auto mb-1 text-muted-foreground" />
                  <p className="text-base font-black text-foreground">{stats.totalPostViews}</p>
                  <p className="text-[9px] text-muted-foreground font-semibold">Görüntülenme</p>
                </div>
                <div className="bg-muted/30 border border-border/30 rounded-xl p-2.5 text-center">
                  <TrendingUp size={14} className="mx-auto mb-1 text-muted-foreground" />
                  <p className="text-base font-black text-foreground">+{stats.newMembersThisWeek}</p>
                  <p className="text-[9px] text-muted-foreground font-semibold">Bu Hafta</p>
                </div>
              </div>
            </div>
          )}

          {/* Rules Panel */}
          <div className="bg-card border border-border rounded-2xl p-4 flex-shrink-0">
            <h2 className="text-sm font-bold text-foreground mb-3">Topluluk Kuralları</h2>
            <ol className="flex flex-col gap-2">
              {(() => {
                const parsed = parseCommunityDescription(community.description)
                const dbRules = community.rules && Array.isArray(community.rules)
                  ? community.rules
                  : parsed.rules
                const displayRules = dbRules.length > 0 
                  ? dbRules 
                  : ['Saygılı ve yapıcı ol', 'Yalnızca ilgili içerik paylaş', 'Spam ve reklam yasaktır', 'Kaynakları atıfla belirt']
                return displayRules.map((rule, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs text-muted-foreground">
                     <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-px" style={{ background: 'color-mix(in oklch, var(--primary) 12%, transparent)', color: 'var(--primary)' }}>{i + 1}</span>
                    {rule}
                  </li>
                ))
              })()}
            </ol>
          </div>
        </>
      ) : (
        /* Members Tab */
        <div className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-3 flex-shrink-0">
          <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2.5 mb-1 flex-wrap">
            <h2 className="text-sm font-bold text-foreground">Topluluk Üyeleri</h2>
            <div className="flex items-center gap-1 p-0.5 bg-muted/40 border border-border/60 rounded-xl select-none">
              <button
                onClick={() => setMemberFilter('all')}
                className={cn(
                  "px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer",
                  memberFilter === 'all'
                    ? "bg-background text-foreground shadow-sm border border-border/20"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Tümü
              </button>
              <button
                onClick={() => setMemberFilter('staff')}
                className={cn(
                  "px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer",
                  memberFilter === 'staff'
                    ? "bg-background text-foreground shadow-sm border border-border/20"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Yöneticiler
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1 divide-y divide-border/60 max-h-[450px] overflow-y-auto pr-1">
            {(() => {
              const filteredMembers = members.filter(m => {
                if (memberFilter === 'all') return true
                return m.role === 'owner' || m.role === 'moderator'
              })

              if (filteredMembers.length === 0) {
                return (
                  <p className="text-xs text-muted-foreground text-center py-8 select-none">
                    Bu rolde üye bulunmamaktadır.
                  </p>
                )
              }

              return filteredMembers.map((m) => {
                const isTargetOwner = m.role === 'owner'
                const isTargetMod = m.role === 'moderator'
                const isSelf = m.user_id === currentUserId

                const canPromoteDemote = isOwner && !isSelf
                const canKick = !isTargetOwner && !isSelf && (isOwner || (isMod && !isTargetMod))
                const isPendingAction = actionUserId === m.user_id

                return (
                  <div key={m.user_id} className="flex items-center gap-2 py-2.5">
                    <Avatar username={m.profiles.username} avatarUrl={m.profiles.avatar_url} updatedAt={m.profiles.updated_at} />

                    <div className="flex-1 min-w-0">
                      <Link href={`/profile/${m.profiles.username}`} className="text-xs font-bold text-foreground hover:text-primary transition-all truncate block">
                        {getDisplayName(m.profiles)}
                      </Link>
                      {getFullName(m.profiles) && (
                        <p className="text-[10px] text-muted-foreground truncate">@{m.profiles.username}</p>
                      )}
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <RoleChip role={m.role} />
                      </div>
                    </div>

                    {/* Admin Actions */}
                    {isAdmin && (canPromoteDemote || canKick) && (
                      <div className="flex items-center gap-1">
                        {isPendingAction ? (
                          <Loader2 size={12} className="animate-spin text-muted-foreground mx-2" />
                        ) : (
                          <>
                            {canPromoteDemote && (
                              <button
                                onClick={() => handleToggleMod(m)}
                                title={isTargetMod ? "Moderatörlüğü Kaldır" : "Moderatör Yap"}
                                className={cn(
                                  "p-1.5 rounded-lg border transition-all cursor-pointer",
                                  isTargetMod
                                    ? "bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20"
                                    : "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                                )}
                              >
                                {isTargetMod ? <ShieldAlert size={12} /> : <UserCheck size={12} />}
                              </button>
                            )}

                            {canKick && (
                              <button
                                onClick={() => handleKick(m)}
                                title="Topluluktan Çıkar"
                                className="p-1.5 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 transition-all cursor-pointer"
                              >
                                <UserMinus size={12} />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            })()}
          </div>
        </div>
      )}
    </aside>
  )
}
