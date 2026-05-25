'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { NewPostForm } from '@/components/havn/NewPostForm'
import { PostFeed } from '@/components/havn/PostFeed'
import { CommunityChat } from '@/components/havn/CommunityChat'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

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
}

export function CommunityContentTabs({
  communityId,
  communitySlug,
  currentUser,
  isMember,
  isAdmin,
  membershipRole,
  initialPosts,
  activeSort
}: CommunityContentTabsProps) {
  const [activeTab, setActiveTab] = useState<'posts' | 'chat' | 'announcements'>('posts')
  const [unreadChatCount, setUnreadChatCount] = useState(0)
  const [unreadAnnCount, setUnreadAnnCount] = useState(0)
  const activeTabRef = useRef(activeTab)
  const supabase = createClient()

  useEffect(() => {
    activeTabRef.current = activeTab
  }, [activeTab])

  // Initial fetch and Realtime subscription
  useEffect(() => {
    if (!currentUser || !isMember) return

    const lastChatRead = localStorage.getItem(`havn_last_read_${communityId}_general`)
    const lastAnnRead = localStorage.getItem(`havn_last_read_${communityId}_announcement`)

    const chatReadTime = lastChatRead || new Date().toISOString()
    const annReadTime = lastAnnRead || new Date().toISOString()

    if (!lastChatRead) localStorage.setItem(`havn_last_read_${communityId}_general`, chatReadTime)
    if (!lastAnnRead) localStorage.setItem(`havn_last_read_${communityId}_announcement`, annReadTime)

    async function fetchUnreadCounts() {
      try {
        const [chatRes, annRes] = await Promise.all([
          supabase
            .from('community_messages')
            .select('id', { count: 'exact', head: true })
            .eq('community_id', communityId)
            .eq('type', 'general')
            .gt('created_at', chatReadTime)
            .neq('user_id', currentUser?.id),
          supabase
            .from('community_messages')
            .select('id', { count: 'exact', head: true })
            .eq('community_id', communityId)
            .eq('type', 'announcement')
            .gt('created_at', annReadTime)
            .neq('user_id', currentUser?.id)
        ])

        if (chatRes.count) setUnreadChatCount(chatRes.count)
        if (annRes.count) setUnreadAnnCount(annRes.count)
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
          } else if (newMsg.type === 'announcement' && activeTabRef.current !== 'announcements') {
            setUnreadAnnCount(prev => prev + 1)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [communityId, currentUser?.id, isMember])

  // Clear unread indicator when active tab changes to the chat/announcement tab
  useEffect(() => {
    if (!currentUser || !isMember) return

    if (activeTab === 'chat') {
      setUnreadChatCount(0)
      localStorage.setItem(`havn_last_read_${communityId}_general`, new Date().toISOString())
    } else if (activeTab === 'announcements') {
      setUnreadAnnCount(0)
      localStorage.setItem(`havn_last_read_${communityId}_announcement`, new Date().toISOString())
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
            <button
              onClick={() => setActiveTab('announcements')}
              className={cn(
                "px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5",
                activeTab === 'announcements' ? "text-white shadow-md font-black" : "text-muted-foreground hover:text-foreground"
              )}
              style={activeTab === 'announcements' ? { background: 'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))' } : {}}
            >
              <span>Duyurular</span>
              {unreadAnnCount > 0 && (
                <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", activeTab === 'announcements' ? "bg-white" : "bg-rose-500")} />
              )}
            </button>
          </>
        )}
      </div>

      {/* Tab Contents */}
      <div>
        {activeTab === 'posts' && (
          <div className="space-y-4">
            {/* Post form — only if member */}
            {currentUser && isMember && (
              <NewPostForm
                communityId={communityId}
                currentUser={{ username: currentUser.username, avatar_url: currentUser.avatar_url }}
              />
            )}

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
            />
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

        {activeTab === 'announcements' && currentUser && isMember && (
          <CommunityChat
            communityId={communityId}
            type="announcement"
            currentUser={currentUser}
            isAdmin={isAdmin}
            membershipRole={membershipRole}
          />
        )}
      </div>

    </div>
  )
}
