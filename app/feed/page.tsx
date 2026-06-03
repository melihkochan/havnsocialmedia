import { createClient } from '@/lib/supabase/server'
import { MainLayout } from '@/components/layout/MainLayout'
import { cookies } from 'next/headers'
import { PostFeed } from '@/components/havn/PostFeed'
import { FeedPostForm } from '@/components/havn/FeedPostForm'
import { getFeedPosts, getFollowingFeedPosts, getPosts } from '@/lib/actions/posts'
import type { FeedContext } from '@/lib/actions/posts'
import { getSuggestedUsers } from '@/lib/actions/follows'
import { FollowButton } from '@/components/havn/FollowButton'
import { Compass, Users, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { FeedTypeSwitcher } from '@/components/havn/FeedTypeSwitcher'
import { enrichProfile, shouldShowXp } from '@/lib/profile-enrich'
import { ProfileName } from '@/components/havn/ProfileName'
import { getCommunities } from '@/lib/actions/communities'
import { FeedOnboarding } from '@/components/havn/FeedOnboarding'

import { getRankInfo } from '@/lib/gamification'
import { t } from '@/lib/i18n'
import { getServerLocale } from '@/lib/i18n/server'

export async function generateMetadata() {
  const locale = await getServerLocale()
  return {
    title: `${t('feed.title', locale)} — HAVN`,
    description: t('feed.subtitle.user', locale),
  }
}

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ sortBy?: string; communityId?: string; feedType?: 'for_you' | 'following'; tag?: string }>
}

export default async function FeedPage({ searchParams }: PageProps) {
  const locale = await getServerLocale()
  const { sortBy = 'new', communityId, feedType, tag } = await searchParams
  const activeSort = sortBy === 'popular' ? 'popular' : 'new'

  const supabase = await createClient()

  // Step 1: auth
  const { data: { user } } = await supabase.auth.getUser()

  // Step 2: Parallel fetch user data (profile, community memberships joined with community details, and suggested users)
  const [profileResult, membershipsResult, suggestedUsers, followingCountResult, communitiesList] = user
    ? await Promise.all([
        supabase
          .from('profiles')
          .select('id, username, first_name, last_name, avatar_url, banner_url, bio, updated_at, is_verified, is_gold, default_feed_type, xp, role')
          .eq('id', user.id)
          .single(),
        supabase
          .from('community_members')
          .select('community_id, role, communities(id, name, slug, description, type)')
          .eq('user_id', user.id)
          .eq('status', 'approved'),
        getSuggestedUsers(),
        supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('follower_id', user.id),
        getCommunities(),
      ])
    : [{ data: null }, { data: [] }, [], { count: 0 }, []]

  const profileRaw = profileResult.data
  const profile = enrichProfile(profileRaw)

  let activeFeedType: 'for_you' | 'following' = 'for_you'
  if (feedType === 'following' || feedType === 'for_you') {
    activeFeedType = feedType
  } else if (profile && profile.default_feed_type) {
    activeFeedType = profile.default_feed_type
  }

  const memberships = membershipsResult.data ?? []
  const rolesByCommunityId = Object.fromEntries(
    memberships.map((m: any) => [m.community_id, m.role])
  ) as Record<string, 'owner' | 'moderator' | 'member'>

  // Extract user's joined communities directly from the memberships query
  const userCommunities = memberships
    .map((m: any) => m.communities)
    .filter(Boolean) as { id: string; name: string }[]

  const cookieStore = await cookies()
  const onboardingActiveCookie = cookieStore.get('havn_onboarding_active')?.value
  const followingCount = followingCountResult?.count ?? 0
  const isNewUserOnboarding = 
    onboardingActiveCookie === 'true' || 
    (onboardingActiveCookie !== 'false' && !!user && followingCount === 0 && userCommunities.length === 0)

  // Step 3: Fetch posts (personalized, community-based, or all)
  const posts = (communityId && !isNewUserOnboarding)
    ? await getPosts(communityId, activeSort)
    : (isNewUserOnboarding
        ? []
        : (tag
            ? await getFeedPosts(undefined, activeSort, tag)
            : (user && activeFeedType === 'following'
                ? await getFollowingFeedPosts(user.id, activeSort)
                : await getFeedPosts(undefined, activeSort))))


  return (
    <MainLayout currentUser={profile}>
      <div className="flex flex-col gap-5 w-full">
        {/* Feed Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))',
                color: 'var(--primary-foreground)',
              }}
            >
              <Compass size={20} />
            </div>
            <div className="flex flex-col min-w-0">
              <h1 className="text-lg font-black text-foreground truncate">
                {tag ? `#${tag}` : t('feed.title', locale)}
              </h1>
              <p className="text-xs text-muted-foreground truncate sm:whitespace-normal flex items-center gap-2">
                {tag ? (
                  <>
                    <span>{t('feed.tag_filter', locale)}</span>
                    <Link 
                      href="/feed" 
                      className="text-[10px] bg-primary/10 text-primary border border-primary/25 hover:bg-primary/20 px-2 py-0.5 rounded-full font-black uppercase transition-all select-none cursor-pointer"
                    >
                      {t('feed.clear', locale)}
                    </Link>
                  </>
                ) : (
                  user ? t('feed.subtitle.user', locale) : t('feed.subtitle.public', locale)
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 select-none flex-wrap flex-shrink-0">
            {/* Feed Type Switcher (only when logged in and no community context) */}
            {user && !communityId && (
              <FeedTypeSwitcher activeFeedType={activeFeedType} activeSort={activeSort} />
            )}

            {/* Sort Tabs */}
            <div className="flex items-center gap-1 p-1 bg-card/60 backdrop-blur-md border border-border/80 rounded-2xl shadow-sm">
              <Link
                href={communityId 
                  ? `/feed?communityId=${communityId}&sortBy=new` 
                  : `/feed?feedType=${activeFeedType}&sortBy=new`}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all duration-200 ${
                  activeSort === 'new'
                    ? 'text-white shadow-md font-black'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                style={activeSort === 'new' ? { background: 'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))' } : {}}
              >
                {t('feed.sort.new', locale)}
              </Link>
              <Link
                href={communityId 
                  ? `/feed?communityId=${communityId}&sortBy=popular` 
                  : `/feed?feedType=${activeFeedType}&sortBy=popular`}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all duration-200 ${
                  activeSort === 'popular'
                    ? 'text-white shadow-md font-black'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                style={activeSort === 'popular' ? { background: 'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))' } : {}}
              >
                {t('feed.sort.popular', locale)}
              </Link>
            </div>
          </div>
        </div>

        {/* Horizontal Community Tabs (Twitter/Instagram style navigation) */}
        {user && (
          <div className="flex items-center gap-2 pb-2.5 overflow-x-auto scrollbar-none border-b border-border/40 w-full select-none">
            {/* Main Feed Tab */}
            <Link
              href={`/feed?feedType=${activeFeedType}&sortBy=${activeSort}`}
              className={`px-4 py-2 text-xs font-black rounded-full whitespace-nowrap transition-all duration-300 border flex items-center gap-1.5 shadow-sm ${
                !communityId
                  ? 'border-transparent text-white shadow-md'
                  : 'border-border/50 text-muted-foreground hover:text-foreground bg-card/40 hover:bg-card/85'
              }`}
              style={!communityId ? { background: 'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))' } : {}}
            >
              <span>🏠</span> {t('feed.main_stream', locale)}
            </Link>

            {/* Joined Communities Tabs */}
            {userCommunities.map((comm) => {
              const isActive = communityId === comm.id
              return (
                <Link
                  key={comm.id}
                  href={`/feed?communityId=${comm.id}&sortBy=${activeSort}`}
                  className={`px-4 py-2 text-xs font-black rounded-full whitespace-nowrap transition-all duration-300 border flex items-center gap-1.5 shadow-sm ${
                    isActive
                      ? 'border-transparent text-white shadow-md'
                      : 'border-border/50 text-muted-foreground hover:text-foreground bg-card/40 hover:bg-card/85'
                  }`}
                  style={isActive ? { background: 'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))' } : {}}
                >
                  <span>👥</span> {comm.name}
                </Link>
              )
            })}
          </div>
        )}

        {isNewUserOnboarding ? (
          <FeedOnboarding
            suggestedUsers={suggestedUsers as any}
            suggestedCommunities={communitiesList as any}
          />
        ) : (
          <>
            {/* Active Tag Filter Banner */}
            {tag && (
              <div className="relative overflow-hidden bg-primary/5 border border-primary/20 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-fade-in flex-shrink-0">
                {/* Background decorative elements */}
                <div className="absolute -top-12 -right-12 w-24 h-24 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute -bottom-12 -left-12 w-24 h-24 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

                <div className="flex items-center gap-3.5 z-10 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center flex-shrink-0 shadow-inner font-mono font-black text-lg">
                    #
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black text-primary/70 uppercase tracking-widest">{t('feed.tag_filter_title', locale)}</p>
                    <h2 className="text-sm font-black text-foreground truncate mt-0.5">{t('feed.tag_filter', locale, { tag })}</h2>
                  </div>
                </div>

                <Link 
                  href="/feed"
                  className="relative z-10 px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl bg-primary text-primary-foreground hover:bg-primary/95 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shadow-md flex-shrink-0 cursor-pointer"
                >
                  {t('feed.clear_filter', locale)} ❌
                </Link>
              </div>
            )}

            {/* Post Form */}
            {profile && (
              <FeedPostForm
                communities={userCommunities}
                currentUser={{ username: profile.username, avatar_url: profile.avatar_url }}
                defaultCommunityId={communityId}
              />
            )}

            {/* Divider */}
            <div className="flex items-center gap-3 mt-1">
              <div className="flex-1 border-t border-border" />
              <span className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">
                {activeSort === 'popular' ? t('feed.posts.popular', locale) : t('feed.posts.recent', locale)}
              </span>
              <div className="flex-1 border-t border-border" />
            </div>

            {/* Post Feed or Empty State */}
            {posts.length > 0 ? (
              <PostFeed
                posts={posts as Parameters<typeof PostFeed>[0]['posts']}
                currentUserId={user?.id}
                rolesByCommunityId={user ? rolesByCommunityId : undefined}
                communityId={communityId}
                feedContext={
                  communityId
                    ? ({ type: 'community', communityId, sortBy: activeSort } satisfies FeedContext)
                    : tag
                    ? ({ type: 'feed', sortBy: activeSort, tag } satisfies FeedContext)
                    : activeFeedType === 'following' && user
                    ? ({ type: 'following', userId: user.id, sortBy: activeSort } satisfies FeedContext)
                    : ({ type: 'feed', sortBy: activeSort } satisfies FeedContext)
                }
                initialHasMore={posts.length >= 10}
              />
            ) : (
              <>
                {/* Suggested Users Fallback for Empty Main Feed */}
                {user && !communityId && (
                  <div className="w-full bg-[#090912]/65 border border-border/60 rounded-3xl p-6 sm:p-8 flex flex-col items-center gap-6 shadow-xl backdrop-blur-md relative overflow-hidden">
                    {/* Background decorative blob */}
                    <div className="absolute -top-24 -left-24 w-48 h-48 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg text-white relative z-10"
                      style={{
                        background: 'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))',
                      }}
                    >
                      <Sparkles size={28} className="animate-pulse" />
                    </div>
                    
                    <div className="space-y-2 max-w-md relative z-10 text-center">
                      <h2 className="text-lg font-black text-white tracking-tight">{t('feed.empty_feed.title', locale)}</h2>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {t('feed.empty_feed.desc', locale)}
                      </p>
                    </div>

                    {suggestedUsers.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full mt-4 relative z-10">
                        {suggestedUsers.map((sUser) => {
                          const initials = sUser.username.slice(0, 2).toUpperCase()
                          const followsYou = sUser.relation === 'follows_you'
                          const lvl = getRankInfo(sUser.xp ?? 0).level

                          return (
                            <div 
                              key={sUser.id} 
                              className="relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] p-4 flex flex-col items-center text-center transition-all duration-300 hover:border-violet-500/25 hover:bg-white/[0.04] group min-h-[190px] justify-between"
                            >
                              {/* Banner card-top gradient simulation */}
                              <div className="absolute top-0 inset-x-0 h-12 bg-gradient-to-r from-violet-600/10 via-indigo-600/10 to-violet-600/10 opacity-60 group-hover:opacity-100 transition-opacity" />

                              {/* Avatar block */}
                              <div className="relative mt-2 z-10">
                                {sUser.avatar_url ? (
                                  <img 
                                    src={sUser.avatar_url} 
                                    alt={sUser.username} 
                                    className="w-14 h-14 rounded-xl object-cover ring-2 ring-white/10 group-hover:ring-violet-500/30 transition-all duration-300 shadow-md" 
                                  />
                                ) : (
                                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white flex items-center justify-center font-black text-base ring-2 ring-white/10 group-hover:ring-violet-500/30 transition-all duration-300 shadow-md">
                                    {initials}
                                  </div>
                                )}
                                {/* Level indicator absolute bubble */}
                                {shouldShowXp(sUser) && (
                                  <span 
                                    className="absolute -bottom-1.5 -right-1.5 px-1.5 py-0.5 rounded border border-white/5 bg-slate-900 text-[8px] font-mono font-bold text-slate-400"
                                    title={locale === 'tr' ? `Seviye ${lvl}` : `Level ${lvl}`}
                                  >
                                    Lv.{lvl}
                                  </span>
                                )}
                              </div>

                              {/* Info block */}
                              <div className="space-y-1 mt-3 w-full flex-1">
                                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                  <span className="text-xs font-bold text-white group-hover:text-violet-300 transition-colors">
                                    {sUser.first_name ? `${sUser.first_name} ${sUser.last_name || ''}` : sUser.username}
                                  </span>
                                  {sUser.is_verified && (
                                    <span className="text-blue-400 text-[10px] flex-shrink-0" title={t('feed.verified_account', locale)}>✓</span>
                                  )}
                                  {sUser.is_gold && (
                                    <span className="text-amber-400 text-[10px] flex-shrink-0" title={t('feed.partner_account', locale)}>★</span>
                                  )}
                                </div>

                                <p className="text-[10px] text-slate-500 font-mono">@{sUser.username}</p>

                                {followsYou && (
                                  <div className="pt-0.5">
                                    <span className="inline-block px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/25 text-[8px] font-black uppercase tracking-wider select-none">
                                      {t('feed.follows_you', locale)}
                                    </span>
                                  </div>
                                )}

                                {sUser.bio && (
                                  <p className="text-[10px] text-slate-400 leading-snug line-clamp-2 px-2 max-w-[220px] mx-auto select-none mt-1.5 break-words">
                                    {sUser.bio.split('\u200B')[0]}
                                  </p>
                                )}
                              </div>

                              {/* Action Button */}
                              <div className="w-full mt-3.5 flex justify-center">
                                <FollowButton 
                                  targetUserId={sUser.id} 
                                  initialIsFollowing={sUser.relation === 'requested' ? 'requested' : 'none'} 
                                  className="w-full max-w-[140px] py-1.5 text-[9px] font-black uppercase tracking-wider justify-center" 
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Empty Community Feed Notice */}
                {communityId && (
                  <div className="bg-card/40 border border-border/60 rounded-3xl p-8 flex flex-col items-center text-center gap-3.5 shadow-sm backdrop-blur-md">
                    <Users size={32} className="text-muted-foreground/60" />
                    <div className="space-y-1">
                      <h2 className="text-sm font-bold text-foreground">{t('feed.empty_community.title', locale)}</h2>
                      <p className="text-xs text-muted-foreground max-w-xs">
                        {t('feed.empty_community.desc', locale)}
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </MainLayout>
  )
}
