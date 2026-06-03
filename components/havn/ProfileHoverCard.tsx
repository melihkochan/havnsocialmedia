'use client'

import { useState, useRef } from 'react'
import { useParams, usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { BadgeCheck, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { followUser, unfollowUser } from '@/lib/actions/follows'
import { enrichProfile } from '@/lib/profile-enrich'
import { getDisplayName, getFullName } from '@/lib/profile-display'
import { cn } from '@/lib/utils'

interface ProfileHoverCardProps {
  username: string
  children: React.ReactNode
}

export function ProfileHoverCard({ username, children }: ProfileHoverCardProps) {
  const params = useParams()
  const pathname = usePathname()
  const routeUsername = params?.username as string | undefined

  const isCurrentProfilePage =
    (routeUsername?.toLowerCase() === username.toLowerCase()) ||
    (pathname?.toLowerCase() === `/profile/${username}`.toLowerCase()) ||
    (pathname?.toLowerCase() === `/profile/${username}/`.toLowerCase())

  const [isOpen, setIsOpen] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [actionLoading, setActionLoading] = useState(false)
  const [positionMode, setPositionMode] = useState<'top' | 'bottom'>('top')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const triggerRef = useRef<HTMLDivElement>(null)

  const handleMouseEnter = () => {
    if (isCurrentProfilePage) return
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setIsOpen(true)

    // Check viewport space to decide if the card should render downwards or upwards
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      // If the top of the element is less than 280px from the top of the viewport,
      // position the card downwards ('bottom') to prevent clipping.
      if (rect.top < 280) {
        setPositionMode('bottom')
      } else {
        setPositionMode('top')
      }
    }

    if (!profile && !loading) {
      loadProfile()
    }
  }

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false)
    }, 450) // delay close to allow moving cursor into card
  }

  const loadProfile = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)
      }
      
      const { data: rawProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single()
      
      if (rawProfile) {
        const enriched = enrichProfile(rawProfile)

        // Fetch follow stats
        const [followersRes, followingRes, followCheck] = await Promise.all([
          supabase.from('follows').select('follower_id', { count: 'exact', head: true }).eq('following_id', rawProfile.id),
          supabase.from('follows').select('following_id', { count: 'exact', head: true }).eq('follower_id', rawProfile.id),
          user ? supabase.from('follows').select('*').eq('follower_id', user.id).eq('following_id', rawProfile.id).maybeSingle() : Promise.resolve({ data: null })
        ])

        setFollowerCount(followersRes.count ?? 0)
        setFollowingCount(followingRes.count ?? 0)
        setIsFollowing(!!followCheck.data)
        setProfile(enriched)
      }
    } catch (e) {
    } finally {
      setLoading(false)
    }
  }

  const handleFollowToggle = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!profile || actionLoading) return
    setActionLoading(true)
    try {
      if (isFollowing) {
        const res = await unfollowUser(profile.id)
        if (!res.error) {
          setIsFollowing(false)
          setFollowerCount(c => Math.max(0, c - 1))
        }
      } else {
        const res = await followUser(profile.id)
        if (!res.error) {
          setIsFollowing(true)
          setFollowerCount(c => c + 1)
        }
      }
    } catch (err) {
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div 
      ref={triggerRef}
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: positionMode === 'top' ? 8 : -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: positionMode === 'top' ? 8 : -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            onMouseEnter={() => {
              if (timeoutRef.current) clearTimeout(timeoutRef.current)
            }}
            onMouseLeave={handleMouseLeave}
            className={cn(
              "absolute left-1/2 -translate-x-1/2 z-[999] w-72 p-4 bg-card/95 border border-border/80 rounded-2xl shadow-xl backdrop-blur-md text-foreground pointer-events-auto",
              positionMode === 'top' ? "bottom-full mb-2.5" : "top-full mt-2.5"
            )}
          >
            {loading && !profile ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="animate-spin text-primary" size={20} />
              </div>
            ) : profile ? (
              <div className="space-y-3">
                {/* Header: Avatar + Action Button */}
                <div className="flex items-start justify-between gap-3">
                  <Link href={`/profile/${profile.username}`} className="hover:opacity-80 transition-opacity">
                    {profile.avatar_url ? (
                      <img 
                        src={profile.avatar_url} 
                        alt={profile.username} 
                        className="w-12 h-12 rounded-full object-cover border border-border/50"
                      />
                    ) : (
                      <div 
                        className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-base text-primary-foreground"
                        style={{
                          background: `linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))`,
                          filter: `hue-rotate(${(profile.username.charCodeAt(0) * 17) % 360}deg)`
                        }}
                      >
                        {profile.username.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </Link>

                  {currentUserId && profile.id !== currentUserId && (
                    <button
                      onClick={handleFollowToggle}
                      disabled={actionLoading}
                      className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center min-w-[80px] gap-1 cursor-pointer active:scale-95 disabled:opacity-50 ${
                        isFollowing
                          ? 'bg-muted hover:bg-muted/80 text-foreground border border-border/80'
                          : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-md'
                      }`}
                    >
                      {actionLoading ? (
                        <Loader2 size={10} className="animate-spin" />
                      ) : isFollowing ? (
                        'Takipte'
                      ) : (
                        'Takip et'
                      )}
                    </button>
                  )}
                </div>

                {/* Identity */}
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-1 flex-wrap min-w-0">
                    <span className="font-bold text-sm truncate leading-none">
                      {getFullName(profile) ?? profile.username}
                    </span>
                    {(profile.username === 'melih' || profile.username === 'havn') && (
                      <span className="flex-shrink-0 align-middle inline-flex items-center justify-center w-3.5 h-3.5 rounded bg-gradient-to-tr from-yellow-400 via-amber-500 to-yellow-600 text-black border border-amber-400/30 shadow-[0_0_6px_rgba(245,158,11,0.55)]" title="HAVN Resmi Ortaklığı">
                        <span className="text-[8px] font-black text-black leading-none font-mono">H</span>
                      </span>
                    )}
                    {(profile.username === 'melih' || profile.username === 'havn' || profile.is_gold || profile.role === 'founder') && (
                      <span className="flex-shrink-0 align-middle inline-flex" title="Özel Hesap / Sistem Ortağı">
                        <BadgeCheck size={14} className="fill-[#eab308] text-background drop-shadow-[0_0_4px_rgba(234,179,8,0.5)]" />
                      </span>
                    )}
                    {!(profile.username === 'melih' || profile.username === 'havn') && !(profile.is_gold || profile.role === 'founder') && profile.is_verified && (
                      <span className="flex-shrink-0 align-middle inline-flex" title="Doğrulanmış Üye">
                        <BadgeCheck size={14} className="fill-[#0ea5e9] text-background drop-shadow-[0_0_4px_rgba(14,165,233,0.5)]" />
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground font-mono leading-none">@{profile.username}</p>
                </div>

                {/* Bio */}
                {profile.bio && (
                  <p className="text-xs text-muted-foreground/90 line-clamp-3 leading-relaxed whitespace-pre-wrap">
                    {profile.bio.split('\u200B')[0]}
                  </p>
                )}

                {/* Follow Stats */}
                <div className="flex items-center gap-4 text-xs select-none">
                  <span className="text-muted-foreground">
                    <strong className="text-foreground font-bold">{followingCount}</strong> Takip edilen
                  </span>
                  <span className="text-muted-foreground">
                    <strong className="text-foreground font-bold">{formatCompact(followerCount)}</strong> Takipçi
                  </span>
                </div>

                {/* Footer Action */}
                <div className="pt-2 border-t border-border/40">
                  <Link 
                    href={`/profile/${profile.username}`}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl border border-border bg-muted/40 hover:bg-muted hover:border-foreground/20 text-xs font-bold text-foreground transition-all duration-150 select-none cursor-pointer"
                  >
                    <span>🧭</span> Profil Özeti
                  </Link>
                </div>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground text-center py-4">Profil yüklenemedi.</div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function formatCompact(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + ' M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + ' B'
  }
  return num.toString()
}
