'use client'

import { useState, useTransition } from 'react'
import { Check, X, Clock, Loader2, Users } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { approveMembership, rejectMembership } from '@/lib/actions/communities'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type PendingRequest = {
  id: string
  user_id: string
  joined_at: string
  role: string
  status: string
  profiles: {
    username: string
    avatar_url: string | null
  } | null
}

interface PendingRequestsListProps {
  communityId: string
  requests: PendingRequest[]
  setRequests: React.Dispatch<React.SetStateAction<PendingRequest[]>>
  minimal?: boolean
}

export function PendingRequestsList({ communityId, requests, setRequests, minimal = false }: PendingRequestsListProps) {
  const [isPending, startTransition] = useTransition()
  const [processingId, setProcessingId] = useState<string | null>(null)
  const router = useRouter()

  function handleAction(userId: string, type: 'approve' | 'reject') {
    setProcessingId(userId)
    startTransition(async () => {
      const res = type === 'approve'
        ? await approveMembership(communityId, userId)
        : await rejectMembership(communityId, userId)

      if (!res.error) {
        setRequests(prev => prev.filter(r => r.user_id !== userId))
        router.refresh()
      } else {
        alert(res.error)
      }
      setProcessingId(null)
    })
  }

  if (requests.length === 0) {
    if (minimal) {
      return (
        <div className="text-center py-8 text-xs text-muted-foreground">
          Bekleyen üyelik başvurusu bulunmuyor.
        </div>
      )
    }
    return null
  }

  return (
    <div className={cn(!minimal && "bg-card border border-border rounded-2xl p-5")}>
      {!minimal && (
        <div className="flex items-center gap-2 mb-4">
          <Users size={16} style={{ color: 'var(--primary)' }} />
          <h3 className="text-sm font-bold text-foreground">Üyelik Başvuruları</h3>
          <span className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold" style={{ background: 'color-mix(in oklch, var(--primary) 12%, transparent)', color: 'var(--primary)' }}>
            {requests.length} Bekleyen
          </span>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <AnimatePresence initial={false}>
          {requests.map((req) => {
            const username = req.profiles?.username ?? 'Anonim'
            const avatarUrl = req.profiles?.avatar_url
            const isLoading = isPending && processingId === req.user_id

            return (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex items-center justify-between p-3 rounded-xl bg-background/50 border border-border/50 gap-4"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Link href={`/profile/${username}`} className="hover:opacity-80 transition-opacity flex-shrink-0">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={username} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs"
                        style={{
                          background: `linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))`,
                          filter: `hue-rotate(${(username.charCodeAt(0) * 17) % 360}deg)`,
                          color: 'var(--primary-foreground)',
                        }}
                      >
                        {username.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </Link>
                  <div className="min-w-0">
                    <Link href={`/profile/${username}`} className="hover:underline">
                      <p className="text-xs font-bold text-foreground truncate">{username}</p>
                    </Link>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Clock size={10} />
                      {new Date(req.joined_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    disabled={isPending}
                    onClick={() => handleAction(req.user_id, 'approve')}
                    className="p-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-500 border border-green-500/20 transition-all flex items-center justify-center cursor-pointer"
                    title="Onayla"
                  >
                    {isLoading ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  </button>
                  <button
                    disabled={isPending}
                    onClick={() => handleAction(req.user_id, 'reject')}
                    className="p-1.5 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 transition-all flex items-center justify-center cursor-pointer"
                    title="Reddet"
                  >
                    {isLoading ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />}
                  </button>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}
