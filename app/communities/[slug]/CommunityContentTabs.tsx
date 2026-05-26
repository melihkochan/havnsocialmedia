'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { motion } from 'framer-motion'
import { NewPostForm } from '@/components/havn/NewPostForm'
import { PostFeed } from '@/components/havn/PostFeed'
import { CommunityChat } from '@/components/havn/CommunityChat'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Megaphone, X, Lock, Clock, Loader2, Plus } from 'lucide-react'
import { parseCommunityDescription } from '@/lib/community-rules'
import { joinCommunity, leaveCommunity } from '@/lib/actions/communities'
import type { FeedContext } from '@/lib/actions/posts'

interface Profile {
  id: string
  username: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  updated_at: string
}

interface CommunityContentTabsProps {
  communityId: string
  communitySlug: string
  currentUser: Profile | null
  isMember: boolean
  isAdmin: boolean
  membershipRole: 'owner' | 'moderator' | 'member' | undefined
  initialPosts: any[]
  activeSort: 'new' | 'popular'
  communityDescription?: string | null
  rules?: any[]
  announcement?: string | null
  communityType?: 'public' | 'request_to_join'
  membershipStatus?: 'pending' | 'approved' | undefined
}

export function CommunityContentTabs({
  communityId,
  communitySlug,
  currentUser,
  isMember,
  isAdmin,
  membershipRole,
  initialPosts,
  activeSort,
  communityDescription,
  rules,
  announcement: propAnnouncement,
  communityType = 'public',
  membershipStatus
}: CommunityContentTabsProps) {
  const [activeTab, setActiveTab] = useState<'posts' | 'chat'>('posts')
  const [unreadChatCount, setUnreadChatCount] = useState(0)
  const activeTabRef = useRef(activeTab)
  const [showAnnouncement, setShowAnnouncement] = useState(true)
  const fallbackData = parseCommunityDescription(communityDescription || null)
  const announcement = propAnnouncement !== undefined && propAnnouncement !== null
    ? propAnnouncement
    : fallbackData.announcement
  const supabase = createClient()

  const [isPending, startTransition] = useTransition()
  const [localStatus, setLocalStatus] = useState<string | undefined>(membershipStatus)

  useEffect(() => {
    setLocalStatus(membershipStatus)
  }, [membershipStatus])

  function handleJoin() {
    startTransition(async () => {
      const res = await joinCommunity(communityId, 'request_to_join')
      if (!res.error) {
        setLocalStatus(res.status ?? 'pending')
      }
    })
  }

  function handleLeave() {
    startTransition(async () => {
      const res = await leaveCommunity(communityId)
      if (!res.error) {
        setLocalStatus(undefined)
      }
    })
  }

  const showLockedState = communityType === 'request_to_join' && !isMember && (localStatus !== 'approved')

  useEffect(() => {
    activeTabRef.current = activeTab
  }, [activeTab])

  // Initial fetch and Realtime subscription
  useEffect(() => {
    if (!currentUser || !isMember) return

    const lastChatRead = localStorage.getItem(`havn_last_read_${communityId}_general`)
    const chatReadTime = lastChatRead || new Date().toISOString()

    if (!lastChatRead) localStorage.setItem(`havn_last_read_${communityId}_general`, chatReadTime)

    async function fetchUnreadCounts() {
      try {
        const { count } = await supabase
          .from('community_messages')
          .select('id', { count: 'exact', head: true })
          .eq('community_id', communityId)
          .eq('type', 'general')
          .gt('created_at', chatReadTime)
          .neq('user_id', currentUser?.id)

        if (count) setUnreadChatCount(count)
      } catch (err) {
        console.error('Error fetching unread counts:', err)
      }
    }

    fetchUnreadCounts()

    const channel = supabase.channel(`community_unread_${communityId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'community_messages',
          filter: `community_id=eq.${communityId}`
        },
        (payload) => {
          const newMsg = payload.new as any
          if (newMsg.user_id === currentUser?.id) return

          if (newMsg.type === 'general' && activeTabRef.current !== 'chat') {
            setUnreadChatCount(prev => prev + 1)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [communityId, currentUser?.id, isMember])

  // Clear unread indicator when active tab changes to the chat tab
  useEffect(() => {
    if (!currentUser || !isMember) return

    if (activeTab === 'chat') {
      setUnreadChatCount(0)
      localStorage.setItem(`havn_last_read_${communityId}_general`, new Date().toISOString())
    }
  }, [activeTab, communityId, currentUser?.id, isMember])

  return (
    <div className="flex flex-col gap-5 w-full">
      
      {/* Navigation Tab Bar */}
      <div className="flex gap-2 p-1 bg-card/60 backdrop-blur-md border border-border/80 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('posts')}
          className={cn(
            "px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer",
            activeTab === 'posts' ? "text-white shadow-md font-black" : "text-muted-foreground hover:text-foreground"
          )}
          style={activeTab === 'posts' ? { background: 'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))' } : {}}
        >
          Gönderiler
        </button>
        {isMember && currentUser && (
          <>
            <button
              onClick={() => setActiveTab('chat')}
              className={cn(
                "px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5",
                activeTab === 'chat' ? "text-white shadow-md font-black" : "text-muted-foreground hover:text-foreground"
              )}
              style={activeTab === 'chat' ? { background: 'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))' } : {}}
            >
              <span>Sohbet</span>
              {unreadChatCount > 0 && (
                <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", activeTab === 'chat' ? "bg-white" : "bg-rose-500")} />
              )}
            </button>
          </>
        )}
      </div>

      {/* Tab Contents */}
      <div>
        {activeTab === 'posts' && (
          <div className="space-y-4">
            {/* Pinned Announcement */}
            {announcement && showAnnouncement && !showLockedState && (
              <div
                className="relative overflow-hidden rounded-2xl p-4 border border-primary/20 bg-card/60 backdrop-blur-md shadow-md flex items-start gap-3 animate-fade-in"
                style={{
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05), inset 0 0 20px rgba(var(--primary-rgb), 0.02)',
                }}
              >
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                  <Megaphone size={14} className="animate-pulse" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-foreground mb-0.5">Topluluk Duyurusu 📢</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{announcement}</p>
                </div>

                <button
                  onClick={() => setShowAnnouncement(false)}
                  className="p-1 rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-accent/50 transition-all cursor-pointer flex-shrink-0"
                  title="Kapat"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Post form — only if member */}
            {currentUser && isMember && !showLockedState && (
              <NewPostForm
                communityId={communityId}
                currentUser={{ username: currentUser.username, avatar_url: currentUser.avatar_url }}
              />
            )}

            {showLockedState ? (
              <div className="bg-card/60 backdrop-blur-md border border-border/80 rounded-2xl p-8 text-center flex flex-col items-center justify-center gap-4 shadow-sm animate-fade-in select-none">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center border border-primary/20 bg-primary/5 text-primary shadow-inner relative"
                  style={{
                    boxShadow: '0 4px 20px rgba(var(--primary-rgb), 0.05)',
                  }}
                >
                  <Lock size={28} className="animate-pulse" />
                </div>
                <div className="max-w-sm space-y-1.5">
                  <h3 className="text-sm font-bold text-foreground">Başvurulu Topluluk 🔒</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {!currentUser
                      ? "Bu topluluk yalnızca onaylı üyelere özeldir. Gönderileri ve diğer içerikleri görmek için giriş yapmalısınız."
                      : localStatus === 'pending'
                      ? "Katılma başvurunuz başarıyla alındı. Topluluk yöneticisinin onayı bekleniyor."
                      : "Bu topluluk yalnızca onaylı üyelere özeldir. Gönderileri ve diğer içerikleri görmek için katılma başvurusu yapmalısınız."}
                  </p>
                </div>

                <div className="mt-2 w-full max-w-[200px]">
                  {!currentUser ? (
                    <Link
                      href="/login"
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md"
                      style={{
                        background: 'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))',
                        color: 'var(--primary-foreground)',
                      }}
                    >
                      Giriş Yap
                    </Link>
                  ) : localStatus === 'pending' ? (
                    <button
                      onClick={handleLeave}
                      disabled={isPending}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border border-border text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-all cursor-pointer bg-muted/40"
                    >
                      {isPending ? <Loader2 size={12} className="animate-spin" /> : <Clock size={12} />}
                      Başvuruyu Geri Çek
                    </button>
                  ) : (
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={handleJoin}
                      disabled={isPending}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                      style={{
                        background: 'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))',
                        color: 'var(--primary-foreground)',
                      }}
                    >
                      {isPending ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                      Katılma Başvurusu Yap
                    </motion.button>
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* Posts Header & Sorting */}
                <div className="flex items-center justify-between gap-3 flex-wrap mt-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground tracking-wider uppercase">
                      {activeSort === 'popular' ? 'Popüler Gönderiler' : 'Son Gönderiler'}
                    </span>
                  </div>

                  {/* Sort Tabs */}
                  <div className="flex items-center gap-1 p-1 bg-card/60 backdrop-blur-md border border-border/80 rounded-2xl shadow-sm">
                    <Link
                      href={`/communities/${communitySlug}?sortBy=new`}
                      className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all duration-200 ${
                        activeSort === 'new'
                          ? 'text-white shadow-md font-black'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                      style={activeSort === 'new' ? { background: 'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))' } : {}}
                    >
                      Yeni
                    </Link>
                    <Link
                      href={`/communities/${communitySlug}?sortBy=popular`}
                      className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all duration-200 ${
                        activeSort === 'popular'
                          ? 'text-white shadow-md font-black'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                      style={activeSort === 'popular' ? { background: 'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))' } : {}}
                    >
                      Popüler
                    </Link>
                  </div>
                </div>

                {/* Post Feed */}
                <PostFeed
                  posts={initialPosts}
                  currentUserId={currentUser?.id}
                  currentUserRole={isMember ? membershipRole : undefined}
                  pinContext="community"
                  communityId={communityId}
                  feedContext={{ type: 'community', communityId, sortBy: activeSort } satisfies FeedContext}
                  initialHasMore={initialPosts.length >= 20}
                />
              </>
            )}
          </div>
        )}

        {activeTab === 'chat' && currentUser && isMember && (
          <CommunityChat
            communityId={communityId}
            type="general"
            currentUser={currentUser}
            isAdmin={isAdmin}
            membershipRole={membershipRole}
          />
        )}
      </div>

    </div>
  )
}
