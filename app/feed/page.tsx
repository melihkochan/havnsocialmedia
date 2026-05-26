import { createClient } from '@/lib/supabase/server'
import { MainLayout } from '@/components/layout/MainLayout'
import { PostFeed } from '@/components/havn/PostFeed'
import { FeedPostForm } from '@/components/havn/FeedPostForm'
import { getFeedPosts, getFollowingFeedPosts, getPosts } from '@/lib/actions/posts'
import type { FeedContext } from '@/lib/actions/posts'
import { getSuggestedUsers } from '@/lib/actions/follows'
import { FollowButton } from '@/components/havn/FollowButton'
import { Compass, Users, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { FeedTypeSwitcher } from '@/components/havn/FeedTypeSwitcher'
import { enrichProfile } from '@/lib/profile-enrich'

export const metadata = {
  title: 'Anasayfa — HAVN',
  description: 'Topluluklarından gelen son gönderiler.',
}

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ sortBy?: string; communityId?: string; feedType?: 'for_you' | 'following' }>
}

export default async function FeedPage({ searchParams }: PageProps) {
  const { sortBy = 'new', communityId, feedType } = await searchParams
  const activeSort = sortBy === 'popular' ? 'popular' : 'new'

  const supabase = await createClient()

  // Step 1: auth
  const { data: { user } } = await supabase.auth.getUser()

  // Step 2: Parallel fetch user data (profile & approved community memberships)
  const [profileResult, membershipsResult] = user
    ? await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('community_members').select('community_id, role').eq('user_id', user.id).eq('status', 'approved'),
      ])
    : [{ data: null }, { data: [] }]

  const profileRaw = profileResult.data
  const profile = enrichProfile(profileRaw)

  let activeFeedType: 'for_you' | 'following' = 'for_you'
  if (feedType === 'following' || feedType === 'for_you') {
    activeFeedType = feedType
  } else if (profile && profile.default_feed_type) {
    activeFeedType = profile.default_feed_type
  }

  const memberships = membershipsResult.data ?? []
  const memberCommunityIds = memberships.map((m: { community_id: string }) => m.community_id)
  const rolesByCommunityId = Object.fromEntries(
    memberships.map((m: { community_id: string; role: 'owner' | 'moderator' | 'member' }) => [m.community_id, m.role])
  ) as Record<string, 'owner' | 'moderator' | 'member'>

  // Step 3: Fetch posts (personalized, community-based, or all), user's communities, and suggested users in parallel
  const [posts, communitiesResult, suggestedUsers] = await Promise.all([
    communityId
      ? getPosts(communityId, activeSort)
      : (user && activeFeedType === 'following'
          ? getFollowingFeedPosts(user.id, activeSort)
          : getFeedPosts(undefined, activeSort)),
    user && memberCommunityIds.length > 0
      ? supabase.from('communities').select('id, name').in('id', memberCommunityIds)
      : Promise.resolve({ data: [] }),
    user
      ? getSuggestedUsers()
      : Promise.resolve([])
  ])

  const userCommunities = (communitiesResult.data ?? []) as { id: string; name: string }[]

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
              <h1 className="text-lg font-black text-foreground truncate">Anasayfa</h1>
              <p className="text-xs text-muted-foreground truncate sm:whitespace-normal">
                {user ? 'Topluluklarından ve arkadaşlarından gelen son gönderiler' : 'Herkese açık gönderiler'}
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
                Yeni
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
                Popüler
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
              <span>🏠</span> Ana Akış
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
            {activeSort === 'popular' ? 'Popüler Gönderiler' : 'Son Gönderiler'}
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
                : activeFeedType === 'following' && user
                ? ({ type: 'following', userId: user.id, sortBy: activeSort } satisfies FeedContext)
                : ({ type: 'feed', sortBy: activeSort } satisfies FeedContext)
            }
            initialHasMore={posts.length >= 20}
          />
        ) : (
          <>
            {/* Suggested Users Fallback for Empty Main Feed */}
            {user && !communityId && (
              <div className="bg-card/40 border border-border/60 rounded-3xl p-6 sm:p-8 flex flex-col items-center text-center gap-5 shadow-sm backdrop-blur-md">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg text-white"
                  style={{
                    background: 'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))',
                  }}
                >
                  <Sparkles size={28} className="animate-pulse" />
                </div>
                
                <div className="space-y-2 max-w-sm">
                  <h2 className="text-base font-bold text-foreground">Akışınız Boş Görünüyor</h2>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Kişisel akışınızda gönderi görebilmek için yeni insanları takip etmeye başlayın! Aşağıdaki önerilen profillere göz atabilirsiniz.
                  </p>
                </div>

                {suggestedUsers.length > 0 && (
                  <div className="w-full max-w-md border border-border/40 rounded-2xl overflow-hidden bg-card/25 divide-y divide-border/20 mt-2">
                    {suggestedUsers.map((sUser) => (
                      <div key={sUser.id} className="flex items-center justify-between p-3.5 hover:bg-card/30 transition-colors">
                        <Link href={`/profile/${sUser.username}`} className="flex items-center gap-3 text-left hover:opacity-85 transition-opacity">
                          {sUser.avatar_url ? (
                            <img src={sUser.avatar_url} alt={sUser.username} className="w-9 h-9 rounded-full object-cover ring-1 ring-border" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                              {sUser.username.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold text-foreground truncate">
                              {sUser.first_name || sUser.last_name ? `${sUser.first_name ?? ''} ${sUser.last_name ?? ''}`.trim() : sUser.username}
                            </span>
                            <span className="text-[10px] text-muted-foreground truncate">@{sUser.username}</span>
                          </div>
                        </Link>

                        <FollowButton targetUserId={sUser.id} initialIsFollowing={false} className="py-1 px-3.5 text-[10px]" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Empty Community Feed Notice */}
            {communityId && (
              <div className="bg-card/40 border border-border/60 rounded-3xl p-8 flex flex-col items-center text-center gap-3.5 shadow-sm backdrop-blur-md">
                <Users size={32} className="text-muted-foreground/60" />
                <div className="space-y-1">
                  <h2 className="text-sm font-bold text-foreground">Henüz Gönderi Yok</h2>
                  <p className="text-xs text-muted-foreground max-w-xs">
                    Bu toplulukta henüz paylaşım yapılmamış. İlk paylaşımı yukarıdaki panelden yapabilirsiniz!
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </MainLayout>
  )
}
