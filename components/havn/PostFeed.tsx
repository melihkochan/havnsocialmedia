'use client'

import { useState, useEffect, useRef } from 'react'
import { PostCard } from '@/components/havn/PostCard'
import { motion, AnimatePresence } from 'framer-motion'
import type { UserRole } from '@/lib/supabase/types'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getSinglePost } from '@/lib/actions/posts'

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
}

export function PostFeed({
  posts,
  currentUserId,
  currentUserRole,
  rolesByCommunityId,
  pinContext,
  communityId,
  profileUserId,
  isBookmarksPage
}: PostFeedProps) {
  const [feedPosts, setFeedPosts] = useState(posts)
  const [pendingPosts, setPendingPosts] = useState<typeof posts>([])
  const [visibleCount, setVisibleCount] = useState(8)
  const loaderRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Reset visible count when posts list changes
    setFeedPosts(posts)
    setVisibleCount(8)
  }, [posts])

  useEffect(() => {
    if (visibleCount >= feedPosts.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          // Delay slightly to prevent jarring load transitions
          setTimeout(() => {
            setVisibleCount(prev => Math.min(feedPosts.length, prev + 8))
          }, 200)
        }
      },
      { threshold: 0.1, rootMargin: '150px' }
    )

    if (loaderRef.current) {
      observer.observe(loaderRef.current)
    }

    return () => observer.disconnect()
  }, [visibleCount, feedPosts.length])

  // Real-time Post Streaming (New posts & deletions)
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
          
          // Fetch enriched post details from server action
          const enrichedPost = await getSinglePost(newPostId)
          if (enrichedPost) {
            // Apply filtering checks to match feed scope
            console.log('[Realtime-PostFeed] INSERT event received:', payload)
            console.log('[Realtime-PostFeed] Enriched post:', enrichedPost)
            console.log('[Realtime-PostFeed] Filtering context:', {
              communityId,
              profileUserId,
              pathname: typeof window !== 'undefined' ? window.location.pathname : null,
              isBookmarksPage
            })

            // 1. Filter by communityId (Community Page context)
            if (communityId) {
              if (enrichedPost.community_id !== communityId) {
                console.log('[Realtime-PostFeed] Filtered out: communityId mismatch')
                return
              }
            }
            
            // 2. Filter by profileUserId (Profile Page context)
            else if (profileUserId) {
              if (enrichedPost.user_id !== profileUserId || enrichedPost.community_id !== null) {
                console.log('[Realtime-PostFeed] Filtered out: profileUserId mismatch or community post')
                return
              }
            }
            
            // 3. Fallback: URL path checks for Home Feed
            else if (typeof window !== 'undefined') {
              const path = window.location.pathname
              if (path === '/feed' || path === '/') {
                const commId = new URLSearchParams(window.location.search).get('communityId')
                if (commId) {
                  if (enrichedPost.community_id !== commId) {
                    console.log('[Realtime-PostFeed] Filtered out: home feed communityId mismatch')
                    return
                  }
                } else {
                  if (enrichedPost.community_id !== null) {
                    console.log('[Realtime-PostFeed] Filtered out: home feed not a personal post')
                    return
                  }
                }
              } else {
                console.log('[Realtime-PostFeed] Filtered out: unhandled page path', path)
                return
              }
            }

            console.log('[Realtime-PostFeed] Post passed filters, appending to feed.')

            // If the post belongs to the current logged-in user, show it immediately
            if (currentUserId && enrichedPost.user_id === currentUserId) {
              setFeedPosts(prev => {
                if (prev.some(p => p.id === enrichedPost.id)) return prev
                return [enrichedPost as any, ...prev]
              })
            } else {
              // Otherwise, queue it as a pending post
              setPendingPosts(prev => {
                if (prev.some(p => p.id === enrichedPost.id)) return prev
                return [enrichedPost as any, ...prev]
              })
            }
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
      .subscribe((status, err) => {
        console.log(`[Realtime-PostFeed] Subscription status: ${status}`, err || '')
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [communityId, profileUserId, isBookmarksPage])

  const handleShowPendingPosts = () => {
    setFeedPosts(prev => {
      const uniquePending = pendingPosts.filter(p => !prev.some(existing => existing.id === p.id))
      return [...uniquePending, ...prev]
    })
    setPendingPosts([])
  }

  if (feedPosts.length === 0 && pendingPosts.length === 0) {
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

  const visiblePosts = feedPosts.slice(0, visibleCount)

  return (
    <div className="flex flex-col gap-4">
      {/* Twitter-style pending posts bar */}
      <AnimatePresence>
        {pendingPosts.length > 0 && (
          <motion.button
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onClick={handleShowPendingPosts}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-black text-white rounded-2xl shadow-lg border border-transparent select-none cursor-pointer active:scale-95 transition-all hover:opacity-90"
            style={{
              background: 'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))'
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

      {visibleCount < feedPosts.length && (
        <div ref={loaderRef} className="flex items-center justify-center py-6">
          <Loader2 className="animate-spin text-primary opacity-60" size={24} />
        </div>
      )}
    </div>
  )
}
