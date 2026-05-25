'use client'

import { useState, useTransition } from 'react'
import { motion } from 'framer-motion'
import { UserPlus, UserMinus, Loader2 } from 'lucide-react'
import { followUser, unfollowUser } from '@/lib/actions/follows'
import { cn } from '@/lib/utils'

interface FollowButtonProps {
  targetUserId: string
  initialIsFollowing: boolean | 'none' | 'requested' | 'following'
  className?: string
}

export function FollowButton({ targetUserId, initialIsFollowing, className }: FollowButtonProps) {
  const getInitialStatus = () => {
    if (initialIsFollowing === 'requested') return 'requested'
    if (initialIsFollowing === 'following' || initialIsFollowing === true) return 'following'
    return 'none'
  }

  const [status, setStatus] = useState<'none' | 'requested' | 'following'>(getInitialStatus())
  const [pending, startTransition] = useTransition()

  async function handleClick() {
    if (pending) return

    startTransition(async () => {
      if (status === 'following' || status === 'requested') {
        const res = await unfollowUser(targetUserId)
        if (!res.error) {
          setStatus('none')
        } else {
          alert(res.error)
        }
      } else {
        const res = await followUser(targetUserId)
        if (!res.error) {
          if (res.status === 'requested') {
            setStatus('requested')
          } else {
            setStatus('following')
          }
        } else {
          alert(res.error)
        }
      }
    })
  }

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      disabled={pending}
      className={cn(
        "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 select-none shadow-sm",
        status !== 'none'
          ? "border border-border/80 text-muted-foreground hover:text-destructive hover:border-destructive/30 hover:bg-destructive/5"
          : "text-primary-foreground",
        className
      )}
      style={status === 'none' && !pending ? {
        background: 'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))'
      } : {}}
    >
      {pending ? (
        <Loader2 size={13} className="animate-spin text-muted-foreground" />
      ) : status === 'following' ? (
        <>
          <UserMinus size={13} className="group-hover:text-destructive" />
          <span>Takibi Bırak</span>
        </>
      ) : status === 'requested' ? (
        <>
          <svg
            viewBox="0 0 24 24"
            width="13"
            height="13"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-muted-foreground animate-pulse"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span>İstek Gönderildi</span>
        </>
      ) : (
        <>
          <UserPlus size={13} />
          <span>Takip Et</span>
        </>
      )}
    </motion.button>
  )
}
