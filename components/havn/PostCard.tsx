'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Heart, MessageCircle, Share2, MoreHorizontal, Bookmark, Trash2, ExternalLink, Repeat, Pencil, Loader2, Pin, Send, Eye, X, Download } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { sendDirectMessage } from '@/lib/actions/messages'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ProfileName } from '@/components/havn/ProfileName'
import { ConfirmDialog } from '@/components/havn/ConfirmDialog'
import { getDisplayName } from '@/lib/profile-display'
import { FormattedMessage } from '@/components/havn/FormattedMessage'
import { toggleLike, deletePost, repostPost, toggleBookmark, editPost, togglePinPost } from '@/lib/actions/posts'
import type { UserRole } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'

function Avatar({ username, avatarUrl, xp }: { username: string; avatarUrl: string | null; xp?: number }) {
  const level = xp !== undefined ? Math.floor(Math.sqrt(xp / 100)) + 1 : 1

  const ringClass = level >= 31 
    ? 'ring-2 ring-amber-500/80 shadow-[0_0_8px_rgba(245,158,11,0.45)]' 
    : level >= 16 
      ? 'ring-2 ring-purple-500/80 shadow-[0_0_6px_rgba(139,92,246,0.35)]' 
      : level >= 6 
        ? 'ring-2 ring-emerald-500/70 shadow-[0_0_4px_rgba(16,185,129,0.25)]' 
        : 'ring-1 ring-border'

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={username}
        className={cn("w-10 h-10 rounded-full object-cover flex-shrink-0", ringClass)}
      />
    )
  }
  return (
    <div
      className={cn("w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0", ringClass)}
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

const emojis = ['❤️', '🔥', '😂', '😮', '😢']
function getReactionForUser(userId: string, postId: string) {
  let hash = 0
  const str = userId + postId
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % emojis.length
  return emojis[index]
}

interface PostCardProps {
  post: {
    id: string
    content: string | null
    image_url: string | null
    created_at: string
    user_id: string
    community_id?: string | null
    is_pinned?: boolean
    profiles: { username: string; first_name?: string | null; last_name?: string | null; avatar_url: string | null; xp?: number } | null
    likes: { user_id: string }[]
    bookmarks?: { user_id: string }[]
    comments: { id: string }[]
    communities?: { name: string; slug: string } | null
    parent_post?: {
      id: string
      content: string | null
      image_url: string | null
      created_at: string
      user_id: string
      profiles: { username: string; first_name?: string | null; last_name?: string | null; avatar_url: string | null; xp?: number } | null
      likes?: { user_id: string }[]
      bookmarks?: { user_id: string }[]
      comments?: { id: string }[]
    } | null
  }
  role?: UserRole
  currentUserId?: string
  /** Görüntüleyen kullanıcının bu gönderinin topluluğundaki rolü */
  viewerRole?: UserRole
  pinContext?: 'community' | 'profile'
  index?: number
  viewCount?: number
}

export function PostCard({ post, role = 'member', currentUserId, viewerRole, pinContext, index = 0, viewCount }: PostCardProps) {
  const router = useRouter()
  // Unique channel token per mounted instance to avoid Supabase channel collisions
  const channelToken = useRef(`${Date.now()}_${Math.random().toString(36).substring(2, 7)}`)
  // A post is a repost when it has parent_post_id set, even if parent_post data is null (deleted)
  const hasParentId = !!(post as any).parent_post_id
  const isRepost = hasParentId && !!post.parent_post
  const isDeletedRepost = hasParentId && !post.parent_post
  const displayPost = post.parent_post || post
  const isOwn = currentUserId === post.user_id

  const [liked, setLiked] = useState(
    currentUserId ? (displayPost.likes || []).some(l => l.user_id === currentUserId) : false
  )
  const [likeCount, setLikeCount] = useState(displayPost.likes?.length ?? 0)
  const [commentCount, setCommentCount] = useState(displayPost.comments?.length ?? 0)
  const [reposted, setReposted] = useState(
    isRepost && post.user_id === currentUserId
  )
  
  const [bookmarked, setBookmarked] = useState(
    currentUserId ? (displayPost.bookmarks || []).some(b => b.user_id === currentUserId) : false
  )
  
  const [shared, setShared] = useState(false)
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const shareMenuRef = useRef<HTMLDivElement>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleted, setDeleted] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Editing state variables
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState((displayPost.content || '').replace('\u200B[anlar]', '').replace('\u200B[kadraj]', ''))
  const [editLoading, setEditLoading] = useState(false)
  const [postContent, setPostContent] = useState((displayPost.content || '').replace('\u200B[anlar]', '').replace('\u200B[kadraj]', ''))
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [showImageZoom, setShowImageZoom] = useState(false)
  const [showReactions, setShowReactions] = useState(false)
  const [activeReaction, setActiveReaction] = useState<string | null>(null)
  
  const [showLikersModal, setShowLikersModal] = useState(false)
  const [likers, setLikers] = useState<any[]>([])
  const [loadingLikers, setLoadingLikers] = useState(false)

  const openLikersModal = async () => {
    setShowLikersModal(true)
    setLoadingLikers(true)
    try {
      const { data, error } = await supabase
        .from('likes')
        .select('user_id, profiles:profiles(*)')
        .eq('post_id', displayPost.id)
      
      if (!error && data) {
        setLikers(data.map((l: any) => ({
          ...l.profiles,
          reaction: l.user_id === currentUserId ? activeReaction || '❤️' : getReactionForUser(l.user_id, displayPost.id)
        })))
      }
    } catch (e) {
      console.error('Error fetching likers:', e)
    } finally {
      setLoadingLikers(false)
    }
  }
  
  interface EmojiParticle {
    id: number
    emoji: string
    x: number
    y: number
    scale: number
    rotate: number
    delay: number
  }
  const [particles, setParticles] = useState<EmojiParticle[]>([])
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`havn_post_like_reaction_${displayPost.id}`)
      if (saved) {
        setActiveReaction(saved)
      }
    }
  }, [displayPost.id])

  const triggerReactionAnimation = (emoji: string) => {
    const newParticles = Array.from({ length: 8 }).map((_, i) => ({
      id: Date.now() + i,
      emoji,
      x: (Math.random() - 0.5) * 60,
      y: -10 - Math.random() * 40,
      scale: 0.7 + Math.random() * 0.6,
      rotate: (Math.random() - 0.5) * 60,
      delay: i * 0.03,
    }))
    setParticles((prev) => [...prev, ...newParticles])
  }

  const handleSelectReaction = (emoji: string) => {
    if (!currentUserId) {
      showToast('Beğenmek için giriş yapmalısınız.', 'error')
      return
    }
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    setShowReactions(false)
    setActiveReaction(emoji)
    localStorage.setItem(`havn_post_like_reaction_${displayPost.id}`, emoji)
    triggerReactionAnimation(emoji)
    if (!liked) {
      setLiked(true)
      setLikeCount((c) => c + 1)
    }
    startTransition(async () => {
      await toggleLike(displayPost.id, emoji, 'like')
    })
  }

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    hoverTimeoutRef.current = setTimeout(() => {
      setShowReactions(true)
    }, 400)
  }

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    hoverTimeoutRef.current = setTimeout(() => {
      setShowReactions(false)
    }, 300)
  }
  
  function showToast(message: string, type: 'success' | 'error' = 'success') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const username = post.profiles?.username ?? 'anonim'
  const displayUsername = displayPost.profiles?.username ?? 'anonim'
  const displayAvatarUrl = displayPost.profiles?.avatar_url ?? null
  const isOwnOriginal = currentUserId && (displayPost.user_id === currentUserId)
  const canModerate =
    !!post.community_id &&
    (viewerRole === 'owner' || viewerRole === 'moderator')
  const canDelete = isOwn || canModerate
  const isModRemoval = canModerate && !isOwn
  const isPinned = !!post.is_pinned
  const canPin =
    !hasParentId &&
    ((pinContext === 'community' && canModerate && !!post.community_id) ||
      (pinContext === 'profile' && isOwn && currentUserId === post.user_id))

  useEffect(() => {
    if (!showMenu && !showShareMenu) return
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node
      if (menuRef.current?.contains(target) || shareMenuRef.current?.contains(target)) return
      setShowMenu(false)
      setShowShareMenu(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [showMenu, showShareMenu])

  useEffect(() => {
    if (!showImageZoom) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setShowImageZoom(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showImageZoom])

  function openDeleteDialog() {
    setDeleteError(null)
    setShowMenu(false)
    setShowDeleteDialog(true)
  }

  function handleTogglePin() {
    if (!pinContext) return
    setShowMenu(false)
    startTransition(async () => {
      const res = await togglePinPost(post.id, pinContext)
      if (res.error) showToast(res.error, "error")
      else router.refresh()
    })
  }

  function executeDelete(reason?: string) {
    startTransition(async () => {
      const res = await deletePost(post.id, reason ?? null)
      if (res.error) {
        setDeleteError(res.error)
        return
      }
      setShowDeleteDialog(false)
      setDeleted(true)
    })
  }

  const deleteDialog = (
    <ConfirmDialog
      open={showDeleteDialog}
      onClose={() => !isPending && setShowDeleteDialog(false)}
      onConfirm={executeDelete}
      title={isModRemoval ? 'Gönderiyi kaldır' : 'Gönderiyi sil'}
      description={
        isModRemoval
          ? 'Bu gönderi topluluk yöneticisi olarak kaldırılacak. Gönderi sahibine bildirim gidecek.'
          : 'Bu işlem geri alınamaz. Gönderin kalıcı olarak silinecek.'
      }
      confirmLabel={isModRemoval ? 'Kaldır' : 'Sil'}
      pending={isPending}
      error={deleteError}
      variant="destructive"
      showReason={isModRemoval}
      reasonPlaceholder="Örn: Topluluk kurallarına aykırı içerik"
    />
  )

  // Sync state if props change
  useEffect(() => {
    setBookmarked(currentUserId ? (displayPost.bookmarks || []).some(b => b.user_id === currentUserId) : false)
  }, [displayPost.bookmarks, currentUserId])

  useEffect(() => {
    setCommentCount(displayPost.comments?.length ?? 0)
  }, [displayPost.comments])

  // Real-time Likes & Comments Sync
  useEffect(() => {
    const channel = supabase.channel(`post_interactions_${displayPost.id}_${channelToken.current}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'likes', filter: `post_id=eq.${displayPost.id}` },
        async () => {
          const { count } = await supabase
            .from('likes')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', displayPost.id)
          if (count !== null) setLikeCount(count)

          const { data } = await supabase
            .from('likes')
            .select('user_id')
            .eq('post_id', displayPost.id)
            .eq('user_id', currentUserId || '')
            .maybeSingle()
          setLiked(!!data)
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comments', filter: `post_id=eq.${displayPost.id}` },
        async () => {
          const { count } = await supabase
            .from('comments')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', displayPost.id)
          if (count !== null) setCommentCount(count)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [displayPost.id, currentUserId])

  useEffect(() => {
    setPostContent((displayPost.content || '').replace('\u200B[anlar]', '').replace('\u200B[kadraj]', ''))
  }, [displayPost.content])

  // Share via DM states
  const [showDMShareModal, setShowDMShareModal] = useState(false)
  const [followedUsers, setFollowedUsers] = useState<any[]>([])
  const [shareLoading, setShareLoading] = useState(false)
  const [sendingUserId, setSendingUserId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (!showDMShareModal || !currentUserId) return
    async function loadFollowed() {
      setShareLoading(true)
      try {
        const { data, error } = await supabase
          .from('follows')
          .select('following:profiles!following_id(*)')
          .eq('follower_id', currentUserId)
        if (!error && data) {
          setFollowedUsers((data as any[]).map(f => f.following).filter(Boolean))
        }
      } catch (err) {
        console.error('loadFollowed error:', err)
      } finally {
        setShareLoading(false)
      }
    }
    loadFollowed()
  }, [showDMShareModal, currentUserId])

  async function handleShareToUser(targetUserId: string) {
    if (sendingUserId) return
    setSendingUserId(targetUserId)
    const postLink = `${window.location.origin}/post/${displayPost.id}`
    const messageContent = `Bu gönderiye göz at: ${postLink}`
    
    const res = await sendDirectMessage(targetUserId, messageContent)
    setSendingUserId(null)
    if (!res.error) {
      showToast("Gönderi başarıyla paylaşıldı!", "success")
      setShowDMShareModal(false)
    } else {
      showToast(res.error, "error")
    }
  }

  if (deleted) return null

  // If the original post was deleted, show a minimal card with option to remove
  if (isDeletedRepost) {
    return (
      <>
      <motion.article
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          opacity: { duration: 0.35, delay: index * 0.06 },
          y: { duration: 0.35, delay: index * 0.06 }
        }}
        className="bg-card/70 backdrop-blur-md border border-border/80 rounded-2xl p-5 opacity-60 group relative"
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-semibold">
            <Repeat size={12} className="text-emerald-500" />
            <Link href={`/profile/${username}`} className="hover:underline text-foreground">{getDisplayName(post.profiles ?? { username })}</Link>
            <span>yeniden paylaştı</span>
          </div>
          {canDelete && (
            <div className="relative flex-shrink-0" ref={menuRef}>
              <button
                type="button"
                onClick={() => setShowMenu(s => !s)}
                className={cn(
                  'transition-opacity p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground cursor-pointer',
                  showMenu ? 'opacity-100 bg-accent' : 'opacity-0 group-hover:opacity-100'
                )}
              >
                <MoreHorizontal size={14} />
              </button>
              {showMenu && (
                  <div className="absolute right-0 top-8 z-[60] glass rounded-xl shadow-xl overflow-hidden w-36 border border-border">
                    <button
                      type="button"
                      onClick={openDeleteDialog}
                      disabled={isPending}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-xs hover:bg-accent transition-colors text-left cursor-pointer"
                      style={{ color: 'var(--destructive)' }}
                    >
                      <Trash2 size={13} /> {canModerate && !isOwn ? 'Kaldır (Mod)' : 'Kaldır'}
                    </button>
                  </div>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 px-3 py-3 rounded-xl bg-muted/50 border border-border/40 text-xs text-muted-foreground">
          <span className="text-base">🗑️</span>
          <span>Orijinal gönderi silinmiş.</span>
        </div>
      </motion.article>
      {deleteDialog}
    </>
    )
  }

  function handleLike() {
    if (!currentUserId) {
      showToast('Beğenmek için giriş yapmalısınız.', 'error')
      return
    }
    if (liked) {
      setLiked(false)
      setLikeCount((c) => c - 1)
      setActiveReaction(null)
      localStorage.removeItem(`havn_post_like_reaction_${displayPost.id}`)
      startTransition(async () => {
        await toggleLike(displayPost.id, 'like', 'unlike')
      })
    } else {
      setLiked(true)
      setLikeCount((c) => c + 1)
      setActiveReaction('❤️')
      localStorage.setItem(`havn_post_like_reaction_${displayPost.id}`, '❤️')
      triggerReactionAnimation('❤️')
      startTransition(async () => {
        await toggleLike(displayPost.id, '❤️', 'like')
      })
    }
  }

  function handleBookmark() {
    if (!currentUserId) {
      showToast('Yer işaretlerine eklemek için giriş yapmalısınız.', 'error')
      return
    }
    setBookmarked(b => !b)
    startTransition(async () => {
      await toggleBookmark(displayPost.id)
    })
  }

  function handleRepost() {
    if (!currentUserId) {
      showToast('Yeniden paylaşmak için giriş yapmalısınız.', 'error')
      return
    }
    setShowShareMenu(false)
    setReposted(r => !r)
    startTransition(async () => {
      const res = await repostPost(displayPost.id, post.community_id || null)
      if (res && 'reposted' in res) {
        setReposted(!!res.reposted)
      }
    })
  }

  function handleCopyLink() {
    setShowShareMenu(false)
    navigator.clipboard.writeText(`${window.location.origin}/post/${displayPost.id}`)
    setShared(true)
    setTimeout(() => setShared(false), 2000)
  }

  async function handleSaveEdit() {
    if (!editContent.trim()) return
    setEditLoading(true)
    const isAnlar = displayPost.content?.includes('\u200B[anlar]')
    const isKadraj = displayPost.content?.includes('\u200B[kadraj]')
    const updatedContent = isAnlar 
      ? editContent + '\u200B[anlar]' 
      : isKadraj 
        ? editContent + '\u200B[kadraj]' 
        : editContent
    const result = await editPost(displayPost.id, updatedContent)
    setEditLoading(false)
    if (result?.error) {
      showToast(result.error, "error")
    } else {
      setPostContent(editContent)
      setIsEditing(false)
      router.refresh()
    }
  }

  return (
    <>
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        opacity: { duration: 0.35, delay: index * 0.06 },
        y: { duration: 0.35, delay: index * 0.06 }
      }}
      whileHover={{ y: -2 }}
      className={cn(
        'bg-card/70 backdrop-blur-md border rounded-2xl p-5 hover:border-primary/25 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 group relative',
        isPinned ? 'border-primary/40 ring-1 ring-primary/15' : 'border-border/80'
      )}
    >
      {isPinned && (
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-primary mb-3 -mt-1">
          <Pin size={12} className="fill-current" />
          Sabitlendi
        </div>
      )}
      {/* Repost Header */}
      {isRepost && (
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-3 font-semibold px-0.5">
          <Repeat size={12} className="text-emerald-500" />
          <Link href={`/profile/${username}`} className="hover:underline text-foreground">
            {getDisplayName(post.profiles ?? { username })}
          </Link>
          <span>yeniden paylaştı</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link href={`/profile/${displayUsername}`} className="hover:opacity-80 transition-opacity flex-shrink-0">
            <Avatar username={displayUsername} avatarUrl={displayAvatarUrl} xp={displayPost.profiles?.xp} />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Link href={`/profile/${displayUsername}`} className="hover:opacity-80 transition-opacity">
                <ProfileName
                  profile={displayPost.profiles ?? { username: displayUsername }}
                  role={isRepost ? 'member' : role}
                />
              </Link>
              {post.communities && (
                <Link
                  href={`/communities/${post.communities.slug}`}
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md hover:opacity-80 transition-opacity"
                  style={{
                    background: 'color-mix(in oklch, var(--primary) 12%, transparent)',
                    color: 'var(--primary)',
                  }}
                >
                  {post.communities.name}
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Options menu */}
        <div className="flex items-center gap-1.5 flex-shrink-0 relative" ref={menuRef}>
          <span className="text-[10px] text-muted-foreground font-semibold select-none mt-1">
            {formatRelativeTime(displayPost.created_at)}
          </span>
          <button
            type="button"
            onClick={() => {
              setShowShareMenu(false)
              setShowMenu(s => !s)
            }}
            className={cn(
              'transition-opacity p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground cursor-pointer',
              showMenu ? 'opacity-100 bg-accent' : 'opacity-0 group-hover:opacity-100'
            )}
          >
            <MoreHorizontal size={16} />
          </button>
          {showMenu && (
              <div className="absolute right-0 top-8 z-[60] glass rounded-xl shadow-xl overflow-hidden w-44 border border-border">
                <Link
                  href={`/post/${displayPost.id}`}
                  className="flex items-center gap-2 px-3 py-2.5 text-xs text-foreground hover:bg-accent transition-colors"
                >
                  <ExternalLink size={13} /> Gönderiyi Aç
                </Link>
                {isOwnOriginal && !isEditing && (
                  <button
                    onClick={() => { setIsEditing(true); setShowMenu(false); setEditContent(postContent); }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-foreground hover:bg-accent transition-colors text-left cursor-pointer"
                  >
                    <Pencil size={13} /> Düzenle
                  </button>
                )}
                {canPin && (
                  <button
                    type="button"
                    onClick={handleTogglePin}
                    disabled={isPending}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-foreground hover:bg-accent transition-colors text-left cursor-pointer"
                  >
                    <Pin size={13} className={cn(isPinned && 'fill-primary text-primary')} />
                    {isPinned ? 'Sabitlemeyi Kaldır' : 'Sabitle'}
                  </button>
                )}
                {canDelete && (
                  <button
                    type="button"
                    onClick={openDeleteDialog}
                    disabled={isPending}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-xs hover:bg-accent transition-colors text-left cursor-pointer"
                    style={{ color: 'var(--destructive)' }}
                  >
                    <Trash2 size={13} /> {canModerate && !isOwn ? 'Kaldır (Mod)' : 'Sil'}
                  </button>
                )}
              </div>
          )}
        </div>
      </div>

      {/* Content */}
      {isEditing ? (
        <div className="flex flex-col gap-2.5 mb-4">
          <textarea
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
            className="w-full bg-accent/30 border border-border rounded-xl p-3 text-sm leading-relaxed resize-none outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/40 transition-all duration-205 text-foreground placeholder:text-muted-foreground"
            rows={3}
            maxLength={500}
            autoFocus
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] text-muted-foreground">{editContent.length}/500</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsEditing(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-all cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={editLoading || !editContent.trim()}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-primary-foreground bg-primary hover:bg-primary/90 transition-all disabled:opacity-50 cursor-pointer"
              >
                {editLoading && <Loader2 size={12} className="animate-spin" />}
                Kaydet
              </button>
            </div>
          </div>
        </div>
      ) : (
        <Link href={`/post/${displayPost.id}`}>
          <FormattedMessage
            text={postContent}
            className="text-sm text-foreground leading-relaxed mb-4 block hover:opacity-90 transition-opacity"
          />
        </Link>
      )}

      {/* Image or Video */}
      {displayPost.image_url && (
        (() => {
          const isVideo = displayPost.image_url
            ? (displayPost.image_url.split('?')[0].toLowerCase().endsWith('.mp4') ||
               displayPost.image_url.split('?')[0].toLowerCase().endsWith('.webm') ||
               displayPost.image_url.split('?')[0].toLowerCase().endsWith('.mov') ||
               displayPost.image_url.split('?')[0].toLowerCase().endsWith('.ogg'))
            : false
          
          return isVideo ? (
            <div className="block mb-4 rounded-xl overflow-hidden border border-border bg-black/5 select-none relative w-full aspect-video">
              <video
                src={displayPost.image_url}
                className="w-full h-full object-cover"
                controls
                playsInline
                loop
                muted
              />
            </div>
          ) : (
            <div 
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setShowImageZoom(true)
              }}
              className="block mb-4 rounded-xl overflow-hidden border border-border cursor-pointer select-none relative group/image"
            >
              <div className="relative w-full aspect-video">
                <Image
                  src={displayPost.image_url}
                  alt="Gönderi görseli"
                  fill
                  className="object-cover group-hover/image:scale-[1.01] transition-transform duration-200"
                  unoptimized
                />
                {/* Subtle magnifying hover overlay */}
                <div className="absolute inset-0 bg-black/10 opacity-0 group-hover/image:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                  <div className="p-2 rounded-xl bg-background/80 backdrop-blur-md text-foreground shadow-md scale-95 group-hover/image:scale-100 transition-all duration-200">
                    <Eye size={16} className="text-muted-foreground" />
                  </div>
                </div>
              </div>
            </div>
          )
        })()
      )}

      {/* Divider */}
      <div className="border-t border-border mb-3" />

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <div 
            className="relative"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <AnimatePresence>
              {showReactions && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.9 }}
                  transition={{ duration: 0.15 }}
                  className="absolute bottom-full mb-2 left-0 bg-card border border-border/80 backdrop-blur-md rounded-full shadow-2xl p-1.5 flex gap-2 z-[70] items-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  {['❤️', '🔥', '😂', '😮', '😢'].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleSelectReaction(emoji)}
                      className="w-7 h-7 rounded-full hover:bg-accent hover:scale-125 active:scale-95 transition-all text-sm flex items-center justify-center cursor-pointer select-none"
                    >
                      {emoji}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center">
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={handleLike}
                className={cn(
                  'flex items-center gap-1.5 pl-2.5 pr-1 py-1.5 rounded-l-lg text-xs font-medium transition-all cursor-pointer relative',
                  liked ? 'text-rose-500 bg-rose-500/10' : 'text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10'
                )}
              >
                {/* Particle Burst Animation */}
                <AnimatePresence>
                  {particles.map((p) => (
                    <motion.span
                      key={p.id}
                      initial={{ opacity: 1, y: 0, x: 0, scale: 0.5, rotate: 0 }}
                      animate={{ 
                        opacity: 0, 
                        y: p.y - 80, 
                        x: p.x, 
                        scale: p.scale, 
                        rotate: p.rotate 
                      }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 1.2, ease: 'easeOut', delay: p.delay }}
                      onAnimationComplete={() => {
                        setParticles((prev) => prev.filter((item) => item.id !== p.id))
                      }}
                      className="absolute pointer-events-none select-none text-base z-[100] left-3.5 top-1/2 -translate-y-1/2"
                    >
                      {p.emoji}
                    </motion.span>
                  ))}
                </AnimatePresence>

                {liked && activeReaction ? (
                  <span className="text-sm select-none scale-110">{activeReaction}</span>
                ) : (
                  <Heart size={15} className={cn(liked && 'fill-current')} />
                )}
              </motion.button>
              
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  if (likeCount > 0) {
                    openLikersModal()
                  }
                }}
                className={cn(
                  'pr-2.5 pl-1 py-1.5 rounded-r-lg text-xs font-bold transition-all cursor-pointer hover:underline',
                  liked ? 'text-rose-500 bg-rose-500/10' : 'text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10'
                )}
                title="Beğenenleri Gör"
              >
                {likeCount}
              </button>
            </div>
          </div>

          <Link
            href={`/post/${displayPost.id}`}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
          >
            <MessageCircle size={15} />
            <span>{commentCount}</span>
          </Link>

          {typeof viewCount === 'number' && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-muted-foreground select-none">
              <Eye size={15} />
              <span>{viewCount}</span>
            </div>
          )}

          {/* Share with Popover */}
          <div className="relative" ref={shareMenuRef}>
            <button
              type="button"
              onClick={() => {
                setShowMenu(false)
                setShowShareMenu(s => !s)
              }}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer',
                reposted && 'text-emerald-500 hover:text-emerald-600'
              )}
            >
              {post.community_id ? <Share2 size={15} /> : <Repeat size={15} className={cn(reposted && 'text-emerald-500')} />}
              <span>{post.community_id ? 'Paylaş' : 'Yeniden Paylaş'}</span>
            </button>

            {showShareMenu && (
                <div className="absolute left-0 bottom-9 z-[60] glass rounded-xl shadow-xl overflow-hidden w-44 border border-border flex flex-col">
                  {!post.community_id && (
                    <button
                      onClick={handleRepost}
                      disabled={isPending}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2.5 text-xs transition-colors text-left w-full cursor-pointer",
                        reposted ? "text-emerald-500 hover:bg-accent" : "text-foreground hover:bg-accent"
                      )}
                    >
                      <Repeat size={13} />
                      {reposted ? "Paylaşımı Geri Al" : "Yeniden Paylaş"}
                    </button>
                  )}
                  <button
                    onClick={handleCopyLink}
                    className="flex items-center gap-2 px-3 py-2.5 text-xs text-foreground hover:bg-accent transition-colors text-left w-full cursor-pointer"
                  >
                    <ExternalLink size={13} />
                    {shared ? "Kopyalandı!" : "Bağlantıyı Kopyala"}
                  </button>
                  {currentUserId && (
                    <button
                      onClick={() => {
                        setShowShareMenu(false)
                        setShowDMShareModal(true)
                      }}
                      className="flex items-center gap-2 px-3 py-2.5 text-xs text-foreground hover:bg-accent transition-colors text-left w-full cursor-pointer border-t border-border/40"
                    >
                      <Send size={13} />
                      Mesajla Paylaş
                    </button>
                  )}
                </div>
            )}
          </div>
        </div>

        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={handleBookmark}
          className={cn(
            'p-1.5 rounded-lg transition-all cursor-pointer',
            bookmarked ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-primary hover:bg-primary/10 opacity-0 group-hover:opacity-100'
          )}
        >
          <Bookmark size={15} className={cn(bookmarked && 'fill-current')} />
        </motion.button>
      </div>
    </motion.article>

    {deleteDialog}
    
    {/* DM Share Modal */}
    <AnimatePresence>
      {showDMShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-card border border-border rounded-3xl w-full max-w-sm overflow-hidden shadow-xl"
          >
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-bold text-sm text-foreground">Gönderiyi Paylaş</h3>
              <button
                onClick={() => setShowDMShareModal(false)}
                className="px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground rounded-lg border border-border/80 transition-colors"
              >
                Kapat
              </button>
            </div>
            <div className="p-4 max-h-60 overflow-y-auto space-y-2">
              {shareLoading ? (
                <div className="p-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Loader2 size={12} className="animate-spin" /> Yükleniyor...
                </div>
              ) : followedUsers.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground leading-relaxed">
                  Henüz takip ettiğiniz kimse bulunmuyor. Paylaşmak için kullanıcıları takip edin!
                </div>
              ) : (
                followedUsers.map(user => (
                  <button
                    key={user.id}
                    onClick={() => handleShareToUser(user.id)}
                    disabled={sendingUserId !== null}
                    className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-muted text-left cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt={user.username} className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                          {user.username.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <ProfileName profile={user} layout="stacked" nameClassName="text-xs" showHandle={true} />
                    </div>
                    <div className="px-2.5 py-1 rounded-lg bg-primary text-primary-foreground text-[10px] font-bold">
                      {sendingUserId === user.id ? <Loader2 size={10} className="animate-spin" /> : "Gönder"}
                    </div>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>

    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          className={cn(
            "fixed top-6 right-6 z-[999] px-4.5 py-3 rounded-2xl shadow-2xl border text-xs font-bold flex items-center gap-2 backdrop-blur-md",
            toast.type === 'success'
              ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-500"
              : "bg-destructive/10 border-destructive/25 text-destructive"
          )}
        >
          <span>{toast.type === 'success' ? '✅' : '❌'}</span>
          <span>{toast.message}</span>
        </motion.div>
      )}
    </AnimatePresence>

    {/* Fullscreen Image Lightbox Modal */}
    <AnimatePresence>
      {showImageZoom && displayPost.image_url && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md cursor-zoom-out select-none"
          onClick={() => setShowImageZoom(false)}
        >
          {/* Circular Action buttons at the top right */}
          <div className="absolute top-6 right-6 flex items-center gap-3 z-[110]">
            {/* Download button */}
            <a
              href={displayPost.image_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-2.5 rounded-full border border-border/80 bg-card/60 hover:bg-accent text-muted-foreground hover:text-foreground transition-all duration-200 cursor-pointer shadow-sm flex items-center justify-center w-10 h-10"
              title="Görseli İndir / Yeni Sekmede Aç"
            >
              <Download size={16} />
            </a>

            {/* Close button */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowImageZoom(false)
              }}
              className="p-2.5 rounded-full border border-border/80 bg-card/60 hover:bg-accent text-muted-foreground hover:text-foreground transition-all duration-200 cursor-pointer shadow-sm flex items-center justify-center w-10 h-10"
              title="Kapat"
            >
              <X size={16} />
            </button>
          </div>

          {/* Glowing background glow */}
          <div 
            className="absolute w-96 h-96 rounded-full opacity-35 blur-3xl pointer-events-none"
            style={{
              background: 'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))',
            }}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 250 }}
            className="relative max-w-[90vw] max-h-[85vh] rounded-3xl overflow-hidden border border-border/80 shadow-2xl bg-card"
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking the image container itself
          >
            <img
              src={displayPost.image_url}
              alt="Gönderi görseli önizleme"
              className="max-w-full max-h-[85vh] object-contain rounded-3xl"
            />
          </motion.div>
        </div>
      )}
    </AnimatePresence>

    {/* Likers Modal */}
    <AnimatePresence>
      {showLikersModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowLikersModal(false)}
            className="absolute inset-0 bg-background/80 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ scale: 0.95, y: 15, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 15, opacity: 0 }}
            transition={{ type: 'spring', damping: 20 }}
            className="w-full max-w-sm bg-card border border-border shadow-2xl rounded-3xl overflow-hidden z-10 flex flex-col max-h-[400px]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-border/80 flex items-center justify-between bg-muted/20">
              <span className="text-xs font-black tracking-wider uppercase text-foreground">Beğenenler ({likeCount})</span>
              <button
                onClick={() => setShowLikersModal(false)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin">
              {loadingLikers ? (
                <div className="p-8 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Loader2 size={14} className="animate-spin" /> Yükleniyor...
                </div>
              ) : likers.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  Beğeni bulunamadı.
                </div>
              ) : (
                likers.map((user) => (
                  <div
                    key={user.id}
                    className="w-full px-3 py-2.5 rounded-xl hover:bg-muted/50 flex items-center justify-between gap-3 transition-colors border border-transparent hover:border-border/30"
                  >
                    <Link 
                      href={`/profile/${user.username}`}
                      onClick={() => setShowLikersModal(false)}
                      className="flex items-center gap-2.5 min-w-0"
                    >
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt={user.username} className="w-8 h-8 rounded-full object-cover ring-1 ring-border" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                          {user.username.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <ProfileName profile={user} layout="stacked" nameClassName="text-xs font-bold" showHandle={true} />
                    </Link>
                    <span className="text-lg select-none filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.1)]">{user.reaction}</span>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
    </>
  )
}
