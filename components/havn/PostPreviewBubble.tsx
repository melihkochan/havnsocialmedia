'use client'

import { useEffect, useState } from 'react'
import { Heart, MessageCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ProfileName } from '@/components/havn/ProfileName'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface PostPreviewBubbleProps {
  postId: string
  isOwn: boolean
}

interface PostData {
  id: string
  content: string | null
  image_url: string | null
  created_at: string
  profiles: {
    username: string
    first_name: string | null
    last_name: string | null
    avatar_url: string | null
  } | null
  likes: { count: number }[]
  comments: { count: number }[]
  communities: {
    name: string
    slug: string
  } | null
}

function formatRelativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  const h = Math.floor(m / 60)
  const d = Math.floor(h / 24)
  if (m < 1) return 'şimdi'
  if (m < 60) return `${m}d`
  if (h < 24) return `${h}s`
  return `${d}g`
}

export function PostPreviewBubble({ postId, isOwn }: PostPreviewBubbleProps) {
  const supabase = createClient()
  const [post, setPost] = useState<PostData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchPost() {
      try {
        const { data, error } = await supabase
          .from('posts')
          .select(`
            id,
            content,
            image_url,
            created_at,
            profiles:user_id(username, first_name, last_name, avatar_url),
            likes:likes(count),
            comments:comments(count),
            communities:community_id(name, slug)
          `)
          .eq('id', postId)
          .single()

        if (!error && data) {
          // Normalize likes/comments counts since count might come as array
          const likesCount = (data.likes as any)?.[0]?.count ?? 0
          const commentsCount = (data.comments as any)?.[0]?.count ?? 0
          
          setPost({
            ...data,
            likes: [{ count: likesCount }],
            comments: [{ count: commentsCount }]
          } as any)
        }
      } catch {
        // silent
      } finally {
        setLoading(false)
      }
    }

    fetchPost()
  }, [postId])

  if (loading) {
    return (
      <div className={cn(
        "w-60 h-28 rounded-2xl border p-3 flex flex-col gap-2 animate-pulse",
        isOwn ? "bg-white/10 border-white/20" : "bg-card border-border"
      )}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-muted-foreground/20" />
          <div className="flex-1 space-y-1">
            <div className="h-2.5 w-20 bg-muted-foreground/20 rounded" />
            <div className="h-2 w-12 bg-muted-foreground/20 rounded" />
          </div>
        </div>
        <div className="h-3 w-full bg-muted-foreground/20 rounded mt-1" />
        <div className="h-3 w-2/3 bg-muted-foreground/20 rounded" />
      </div>
    )
  }

  if (!post) {
    return (
      <div className={cn(
        "p-3 rounded-2xl border text-[10px] font-semibold text-center italic opacity-80 min-w-[160px]",
        isOwn ? "bg-white/10 border-white/20 text-white" : "bg-card border-border text-muted-foreground"
      )}>
        Gönderi silinmiş veya bulunamadı
      </div>
    )
  }

  const likesCount = post.likes?.[0]?.count ?? 0
  const commentsCount = post.comments?.[0]?.count ?? 0

  return (
    <Link 
      href={`/post/${post.id}`}
      className={cn(
        "block p-3.5 rounded-2xl border text-left transition-all hover:scale-[1.01] active:scale-[0.99] shadow-sm flex flex-col gap-2 max-w-[280px] sm:max-w-[320px]",
        isOwn 
          ? "bg-white/10 border-white/15 text-white hover:bg-white/15" 
          : "bg-background/80 border-border text-foreground hover:bg-accent/40"
      )}
    >
      {/* Post Header */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          {post.profiles?.avatar_url ? (
            <img 
              src={post.profiles.avatar_url} 
              alt={post.profiles.username} 
              className="w-6.5 h-6.5 rounded-full object-cover flex-shrink-0 ring-1 ring-border/20" 
            />
          ) : (
            <div className={cn(
              "w-6.5 h-6.5 rounded-full flex items-center justify-center font-black text-[9px] flex-shrink-0 ring-1 ring-border/20",
              isOwn ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
            )}>
              {post.profiles?.username.slice(0, 2).toUpperCase() ?? 'AN'}
            </div>
          )}
          
          <div className="flex flex-col min-w-0">
            <ProfileName 
              profile={post.profiles as any} 
              layout="inline" 
              showHandle={false}
              nameClassName={cn("text-[10px] font-black leading-none truncate", isOwn ? "text-white" : "text-foreground")}
            />
            <span className={cn("text-[8px] opacity-75 leading-none mt-0.5", isOwn ? "text-white/80" : "text-muted-foreground")}>
              @{post.profiles?.username}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {post.communities && (
            <span className={cn(
              "px-1.5 py-0.5 rounded-md text-[7px] font-extrabold tracking-wide uppercase border",
              isOwn 
                ? "bg-white/10 border-white/20 text-white" 
                : "bg-primary/5 border-primary/20 text-primary"
            )}>
              c/{post.communities.slug}
            </span>
          )}
          <span className={cn("text-[8px] font-medium opacity-70", isOwn ? "text-white/80" : "text-muted-foreground")}>
            {formatRelativeTime(post.created_at)}
          </span>
        </div>
      </div>

      {/* Post content snippet */}
      {post.content && (
        <p className={cn(
          "text-[10.5px] leading-relaxed line-clamp-3 font-medium",
          isOwn ? "text-white/90" : "text-foreground/90"
        )}>
          {post.content}
        </p>
      )}

      {/* Image Preview if present */}
      {post.image_url && (
        <div className="relative rounded-xl overflow-hidden aspect-video border border-black/5 dark:border-white/5 w-full flex-shrink-0 mt-1">
          <img 
            src={post.image_url} 
            alt="Shared post attachment" 
            className="w-full h-full object-cover" 
          />
        </div>
      )}

      {/* Tiny Footer */}
      <div className={cn(
        "flex items-center gap-3.5 mt-1 text-[9px] font-bold opacity-75",
        isOwn ? "text-white/80" : "text-muted-foreground"
      )}>
        <span className="flex items-center gap-1">
          <Heart size={10} className={cn(likesCount > 0 ? "fill-current text-rose-500" : "")} /> 
          {likesCount}
        </span>
        <span className="flex items-center gap-1">
          <MessageCircle size={10} /> 
          {commentsCount}
        </span>
      </div>
    </Link>
  )
}
