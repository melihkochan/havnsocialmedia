'use client'

import { useState, useEffect, useRef } from 'react'
import { PostCard } from '@/components/havn/PostCard'
import type { UserRole } from '@/lib/supabase/types'
import { Loader2 } from 'lucide-react'

interface PostFeedProps {
  posts: {
    id: string
    content: string
    image_url: string | null
    created_at: string
    user_id: string
    community_id?: string | null
    is_pinned?: boolean
    profiles: { username: string; avatar_url: string | null } | null
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
}

export function PostFeed({ posts, currentUserId, currentUserRole, rolesByCommunityId, pinContext }: PostFeedProps) {
  const [visibleCount, setVisibleCount] = useState(8)
  const loaderRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Reset visible count when posts list changes
    setVisibleCount(8)
  }, [posts])

  useEffect(() => {
    if (visibleCount >= posts.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          // Delay slightly to prevent jarring load transitions
          setTimeout(() => {
            setVisibleCount(prev => Math.min(posts.length, prev + 8))
          }, 200)
        }
      },
      { threshold: 0.1, rootMargin: '150px' }
    )

    if (loaderRef.current) {
      observer.observe(loaderRef.current)
    }

    return () => observer.disconnect()
  }, [visibleCount, posts.length])

  if (posts.length === 0) {
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

  const visiblePosts = posts.slice(0, visibleCount)

  return (
    <div className="flex flex-col gap-4">
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

      {visibleCount < posts.length && (
        <div ref={loaderRef} className="flex items-center justify-center py-6">
          <Loader2 className="animate-spin text-primary opacity-60" size={24} />
        </div>
      )}
    </div>
  )
}
