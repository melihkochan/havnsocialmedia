import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MainLayout } from '@/components/layout/MainLayout'
import Link from 'next/link'
import { PostFeed } from '@/components/havn/PostFeed'
import type { FeedContext } from '@/lib/actions/posts'
import { RoleBadge } from '@/components/havn/RoleBadge'
import { ProfileViewTracker } from '@/components/havn/ViewTracker'
import { CalendarDays, Users, Eye, Heart, MessageSquare, Lock, BadgeCheck } from 'lucide-react'
import { enrichProfile } from '@/lib/profile-enrich'
import { MuteProfileButton } from '@/components/havn/MuteProfileButton'
import { getDisplayName, getFullName, getInitials, getOnlineStatus } from '@/lib/profile-display'
import { cn } from '@/lib/utils'
import { getRankInfo } from '@/lib/gamification'

const Twitter = ({ size = 16, className = "" }: { size?: number; className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
  </svg>
)

const Instagram = ({ size = 16, className = "" }: { size?: number; className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
)

const Github = ({ size = 16, className = "" }: { size?: number; className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
)

import { sortPostsWithPinned } from '@/lib/sort-posts'
import { FeedPostForm } from '@/components/havn/FeedPostForm'
import { isFounder } from '@/lib/founder'
import { FollowButton } from '@/components/havn/FollowButton'
import { FollowStatsModal } from '@/components/havn/FollowStatsModal'
import { InteractiveAvatar } from '@/components/havn/InteractiveAvatar'
import { getUserSupportTickets } from '@/lib/actions/support'
import { AdminControlsDropdown } from '@/components/havn/AdminControlsDropdown'
import { ProfileTabsClient } from '@/components/havn/ProfileTabsClient'

export const dynamic = 'force-dynamic'

export default async function ProfilePage({
  params,
  searchParams
}: {
  params: Promise<{ username: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { username } = await params
  const { tab = 'posts' } = await searchParams
  const supabase = await createClient()

  // === SINGLE CLIENT — ALL QUERIES USE THIS ===

  // Step 1: auth + target profile (parallel)
  const [{ data: { user } }, { data: profileResultRow, error }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('profiles').select('*').eq('username', username).single(),
  ])

  if (error || !profileResultRow) {
    notFound()
  }

  const profile = enrichProfile(profileResultRow)!
  const rank = getRankInfo(profile.xp ?? 0)

  // Step 2: ALL remaining data in ONE parallel batch
  const [
    currentProfileResult,
    { data: posts },
    { data: rawMemberships },
    { count: profileViews },
    followersResult,
    followingResult,
    followToTargetResult,
    followToUserResult,
    suggestionsResultRow,
  ] = await Promise.all([
    user
      ? supabase.from('profiles').select('*').eq('id', user.id).single()
      : Promise.resolve({ data: null }),
    // Posts inline — NO separate createClient (limit to first 20 for performance)
    supabase
      .from('posts')
      .select('*, profiles(*), likes(user_id), comments(id), bookmarks(user_id), communities(name, slug), parent_post:parent_post_id(*, profiles(*), likes(user_id), comments(id))')
      .eq('user_id', profile.id)
      .is('community_id', null)
      .order('created_at', { ascending: false })
      .range(0, 19),
    // Memberships
    supabase
      .from('community_members')
      .select('community_id, role, status')
      .eq('user_id', profile.id)
      .eq('status', 'approved'),
    // View count inline — NO separate createClient
    supabase
      .from('profile_views')
      .select('*', { count: 'exact', head: true }).eq('profile_id', profile.id),
    // Followers count inline
    supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', profile.id),
    // Following count inline
    supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', profile.id),
    user ? supabase.from('follows').select('created_at').eq('follower_id', user.id).eq('following_id', profile.id).maybeSingle() : Promise.resolve({ data: null }),
    user ? supabase.from('follows').select('created_at').eq('follower_id', profile.id).eq('following_id', user.id).maybeSingle() : Promise.resolve({ data: null }),
    supabase
      .from('suggestions')
      .select(`
        *,
        suggestion_votes (
          vote_type,
          user_id
        )
      `)
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false }),
  ])

  const followToTarget = followToTargetResult.data
  const followToUser = followToUserResult.data

  // Calculate follow status and stats directly from query results
  const isFollowing = !!followToTarget
  const isRequested = !isFollowing && user && profile.follow_requests?.includes(user.id)
  const followStatus = isFollowing ? 'following' : (isRequested ? 'requested' : 'none')

  const followStats = {
    followersCount: followersResult.count ?? 0,
    followingCount: followingResult.count ?? 0
  }

  const currentProfileRaw = currentProfileResult.data
  const currentProfile = enrichProfile(currentProfileRaw)
  const isOwnProfile = user?.id === profile.id
  const isFollowingTarget = followStatus === 'following'
  const isLocked = profile.is_private && !isOwnProfile && !isFollowingTarget

  let relationInfo: { date?: string; text: string } | null = null
  if (user && user.id !== profile.id) {
    if (followToTarget && followToUser) {
      const date = new Date(followToTarget.created_at || followToUser.created_at)
      const formattedDate = date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
      relationInfo = { date: formattedDate, text: 'tarihinden beri takipleşiyorsunuz' }
    } else if (followToTarget) {
      const date = new Date(followToTarget.created_at)
      const formattedDate = date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
      relationInfo = { date: formattedDate, text: 'tarihinden beri takip ediyorsun' }
    } else if (followToUser) {
      relationInfo = { text: 'Seni takip ediyor' }
    }
  }

  const onlineStatus = getOnlineStatus(profile)

  // Unwrap parent_post (Supabase may return it as array or object)
  const allPosts = (posts ?? []).map((p: any) => {
    const rawParent = p.parent_post
    const parent_post = Array.isArray(rawParent)
      ? (rawParent.length > 0 ? rawParent[0] : null)
      : rawParent ?? null
    return { ...p, parent_post }
  })

  // Step 3: community names (only if has memberships)
  const communityIds = (rawMemberships ?? []).map((m: { community_id: string }) => m.community_id)
  const { data: comms } = communityIds.length > 0
    ? await supabase.from('communities').select('id, name, slug').in('id', communityIds)
    : { data: [] as { id: string; name: string; slug: string }[] }

  const commMap = new Map((comms ?? []).map((c: { id: string; name: string; slug: string }) => [c.id, c]))
  const memberships = (rawMemberships ?? []).map((m: { community_id: string; role: string }) => ({
    ...m,
    community: commMap.get(m.community_id) ?? null,
  }))

  const sortedPosts = isLocked ? [] : sortPostsWithPinned(allPosts.filter((p: any) => !p.content?.includes('\u200B[anlar]') && !p.content?.includes('\u200B[kadraj]')))
  const postCount = sortedPosts.length
  const communityCount = memberships.length

  const isCurrentFounder = currentProfile ? isFounder(currentProfile) : false
  const userTickets = isCurrentFounder ? await getUserSupportTickets(profile.id) : []

  const userSuggestionsRaw = suggestionsResultRow?.data || []
  const userSuggestions = userSuggestionsRaw.map((item: any) => {
    const votes = item.suggestion_votes || []
    let score = 0
    let userVote = 0

    votes.forEach((v: any) => {
      score += v.vote_type
      if (user && v.user_id === user.id) {
        userVote = v.vote_type
      }
    })

    return {
      ...item,
      score,
      userVote,
      voteCount: votes.length,
      profiles: profile,
    }
  })

  return (
    <MainLayout currentUser={currentProfile}>
      <ProfileViewTracker profileId={profile.id} />
      <div className="flex flex-col gap-6 w-full">
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div
            className="h-32 relative"
            style={{
              backgroundImage: profile.banner_url
                ? `url(${profile.banner_url}?t=${new Date(profile.updated_at).getTime()})`
                : `linear-gradient(135deg, var(--havn-gradient-start) 0%, var(--havn-gradient-end) 100%)`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            {!profile.banner_url && (
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`, backgroundSize: '24px 24px' }} />
            )}
          </div>
          <div className="px-6 pb-6">
            <div className="flex items-end justify-between -mt-12 mb-4">
              <div className="relative z-10 flex items-end gap-2.5">
                <InteractiveAvatar
                  initials={getInitials(profile)}
                  username={profile.username}
                  avatarUrl={profile.avatar_url}
                  updatedAt={profile.updated_at}
                  size="lg"
                  showStatus={onlineStatus.status === 'online'}
                  level={rank.level}
                />
                
                {/* Real-time Online/Offline status badge next to avatar */}
                {!isOwnProfile && onlineStatus && (
                  <span className={cn(
                    "mb-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[8px] font-black select-none uppercase tracking-wider border shadow-sm",
                    onlineStatus.status === 'online'
                      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/25 animate-pulse'
                      : 'bg-muted/40 text-muted-foreground border-border/40'
                  )}>
                    {onlineStatus.status === 'online' ? '● Çevrimiçi' : onlineStatus.text}
                  </span>
                )}
              </div>
              <div className="flex flex-col items-end relative">
                {isOwnProfile ? (
                  <a href="/settings" className="px-4 py-2 rounded-xl border border-border text-xs font-bold text-foreground hover:bg-accent transition-all select-none">Profili Düzenle</a>
                ) : (
                  user && (
                    <div className="flex gap-2 items-center">
                      {isCurrentFounder && (
                        <AdminControlsDropdown targetProfile={profile} />
                      )}
                      <FollowButton targetUserId={profile.id} initialIsFollowing={followStatus} />
                      <MuteProfileButton username={profile.username} />
                    </div>
                  )
                )}

                {/* Modern Relation Text */}
                {!isOwnProfile && relationInfo && (
                  <div className="absolute top-11 right-0 flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/5 border border-primary/10 text-[10px] font-semibold text-muted-foreground select-none whitespace-nowrap">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    {relationInfo.date ? (
                      <span>
                        <span className="text-primary font-black">{relationInfo.date}</span>{' '}
                        {relationInfo.text}
                      </span>
                    ) : (
                      <span>{relationInfo.text}</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1 mb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-black text-foreground flex items-center gap-1.5">
                  {getDisplayName(profile)}
                  {(profile.is_gold || isFounder(profile)) && (
                    <span className="flex-shrink-0 align-middle inline-flex cursor-help" title="Özel Hesap / Sistem Ortağı: HAVN ekibine veya resmi iş ortaklarına aittir.">
                      <BadgeCheck size={18} className="fill-[#eab308] text-background drop-shadow-[0_0_4px_rgba(234,179,8,0.5)]" />
                    </span>
                  )}
                  {!(profile.is_gold || isFounder(profile)) && profile.is_verified && (
                    <span className="flex-shrink-0 align-middle inline-flex cursor-help" title="Doğrulanmış Üye: HAVN topluluğunun aktif ve onaylanmış bir üyesidir.">
                      <BadgeCheck size={18} className="fill-[#0ea5e9] text-background drop-shadow-[0_0_4px_rgba(14,165,233,0.5)]" />
                    </span>
                  )}
                </h1>
                {isFounder(profile) && (
                  <span
                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-black tracking-wider shadow-sm bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-white border border-amber-600/30 select-none"
                    title="Sistem Kurucusu"
                  >
                    👑 KURUCU
                  </span>
                )}
              </div>
              {getFullName(profile) && (
                <p className="text-xs text-muted-foreground">@{profile.username}</p>
              )}
              {profile.bio && <p className="text-xs text-muted-foreground leading-relaxed pt-1">{profile.bio}</p>}
            </div>

            <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1.5"><CalendarDays size={14} className="opacity-70" />{new Date((profile as any).created_at || profile.updated_at).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })} katıldı</span>
              <span className="flex items-center gap-1.5"><Users size={14} className="opacity-70" />{communityCount} topluluk</span>
              <span className="flex items-center gap-1.5"><Eye size={14} className="opacity-70" />{profileViews ?? 0} görüntülenme</span>
            </div>

            {/* Gamification Level & XP Progress Card */}
            {profile.xp !== undefined && (
              <div className={cn(
                "mt-5 p-4 rounded-2xl border shadow-sm backdrop-blur-md relative overflow-hidden group transition-all duration-300",
                rank.level >= 31 ? "level-card-gold text-amber-900 dark:text-amber-100" :
                rank.level >= 16 ? "level-card-purple text-purple-900 dark:text-purple-100" :
                rank.level >= 6 ? "level-card-emerald bg-emerald-500/5 dark:bg-emerald-500/[0.02] border-emerald-500/20" :
                "bg-card border-border/80"
              )}>
                {/* Background subtle glowing effect */}
                <div 
                  className="absolute -right-10 -bottom-10 w-32 h-32 rounded-full opacity-[0.03] group-hover:opacity-[0.06] blur-2xl transition-opacity duration-500 pointer-events-none"
                  style={{
                    background: rank.level >= 31 ? 'radial-gradient(circle, #f59e0b 0%, transparent 70%)' :
                                rank.level >= 16 ? 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' :
                                'radial-gradient(circle, var(--primary) 0%, transparent 70%)'
                  }}
                />
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "px-2 py-0.5 rounded-lg text-[9px] font-black tracking-wider border uppercase shadow-sm select-none",
                      rank.badgeClass
                    )} style={rank.badgeStyle}>
                      SEVİYE {rank.level}
                    </span>
                    <span className={cn(
                      "text-xs font-black flex items-center gap-1",
                      rank.level >= 31 ? "gold-shimmer-text" :
                      rank.level >= 16 ? "purple-shimmer-text" :
                      rank.level >= 6 ? "text-emerald-600 dark:text-emerald-400" :
                      "text-foreground"
                    )}>
                      {rank.rankName}
                    </span>
                  </div>
                  <span className={cn(
                    "text-[10px] font-black px-2 py-0.5 rounded-md border",
                    rank.level >= 31 ? "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400" :
                    rank.level >= 16 ? "bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400" :
                    rank.level >= 6 ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400" :
                    "bg-primary/5 border-primary/10 text-primary"
                  )}>
                    {profile.xp} XP
                  </span>
                </div>
                {/* Progress Bar Container */}
                <div className="w-full h-2 rounded-full bg-muted/70 overflow-hidden relative border border-border/30">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-1000 ease-out",
                      rank.level >= 31 ? "bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600" :
                      rank.level >= 16 ? "bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500" :
                      rank.level >= 6 ? "bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600" :
                      "bg-gradient-to-r from-[#8b5cf6] via-[#ec4899] to-[#f97316]"
                    )}
                    style={{ width: `${rank.progressPercent}%` }}
                  />
                </div>
                <div className="flex justify-between items-center mt-2 text-[9px] text-muted-foreground font-semibold">
                  <span>Mevcut Seviye</span>
                  <span>Sonraki seviyeye {rank.xpNeededForNext} XP kaldı</span>
                </div>
              </div>
            )}



            {/* Sosyal Medya Bağlantıları */}
            {profile.social_links && (profile.social_links.twitter || profile.social_links.instagram || profile.social_links.github) && (
              <div className="flex flex-wrap gap-2.5 mt-4 pt-3.5 border-t border-border/40 select-none">
                {profile.social_links.twitter && (
                  <a
                    href={`https://x.com/${profile.social_links.twitter}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-sky-500/20 bg-sky-500/5 hover:bg-sky-500/10 text-xs font-bold text-sky-400 hover:text-sky-300 transition-all select-none hover:scale-[1.02]"
                  >
                    <Twitter size={14} />
                    <span>@{profile.social_links.twitter}</span>
                  </a>
                )}
                {profile.social_links.instagram && (
                  <a
                    href={`https://instagram.com/${profile.social_links.instagram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-pink-500/20 bg-pink-500/5 hover:bg-pink-500/10 text-xs font-bold text-pink-400 hover:text-pink-300 transition-all select-none hover:scale-[1.02]"
                  >
                    <Instagram size={14} />
                    <span>@{profile.social_links.instagram}</span>
                  </a>
                )}
                {profile.social_links.github && (
                  <a
                    href={`https://github.com/${profile.social_links.github}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-border bg-muted/40 hover:bg-muted/70 text-xs font-bold text-foreground transition-all select-none hover:scale-[1.02] hover:border-foreground/20"
                  >
                    <Github size={14} />
                    <span>@{profile.social_links.github}</span>
                  </a>
                )}
              </div>
            )}

            <FollowStatsModal
              profileId={profile.id}
              currentUserId={user?.id}
              postCount={postCount}
              initialFollowersCount={followStats.followersCount}
              initialFollowingCount={followStats.followingCount}
              profileViews={profileViews}
              isOwnProfile={isOwnProfile}
            />

            {memberships.length > 0 && (
              <div className="mt-5 pt-5 border-t border-border/40">
                <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3">Topluluklar</h2>
                <div className="flex flex-wrap gap-2">
                  {memberships.map((m) => {
                    if (!m.community) return null
                    return (
                      <a
                        key={m.community.id}
                        href={`/communities/${m.community.slug}`}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-border/80 bg-muted/20 hover:bg-muted/40 text-xs font-bold text-foreground transition-all cursor-pointer"
                      >
                        {m.community.name}
                        {m.role === 'owner' && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-black text-amber-500 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-md ml-1 select-none">
                            👑 KURUCU
                          </span>
                        )}
                        {m.role === 'moderator' && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-black text-[#8b5cf6] bg-[#8b5cf6]/10 border border-[#8b5cf6]/20 px-1.5 py-0.5 rounded-md ml-1 select-none">
                            🎨 MOD
                          </span>
                        )}
                      </a>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {!isLocked && tab !== 'tickets' && tab !== 'suggestions' && isOwnProfile && currentProfile && (
          <FeedPostForm
            communities={(comms ?? []).map(c => ({ id: c.id, name: c.name }))}
            currentUser={{ username: currentProfile.username, avatar_url: currentProfile.avatar_url }}
          />
        )}

        {/* Tab Switcher */}
        {!isLocked && isCurrentFounder && (
          <div className="flex items-center gap-1.5 p-1 bg-card/40 border border-border/60 rounded-2xl w-fit select-none">
            <Link
              href={`/profile/${username}?tab=posts`}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all duration-200 ${
                tab !== 'tickets' && tab !== 'suggestions'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Gönderiler ({postCount})
            </Link>
            <Link
              href={`/profile/${username}?tab=tickets`}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all duration-200 ${
                tab === 'tickets'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Destek Talepleri ({userTickets.length})
            </Link>
            <Link
              href={`/profile/${username}?tab=suggestions`}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all duration-200 ${
                tab === 'suggestions'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Öneriler ({userSuggestions.length})
            </Link>
          </div>
        )}

        {isLocked ? (
          <div className="bg-card/40 border border-border/60 rounded-3xl p-12 flex flex-col items-center text-center gap-4 shadow-sm backdrop-blur-md">
            <div className="w-16 h-16 rounded-2xl bg-muted/50 border border-border flex items-center justify-center text-muted-foreground shadow-inner">
              <Lock size={24} />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-base font-bold text-foreground">Bu Hesap Gizlidir</h2>
              <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
                Paylaşımları ve etkinlikleri görmek için bu kullanıcıyı takip etmelisiniz.
              </p>
            </div>
          </div>
        ) : tab === 'tickets' && isCurrentFounder ? (
          <ProfileTabsClient
            tickets={userTickets}
            isCurrentFounder={isCurrentFounder}
            profile={profile}
            tab="tickets"
          />
        ) : tab === 'suggestions' && isCurrentFounder ? (
          <ProfileTabsClient
            suggestions={userSuggestions}
            isCurrentFounder={isCurrentFounder}
            profile={profile}
            tab="suggestions"
          />
        ) : tab !== 'tickets' && tab !== 'suggestions' ? (
          <div className="mt-2">
            <h2 className="text-sm font-bold text-foreground mb-4">Gönderiler</h2>
            <PostFeed
              posts={sortedPosts.map(p => ({ ...p, community_members: [{ role: 'member' as const }] })) as Parameters<typeof PostFeed>[0]['posts']}
              currentUserId={user?.id}
              pinContext={isOwnProfile ? 'profile' : undefined}
              profileUserId={profile.id}
              feedContext={{ type: 'profile', profileUserId: profile.id } satisfies FeedContext}
              initialHasMore={(posts?.length ?? 0) >= 20}
            />
          </div>
        ) : null}
      </div>
    </MainLayout>
  )
}
