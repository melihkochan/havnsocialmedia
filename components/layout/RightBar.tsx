'use client'

import { useEffect, useState, startTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Globe, Lock, Users, TrendingUp, ShieldCheck, Crown, ShieldAlert,
  UserMinus, UserCheck, FileText, Eye, Loader2, ArrowRight, Sparkles, Hash
} from 'lucide-react'
import { getCommunityStats } from '@/lib/actions/analytics'
import { updateMemberRole, removeMember } from '@/lib/actions/communities'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { getDisplayName, getFullName } from '@/lib/profile-display'
import { ProfileName } from '@/components/havn/ProfileName'
import { cleanBio } from '@/lib/profile-enrich'
import { getRightBarSuggestions } from '@/lib/actions/follows'
import { parseCommunityDescription } from '@/lib/community-rules'

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

function Avatar({ username, avatarUrl, size = 'sm', updatedAt }: { username: string; avatarUrl: string | null; size?: 'sm' | 'md'; updatedAt?: string }) {
  const sizeCls = size === 'md' ? 'w-10 h-10 text-sm' : 'w-8 h-8 text-xs'
  if (avatarUrl) {
    const finalUrl = updatedAt ? `${avatarUrl}?t=${new Date(updatedAt).getTime()}` : avatarUrl
    return <img src={finalUrl} alt={username} className={cn(sizeCls, "rounded-full object-cover flex-shrink-0 ring-1 ring-border")} />
  }
  return (
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

interface PopularCommunity {
  id: string
  name: string
  slug: string
  type: string
  memberCount: number
}

interface SuggestedUser {
  id: string
  username: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  bio: string | null
  relation?: 'none' | 'following' | 'follows_you' | 'mutual' | 'requested'
}

function GlobalRightBar() {
  const [communities, setCommunities] = useState<PopularCommunity[]>([])
  const [suggested, setSuggested] = useState<SuggestedUser[]>([])
  const [totalMembers, setTotalMembers] = useState(0)
  const [totalCommunities, setTotalCommunities] = useState(0)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      try {
        const [commResult, suggestedUsersList] = await Promise.all([
          supabase
            .from('communities')
            .select('id, name, slug, type')
            .order('created_at', { ascending: false })
            .limit(20),
          getRightBarSuggestions(),
        ])

        const rawComms = commResult.data ?? []
        setTotalCommunities(rawComms.length)

        // Get member counts for each community
        const withCounts = await Promise.all(
          rawComms.slice(0, 6).map(async (c) => {
            const { count } = await supabase
              .from('community_members')
              .select('*', { count: 'exact', head: true })
              .eq('community_id', c.id)
              .eq('status', 'approved')
            return { ...c, memberCount: count ?? 0 }
          })
        )
        withCounts.sort((a, b) => b.memberCount - a.memberCount)
        setCommunities(withCounts.slice(0, 5))
        setTotalMembers(withCounts.reduce((s, c) => s + c.memberCount, 0))
        setSuggested(suggestedUsersList as SuggestedUser[])
      } catch (e) {
        console.error('GlobalRightBar load error:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
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
      <div className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2 mb-1">
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))' }}
          >
            <Sparkles size={12} className="text-primary-foreground" />
          </div>
          <h2 className="text-xs font-black text-foreground uppercase tracking-wider">HAVN İstatistikleri</h2>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-muted/40 border border-border/40 rounded-xl p-3">
            <div className="flex items-center gap-1 text-muted-foreground mb-1">
              <Hash size={11} />
              <span className="text-[11px] font-medium">Topluluklar</span>
            </div>
            <p className="text-lg font-black text-foreground">{totalCommunities}</p>
          </div>
          <div className="bg-muted/40 border border-border/40 rounded-xl p-3">
            <div className="flex items-center gap-1 text-muted-foreground mb-1">
              <Users size={11} />
              <span className="text-[11px] font-medium">Üyeler</span>
            </div>
            <p className="text-lg font-black text-foreground">{totalMembers.toLocaleString('tr-TR')}</p>
          </div>
        </div>
      </div>

      {/* Popular Communities */}
      {communities.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-3">
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
            {communities.map((c, i) => (
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

      {/* Suggested Users */}
      {suggested.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Eye size={13} className="text-primary" />
            <h2 className="text-xs font-black text-foreground uppercase tracking-wider">Keşfet</h2>
          </div>
          <div className="flex flex-col gap-1 divide-y divide-border/40">
            {suggested.map((u: any) => (
              <Link
                key={u.username}
                href={`/profile/${u.username}`}
                className="w-full flex items-center justify-between gap-2.5 py-2.5 hover:opacity-85 transition-opacity group"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <Avatar username={u.username} avatarUrl={u.avatar_url} updatedAt={u.updated_at} />
                  <div className="flex-1 min-w-0">
                    <ProfileName profile={u} layout="stacked" nameClassName="text-xs font-bold" showHandle={true} />
                    {u.bio && <p className="text-[10px] text-muted-foreground truncate mt-0.5">{cleanBio(u.bio)}</p>}
                  </div>
                </div>
                
                {u.relation && u.relation !== 'none' && (
                  <div className="flex-shrink-0 ml-2">
                    {u.relation === 'mutual' && (
                      <span className="inline-flex items-center text-[8px] font-black tracking-wider text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-md select-none uppercase">
                        Takipleşiliyor
                      </span>
                    )}
                    {u.relation === 'following' && (
                      <span className="inline-flex items-center text-[8px] font-black tracking-wider text-sky-500 bg-sky-500/10 border border-sky-500/20 px-1.5 py-0.5 rounded-md select-none uppercase">
                        Takip Ediliyor
                      </span>
                    )}
                    {u.relation === 'follows_you' && (
                      <span className="inline-flex items-center text-[8px] font-black tracking-wider text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded-md select-none uppercase">
                        Seni Takip Ediyor
                      </span>
                    )}
                    {u.relation === 'requested' && (
                      <span className="inline-flex items-center text-[8px] font-black tracking-wider text-muted-foreground bg-muted/40 border border-border/50 px-1.5 py-0.5 rounded-md select-none uppercase animate-pulse">
                        İstek Gönderildi
                      </span>
                    )}
                  </div>
                )}
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
    } catch (err) {
      console.error("RightBar load error:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setLoading(true)
    loadData()
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
      <div className="flex items-center gap-1 p-1 bg-card/60 backdrop-blur-md border border-border rounded-2xl shadow-sm">
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
          <div className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-4">
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
            <div className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-3">
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
          <div className="bg-card border border-border rounded-2xl p-4">
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
        <div className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-3">
          <h2 className="text-sm font-bold text-foreground">Topluluk Üyeleri</h2>

          <div className="flex flex-col gap-1 divide-y divide-border/60 max-h-[450px] overflow-y-auto pr-1">
            {members.map((m) => {
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
            })}
          </div>
        </div>
      )}
    </aside>
  )
}
