'use client'

import { useState, useEffect, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Users, Eye, Loader2, UserPlus, UserMinus } from 'lucide-react'
import { getFollowersProfiles, getFollowingProfiles, followUser, unfollowUser } from '@/lib/actions/follows'
import { ProfileName } from '@/components/havn/ProfileName'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface Profile {
  id: string
  username: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  updated_at: string
}

interface FollowStatsModalProps {
  profileId: string
  currentUserId?: string
  postCount: number
  initialFollowersCount: number
  initialFollowingCount: number
  profileViews: number | null
  isOwnProfile: boolean
}

export function FollowStatsModal({
  profileId,
  currentUserId,
  postCount,
  initialFollowersCount,
  initialFollowingCount,
  profileViews,
  isOwnProfile
}: FollowStatsModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'followers' | 'following'>('followers')
  const [loading, setLoading] = useState(false)
  const [usersList, setUsersList] = useState<Profile[]>([])
  
  // Logged in user's following list (to show Follow/Unfollow action next to users in the lists)
  const [myFollowingIds, setMyFollowingIds] = useState<string[]>([])
  const [actionPendingId, setActionPendingId] = useState<string | null>(null)

  const [followersCount, setFollowersCount] = useState(initialFollowersCount)
  const [followingCount, setFollowingCount] = useState(initialFollowingCount)

  // Sync count props when they change (e.g. from FollowButton on parent page)
  useEffect(() => {
    setFollowersCount(initialFollowersCount)
  }, [initialFollowersCount])

  useEffect(() => {
    setFollowingCount(initialFollowingCount)
  }, [initialFollowingCount])

  const openModal = (tab: 'followers' | 'following') => {
    setActiveTab(tab)
    setIsOpen(true)
  }

  const closeModal = () => {
    setIsOpen(false)
    setUsersList([])
  }

  // Load followers/following lists when modal is open and activeTab changes
  useEffect(() => {
    if (!isOpen) return

    async function loadData() {
      setLoading(true)
      try {
        const [users, myFollowing] = await Promise.all([
          activeTab === 'followers'
            ? getFollowersProfiles(profileId)
            : getFollowingProfiles(profileId),
          currentUserId
            ? getFollowingProfiles(currentUserId)
            : Promise.resolve([])
        ])
        setUsersList(users as any as Profile[])
        setMyFollowingIds((myFollowing as any as Profile[]).map(u => u.id))
      } catch (err) {
        console.error('Error loading follow list:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [isOpen, activeTab, profileId, currentUserId])

  async function handleFollowAction(targetUser: Profile, isFollowing: boolean) {
    if (actionPendingId) return
    setActionPendingId(targetUser.id)

    try {
      if (isFollowing) {
        const res = await unfollowUser(targetUser.id)
        if (!res.error) {
          setMyFollowingIds(prev => prev.filter(id => id !== targetUser.id))
          // If viewing own profile's "following" list, remove them from list locally
          if (isOwnProfile && activeTab === 'following') {
            setUsersList(prev => prev.filter(u => u.id !== targetUser.id))
            setFollowingCount(prev => Math.max(0, prev - 1))
          }
          // If viewing another profile, just update counts accordingly if target user is us
          if (targetUser.id === currentUserId) {
            setFollowersCount(prev => Math.max(0, prev - 1))
          }
        }
      } else {
        const res = await followUser(targetUser.id)
        if (!res.error) {
          setMyFollowingIds(prev => [...prev, targetUser.id])
          if (isOwnProfile && activeTab === 'following') {
            setFollowingCount(prev => prev + 1)
          }
        }
      }
    } catch (err) {
      console.error('Follow action error:', err)
    } finally {
      setActionPendingId(null)
    }
  }

  return (
    <>
      <div className="flex gap-8 mt-5 pt-4 border-t border-border/40 select-none">
        <div className="flex flex-col text-left">
          <p className="text-base font-black text-foreground">{postCount}</p>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Gönderi</p>
        </div>
        <button
          onClick={() => openModal('followers')}
          className="flex flex-col text-left hover:opacity-85 active:scale-95 transition-all cursor-pointer focus:outline-none"
        >
          <p className="text-base font-black text-foreground">{followersCount}</p>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">Takipçi</p>
        </button>
        <button
          onClick={() => openModal('following')}
          className="flex flex-col text-left hover:opacity-85 active:scale-95 transition-all cursor-pointer focus:outline-none"
        >
          <p className="text-base font-black text-foreground">{followingCount}</p>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">Takip</p>
        </button>
      </div>

      {/* Modal Overlay & Card */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            {/* Click-out backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="absolute inset-0 cursor-default"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="relative z-10 bg-card border border-border rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              {/* Header */}
              <div className="p-5 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-primary" />
                  <h3 className="font-bold text-sm text-foreground">Kullanıcı Listeleri</h3>
                </div>
                <button
                  onClick={closeModal}
                  className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-border bg-muted/20">
                <button
                  onClick={() => setActiveTab('followers')}
                  className={cn(
                    "flex-1 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer",
                    activeTab === 'followers'
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  Takipçiler ({followersCount})
                </button>
                <button
                  onClick={() => setActiveTab('following')}
                  className={cn(
                    "flex-1 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer",
                    activeTab === 'following'
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  Takip Edilenler ({followingCount})
                </button>
              </div>

              {/* User List scroll container */}
              <div className="p-4 overflow-y-auto max-h-[380px] min-h-[220px] flex flex-col gap-2 scrollbar-thin">
                {loading ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-10 gap-2 text-xs text-muted-foreground">
                    <Loader2 size={20} className="animate-spin text-primary" />
                    Yükleniyor...
                  </div>
                ) : usersList.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-xs text-muted-foreground">
                    <Users size={32} className="opacity-30 mb-2" />
                    Bu liste şu anda boş.
                  </div>
                ) : (
                  usersList.map((user) => {
                    const isMe = user.id === currentUserId
                    const isFollowing = myFollowingIds.includes(user.id)
                    const isPending = actionPendingId === user.id

                    return (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-2 rounded-xl hover:bg-muted/40 transition-colors border border-transparent hover:border-border/30"
                      >
                        {/* User Details Link */}
                        <Link
                          href={`/profile/${user.username}`}
                          onClick={closeModal}
                          className="flex items-center gap-3 min-w-0 hover:opacity-85 transition-opacity"
                        >
                          {user.avatar_url ? (
                            <img src={user.avatar_url} alt={user.username} className="w-9 h-9 rounded-full object-cover" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                              {user.username.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <ProfileName profile={user} layout="stacked" nameClassName="text-xs font-bold truncate max-w-[140px]" showHandle={true} />
                        </Link>

                        {/* Follow Button */}
                        {currentUserId && !isMe && (
                          <motion.button
                            whileTap={{ scale: 0.97 }}
                            disabled={isPending}
                            onClick={() => handleFollowAction(user, isFollowing)}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 shadow-sm disabled:opacity-50 select-none",
                              isFollowing
                                ? "border border-border/80 text-muted-foreground hover:text-destructive hover:border-destructive/30 hover:bg-destructive/5"
                                : "text-primary-foreground"
                            )}
                            style={!isFollowing && !isPending ? {
                              background: 'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))'
                            } : {}}
                          >
                            {isPending ? (
                              <Loader2 size={10} className="animate-spin" />
                            ) : isFollowing ? (
                              <>
                                <UserMinus size={10} />
                                Takibi Bırak
                              </>
                            ) : (
                              <>
                                <UserPlus size={10} />
                                Takip Et
                              </>
                            )}
                          </motion.button>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
