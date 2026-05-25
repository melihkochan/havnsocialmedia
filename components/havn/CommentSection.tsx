'use client'

import { useState, useTransition, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Loader2, Trash2, Heart, Reply, X } from 'lucide-react'
import Link from 'next/link'
import { createComment, deleteComment, toggleCommentLike } from '@/lib/actions/comments'
import { cn } from '@/lib/utils'
import { ProfileName } from '@/components/havn/ProfileName'
import { EmojiPickerButton } from '@/components/havn/EmojiPickerButton'
import { insertIntoField } from '@/lib/insert-text'
import { FormattedMessage } from '@/components/havn/FormattedMessage'

function Avatar({ username, avatarUrl, size = 'sm' }: { username: string; avatarUrl: string | null; size?: 'xs' | 'sm' }) {
  const sizeCls = size === 'xs' ? 'w-6 h-6 text-[10px]' : 'w-8 h-8 text-xs'
  if (avatarUrl) {
    return <img src={avatarUrl} alt={username} className={cn(sizeCls, "rounded-full object-cover flex-shrink-0")} />
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

interface CommentItem {
  id: string
  content: string
  created_at: string
  user_id: string
  parent_comment_id?: string | null
  profiles: { id?: string; username: string; first_name?: string | null; last_name?: string | null; avatar_url: string | null } | null
  comment_likes?: { user_id: string }[]
}

interface CommentSectionProps {
  postId: string
  initialComments: CommentItem[]
  currentUser: { id: string; username: string; avatar_url: string | null } | null
}

export function CommentSection({ postId, initialComments, currentUser }: CommentSectionProps) {
  const [comments, setComments] = useState<CommentItem[]>(initialComments)
  const [content, setContent] = useState('')
  const [replyingTo, setReplyingTo] = useState<CommentItem | null>(null)
  const [isPending, startTransition] = useTransition()
  const mainInputRef = useRef<HTMLInputElement>(null)
  const replyInputRef = useRef<HTMLInputElement>(null)

  function insertEmoji(emoji: string, target: 'main' | 'reply' = 'main') {
    const ref = target === 'reply' ? replyInputRef : mainInputRef
    insertIntoField(content, setContent, ref.current, emoji)
  }

  // Partition comments into a map
  const rootComments = comments.filter(c => !c.parent_comment_id)
  const childrenMap = comments.reduce((acc, c) => {
    if (c.parent_comment_id) {
      acc[c.parent_comment_id] = acc[c.parent_comment_id] || []
      acc[c.parent_comment_id].push(c)
    }
    return acc
  }, {} as Record<string, CommentItem[]>)

  function handleSubmit(e: React.FormEvent, parentId: string | null = null) {
    e.preventDefault()
    if (!content.trim() || !currentUser) return

    const optimistic: CommentItem = {
      id: `temp-${Date.now()}`,
      content,
      created_at: new Date().toISOString(),
      user_id: currentUser.id,
      parent_comment_id: parentId,
      profiles: { id: currentUser.id, username: currentUser.username, avatar_url: currentUser.avatar_url },
      comment_likes: [],
    }

    setComments(prev => [...prev, optimistic])
    const savedContent = content
    const savedReplyingTo = replyingTo
    setContent('')
    setReplyingTo(null)

    startTransition(async () => {
      const res = await createComment(postId, savedContent, parentId || undefined)
      if (res.error) {
        setComments(prev => prev.filter(c => c.id !== optimistic.id))
        setContent(savedContent)
        if (parentId) {
          setReplyingTo(savedReplyingTo)
        }
        alert(res.error)
      }
    })
  }

  function handleDelete(commentId: string) {
    setComments(prev => prev.filter(c => c.id !== commentId && c.parent_comment_id !== commentId))
    startTransition(async () => {
      await deleteComment(commentId, postId)
    })
  }

  async function handleLike(commentId: string) {
    if (!currentUser) return

    // Optimistic toggle
    setComments(prev =>
      prev.map(c => {
        if (c.id === commentId) {
          const likes = c.comment_likes || []
          const alreadyLiked = likes.some(l => l.user_id === currentUser.id)
          const nextLikes = alreadyLiked
            ? likes.filter(l => l.user_id !== currentUser.id)
            : [...likes, { user_id: currentUser.id }]
          return { ...c, comment_likes: nextLikes }
        }
        return c
      })
    )

    const res = await toggleCommentLike(commentId, postId)
    if (res.error) {
      // Revert if error
      alert(res.error)
    }
  }

  // Recursive renderer for comment threads
  function renderCommentNode(comment: CommentItem, depth = 0) {
    const username = comment.profiles?.username ?? 'anonim'
    const isOwn = currentUser?.id === comment.user_id
    const likes = comment.comment_likes || []
    const isLiked = currentUser ? likes.some(l => l.user_id === currentUser.id) : false
    const replies = childrenMap[comment.id] || []

    return (
      <div key={comment.id} className="flex flex-col">
        {/* Comment block */}
        <div className="flex gap-3 group relative py-1.5">
          {/* Timeline Connector Line */}
          {replies.length > 0 && (
            <div className="absolute left-4 top-10 bottom-0 w-0.5 bg-border/40 z-0" />
          )}

          <Link href={`/profile/${username}`} className="z-10">
            <Avatar username={username} avatarUrl={comment.profiles?.avatar_url ?? null} size={depth > 0 ? 'xs' : 'sm'} />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="bg-muted/40 hover:bg-muted/65 border border-border/30 rounded-2xl rounded-tl-sm px-4 py-2.5 transition-all duration-200">
              <div className="flex items-center justify-between gap-2 mb-1">
                <Link href={`/profile/${username}`} className="hover:opacity-80 transition-opacity">
                  <ProfileName
                    profile={comment.profiles ?? { username }}
                    nameClassName="text-xs"
                  />
                </Link>
                <span className="text-[10px] text-muted-foreground">{formatRelativeTime(comment.created_at)}</span>
              </div>
              <FormattedMessage text={comment.content} className="text-sm text-foreground/90 leading-relaxed" />
            </div>

            {/* Actions: Like, Reply, Delete */}
            <div className="flex items-center gap-3 mt-1.5 px-2">
              {/* Like Button */}
              <button
                onClick={() => handleLike(comment.id)}
                className={cn(
                  "text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer",
                  isLiked ? "text-rose-500 font-bold" : "text-muted-foreground hover:text-rose-500"
                )}
              >
                <Heart size={12} className={cn(isLiked && "fill-current")} />
                <span>{likes.length}</span>
              </button>

              {/* Reply Button */}
              {currentUser && (
                <button
                  onClick={() => {
                    if (replyingTo?.id === comment.id) {
                      setReplyingTo(null)
                      setContent('')
                    } else {
                      setReplyingTo(comment)
                      setContent('')
                    }
                  }}
                  className={cn(
                    "text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer",
                    replyingTo?.id === comment.id ? "text-primary font-bold" : "text-muted-foreground hover:text-primary"
                  )}
                >
                  <Reply size={12} />
                  <span>Yanıtla</span>
                </button>
              )}

              {/* Delete Button */}
              {isOwn && (
                <button
                  onClick={() => handleDelete(comment.id)}
                  className="text-[11px] font-medium text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors cursor-pointer ml-auto opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={11} />
                  <span>Sil</span>
                </button>
              )}
            </div>

            {/* Inline Reply Form */}
            <AnimatePresence>
              {replyingTo?.id === comment.id && currentUser && (
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  onSubmit={(e) => handleSubmit(e, comment.id)}
                  className="mt-3 flex gap-2 items-center"
                >
                  <Avatar username={currentUser.username} avatarUrl={currentUser.avatar_url} size="xs" />
                  <div className="flex-1 flex gap-1.5 items-center">
                    <EmojiPickerButton onInsert={e => insertEmoji(e, 'reply')} />
                    <input
                      ref={replyInputRef}
                      autoFocus
                      value={content}
                      onChange={e => setContent(e.target.value)}
                      placeholder={`@${username} kullanıcısına yanıt yaz...`}
                      maxLength={300}
                      className="flex-1 px-3 py-1.5 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setReplyingTo(null)
                        setContent('')
                      }}
                      className="px-2 py-1.5 rounded-lg border border-border text-muted-foreground hover:bg-accent text-xs flex items-center justify-center transition-colors cursor-pointer"
                    >
                      Vazgeç
                    </button>
                    <motion.button
                      type="submit"
                      disabled={!content.trim() || isPending}
                      whileTap={{ scale: 0.95 }}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 flex items-center justify-center cursor-pointer"
                      style={{
                        background: 'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))',
                        color: 'var(--primary-foreground)',
                      }}
                    >
                      {isPending ? <Loader2 size={13} className="animate-spin" /> : <Send size={12} />}
                    </motion.button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Children Rendered Recurse */}
        {replies.length > 0 && (
          <div className="pl-6 md:pl-8 border-l border-border/20 ml-4 md:ml-5 mt-1 space-y-2">
            {replies.map(reply => renderCommentNode(reply, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-foreground">
          Yorumlar <span className="text-muted-foreground font-normal text-xs">({comments.length})</span>
        </h2>
      </div>

      {/* Comment Form */}
      {currentUser ? (
        <form onSubmit={(e) => handleSubmit(e, null)} className="flex gap-3">
          <Avatar username={currentUser.username} avatarUrl={currentUser.avatar_url} />
          <div className="flex-1 flex gap-2 items-center">
            <EmojiPickerButton onInsert={e => insertEmoji(e, 'main')} />
            <input
              ref={mainInputRef}
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Yorum yaz..."
              maxLength={300}
              className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
            <motion.button
              type="submit"
              disabled={!content.trim() || isPending}
              whileTap={{ scale: 0.95 }}
              className="px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50 flex-shrink-0 flex items-center justify-center cursor-pointer"
              style={{
                background: 'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))',
                color: 'var(--primary-foreground)',
              }}
            >
              {isPending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            </motion.button>
          </div>
        </form>
      ) : (
        <div className="px-4 py-3 rounded-xl bg-muted text-sm text-muted-foreground text-center">
          Yorum yazmak için{' '}
          <Link href="/login" className="text-primary font-semibold hover:underline">giriş yap</Link>
        </div>
      )}

      {/* Comment List */}
      <div className="space-y-4">
        {rootComments.map(comment => renderCommentNode(comment))}

        {comments.length === 0 && (
          <p className="text-center text-xs text-muted-foreground py-8">
            Henüz yorum yok. İlk yorumu sen yap!
          </p>
        )}
      </div>
    </div>
  )
}
