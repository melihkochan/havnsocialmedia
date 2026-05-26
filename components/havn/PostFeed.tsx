'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { PostCard } from '@/components/havn/PostCard'
import { motion, AnimatePresence } from 'framer-motion'
import type { UserRole } from '@/lib/supabase/types'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getSinglePost, loadMorePosts } from '@/lib/actions/posts'
import type { FeedContext } from '@/lib/actions/posts'

interface PostFeedProps {
  posts: {
    id: string
    content: string | null
    image_url: string | null
    created_at: string
    user_id: string
    community_id?: string | null
    is_pinned?: boolean
    profiles: { username: string; avatar_url: string | null; first_name?: string | null; last_name?: string | null; xp?: number } | null
    community_members: { role: 'owner' | 'moderator' | 'member' }[]
    likes: { user_id: string }[]
    comments: { id: string }[]
    communities?: { name: string; slug: string } | null
  }[]
  currentUserId?: string
  /** Tek topluluk sayfasında görüntüleyen kullanıcının rolü */
  currentUserRole?: UserRole
  /** Ana sayfa: topluluk id → görüntüleyen kullanıcının rolü */
  rolesByCommunityId?: Record<string, UserRole>
  pinContext?: 'community' | 'profile'
  communityId?: string | null
  profileUserId?: string | null
  isBookmarksPage?: boolean
  /** Server-side infinite scroll context. When provided, enables real pagination. */
  feedContext?: FeedContext
  /** Whether there are more posts to load on the server (used when feedContext is set) */
  initialHasMore?: boolean
}

export function PostFeed({
  posts,
  currentUserId,
  currentUserRole,
  rolesByCommunityId,
  pinContext,
  communityId,
  profileUserId,
  isBookmarksPage,
  feedContext,
  initialHasMore = false,
}: PostFeedProps) {
  const [feedPosts, setFeedPosts] = useState(posts)
  const [pendingPosts, setPendingPosts] = useState<typeof posts>([])
  const loaderRef = useRef<HTMLDivElement>(null)

  // ─── Server-side infinite scroll state ───────────────────────────────────
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [isLoadingMore, startLoadingMore] = useTransition()

  // ─── Client-side slice (fallback when no feedContext, e.g. bookmarks) ─────
  const [visibleCount, setVisibleCount] = useState(feedContext ? feedPosts.length : 8)

  useEffect(() => {
    setFeedPosts(posts)
    setPendingPosts([])
    setHasMore(initialHasMore)
    setVisibleCount(feedContext ? posts.length : 8)
  }, [posts, initialHasMore, feedContext])

  // ─── Intersection observer ────────────────────────────────────────────────
  useEffect(() => {
    if (feedContext) {
      // Server-side mode: fetch more when loader is visible
      if (!hasMore || isLoadingMore) return
    } else {
      // Client-side mode: show more already-loaded posts
      if (visibleCount >= feedPosts.length) return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return

        if (feedContext) {
          // Fetch next page from server
          startLoadingMore(async () => {
            const { posts: morePosts, hasMore: more } = await loadMorePosts(
              feedContext,
              feedPosts.length
            )
            if (morePosts.length > 0) {
              setFeedPosts(prev => {
                const existingIds = new Set(prev.map(p => p.id))
                const unique = morePosts.filter((p: any) => !existingIds.has(p.id))
                return [...prev, ...unique] as typeof posts
              })
            }
            setHasMore(more)
          })
        } else {
          // Reveal more already-loaded posts
          setTimeout(() => {
            setVisibleCount(prev => Math.min(feedPosts.length, prev + 8))
          }, 200)
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    )

    if (loaderRef.current) observer.observe(loaderRef.current)
    return () => observer.disconnect()
  }, [feedContext, hasMore, isLoadingMore, visibleCount, feedPosts.length])

  // ─── Supabase real-time (new posts & deletions) ───────────────────────────
  useEffect(() => {
    if (isBookmarksPage) return

    const supabase = createClient()
    const channelToken = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

    const channel = supabase.channel(`feed_posts_realtime_${channelToken}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts' },
        async (payload) => {
          const newPostId = payload.new.id

          const enrichedPost = await getSinglePost(newPostId)
          if (!enrichedPost) return

          // Filter by feed context
          if (communityId) {
            if (enrichedPost.community_id !== communityId) return
          } else if (profileUserId) {
            if (enrichedPost.user_id !== profileUserId || enrichedPost.community_id !== null) return
          } else if (typeof window !== 'undefined') {
            const path = window.location.pathname
            if (path === '/feed' || path === '/') {
              const commId = new URLSearchParams(window.location.search).get('communityId')
              if (commId) {
                if (enrichedPost.community_id !== commId) return
              } else {
                if (enrichedPost.community_id !== null) return
              }
            } else {
              return
            }
          }

          const isAtTop = typeof window !== 'undefined' && window.scrollY <= 150
          const isOwnPost = currentUserId && enrichedPost.user_id === currentUserId

          if (isAtTop || isOwnPost) {
            setFeedPosts(prev => {
              if (prev.some(p => p.id === enrichedPost.id)) return prev
              return [enrichedPost as any, ...prev]
            })
          } else {
            setPendingPosts(prev => {
              if (prev.some(p => p.id === enrichedPost.id)) return prev
              return [enrichedPost as any, ...prev]
            })
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'posts' },
        (payload) => {
          const deletedPostId = payload.old.id
          setFeedPosts(prev => prev.filter(p => p.id !== deletedPostId))
          setPendingPosts(prev => prev.filter(p => p.id !== deletedPostId))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [communityId, profileUserId, isBookmarksPage, currentUserId])

  const handleShowPendingPosts = () => {
    setFeedPosts(prev => {
      const uniquePending = pendingPosts.filter(p => !prev.some(existing => existing.id === p.id))
      return [...uniquePending, ...prev]
    })
    setPendingPosts([])
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  if (feedPosts.length === 0 && !isLoadingMore) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl"
          style={{ background: 'color-mix(in oklch, var(--primary) 10%, transparent)' }}
        >
          🌊
        </div>
        <p className="text-foreground font-semibold">Henüz gönderi yok</p>
        <p className="text-muted-foreground text-sm text-center max-w-xs">
          Bu toplulukta ilk gönderiyi paylaşan sen ol!
        </p>
      </div>
    )
  }

  // Determine which posts to display
  const visiblePosts = feedContext ? feedPosts : feedPosts.slice(0, visibleCount)
  const showLoader = feedContext ? hasMore : visibleCount < feedPosts.length

  return (
    <div className="flex flex-col gap-4">
      {/* Sticky/Floating banner for pending real-time posts */}
      <AnimatePresence>
        {pendingPosts.length > 0 && (
          <motion.button
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            onClick={handleShowPendingPosts}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 text-xs font-black text-white rounded-2xl shadow-xl border border-transparent select-none cursor-pointer active:scale-[0.98] transition-all hover:opacity-95 sticky top-[76px] z-40"
            style={{
              background: 'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))',
              backdropFilter: 'blur(8px)'
            }}
          >
            ✨ {pendingPosts.length} yeni gönderi mevcut - Görmek için tıkla
          </motion.button>
        )}
      </AnimatePresence>

      {visiblePosts.map((post, index) => {
        const memberEntry = post.community_members?.[0]
        const role = memberEntry?.role ?? 'member'
        const viewerRole =
          currentUserRole ??
          (post.community_id ? rolesByCommunityId?.[post.community_id] : undefined)

        return (
          <PostCard
            key={post.id}
            post={post}
            role={role}
            currentUserId={currentUserId}
            viewerRole={viewerRole}
            pinContext={pinContext}
            index={index}
          />
        )
      })}

      {/* Loader / infinite scroll sentinel */}
      {showLoader && (
        <div ref={loaderRef} className="flex items-center justify-center py-6">
          <Loader2 className="animate-spin text-primary opacity-60" size={24} />
        </div>
      )}

      {/* End of feed message */}
      {feedContext && !hasMore && feedPosts.length > 0 && (
        <div className="flex flex-col items-center justify-center py-8 gap-2 opacity-50">
          <div className="w-8 h-px bg-border" />
          <p className="text-xs text-muted-foreground">Tüm gönderiler yüklendi</p>
          <div className="w-8 h-px bg-border" />
        </div>
      )}
    </div>
  )
}
