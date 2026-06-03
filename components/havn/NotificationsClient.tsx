'use client'

import { useEffect, useState } from 'react'
import { Bell, Heart, MessageCircle, UserPlus, CheckCircle2, Loader2, Repeat, Trash2, Pin, UserCheck, HelpCircle, Shield, Sparkles, AlertTriangle } from 'lucide-react'
import { markNotificationsAsRead, clearAllNotifications, deleteNotification } from '@/lib/actions/notifications'
import { followUser, approveFollowRequest, declineFollowRequest } from '@/lib/actions/follows'
import type { EnrichedProfile } from '@/lib/profile-enrich'
import Link from 'next/link'
import { FormattedMessage } from '@/components/havn/FormattedMessage'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useGlobalStore } from '@/lib/store/useGlobalStore'
import { useLocale } from '@/lib/i18n/LocaleContext'
import { t, type Locale } from '@/lib/i18n'

type NotificationItem = {
  id: string
  created_at: string
  type: 'like' | 'comment' | 'join_request' | 'approved' | 'repost' | 'comment_like' | 'reply' | 'post_removed' | 'post_pinned' | 'follow' | 'support_reply' | 'support_ticket' | 'warning' | 'xp_reward' | 'system_alert'
  is_read: boolean
  post_id: string | null
  comment_id: string | null
  actor_id: string
  message?: string | null
  post_preview?: string | null
  communities?: { name: string; slug: string } | null
  actor: {
    username: string
    avatar_url: string | null
  } | null
  posts: {
    content: string | null
  } | null
  comments?: {
    content: string
  } | null
  support_ticket?: {
    id: string
    status: 'open' | 'replied' | 'closed'
    subject: string
  } | null
}

type GroupedNotification = {
  id: string
  created_at: string
  is_read: boolean
  type: NotificationItem['type']
  post_id: string | null
  comment_id: string | null
  actor_id: string
  message?: string | null
  post_preview?: string | null
  communities?: NotificationItem['communities']
  posts: NotificationItem['posts']
  comments?: NotificationItem['comments']
  support_ticket?: NotificationItem['support_ticket']
  actors: {
    id: string
    username: string
    avatar_url: string | null
  }[]
  ids: string[]
}

function getGroupedNotificationText(group: GroupedNotification, locale: Locale) {
  const count = group.actors.length
  const actor1 = group.actors[0]?.username ?? (locale === 'tr' ? 'Anonim' : 'Anonymous')
  
  let nameSpan: React.ReactNode = ''
  if (count === 1) {
    nameSpan = (
      <Link href={`/profile/${actor1}`} className="font-bold text-foreground hover:underline">
        {actor1}
      </Link>
    )
  } else if (count === 2) {
    const actor2 = group.actors[1]?.username ?? (locale === 'tr' ? 'Anonim' : 'Anonymous')
    nameSpan = (
      <>
        <Link href={`/profile/${actor1}`} className="font-bold text-foreground hover:underline">
          {actor1}
        </Link>{' '}
        {locale === 'tr' ? 've' : 'and'}{' '}
        <Link href={`/profile/${actor2}`} className="font-bold text-foreground hover:underline">
          {actor2}
        </Link>
      </>
    )
  } else {
    nameSpan = (
      <>
        <Link href={`/profile/${actor1}`} className="font-bold text-foreground hover:underline">
          {actor1}
        </Link>{' '}
        {locale === 'tr' ? (
          <>ve <span className="font-bold text-foreground">diğer {count - 1} kişi</span></>
        ) : (
          <>and <span className="font-bold text-foreground">{count - 1} others</span></>
        )}
      </>
    )
  }

  let actionText = ''
  if (group.type === 'like') {
    actionText = locale === 'tr' ? ' gönderini beğendi ❤️' : ' liked your post ❤️'
  } else if (group.type === 'comment_like') {
    actionText = locale === 'tr' ? ' yanıtını beğendi ❤️' : ' liked your reply ❤️'
  } else if (group.type === 'support_reply') {
    actionText = locale === 'tr' ? ' yeni öneriler paylaştı ✨' : ' shared new suggestions ✨'
  }

  return (
    <span>
      {nameSpan}
      {actionText}
    </span>
  )
}

function groupNotifications(items: NotificationItem[]): GroupedNotification[] {
  const groups: GroupedNotification[] = []
  const groupMap = new Map<string, GroupedNotification>()

  for (const item of items) {
    let groupKey: string | null = null
    if (item.type === 'like' && item.post_id) {
      groupKey = `like_post_${item.post_id}`
    } else if (item.type === 'comment_like' && item.comment_id) {
      groupKey = `comment_like_comment_${item.comment_id}`
    } else if (item.type === 'support_reply' && item.message && (
      item.message.includes('Yeni bir öneri paylaşıldı') || 
      item.message.includes('yeni bir öneri') ||
      item.message.includes('Yeni bir öneri') ||
      item.message.includes('A new suggestion') ||
      item.message.includes('new suggestion')
    )) {
      groupKey = 'new_suggestions_group'
    }

    if (groupKey) {
      const existing = groupMap.get(groupKey)
      if (existing) {
        if (!existing.actors.some(a => a.id === item.actor_id)) {
          existing.actors.push({
            id: item.actor_id,
            username: item.actor?.username ?? 'Anonim',
            avatar_url: item.actor?.avatar_url ?? null
          })
        }
        existing.ids.push(item.id)
        if (!item.is_read) {
          existing.is_read = false
        }
        if (new Date(item.created_at) > new Date(existing.created_at)) {
          existing.created_at = item.created_at
          existing.id = item.id
        }
      } else {
        const newGroup: GroupedNotification = {
          id: item.id,
          created_at: item.created_at,
          is_read: item.is_read,
          type: item.type,
          post_id: item.post_id,
          comment_id: item.comment_id ?? null,
          actor_id: item.actor_id,
          message: item.message,
          post_preview: item.post_preview,
          communities: item.communities,
          posts: item.posts,
          comments: item.comments,
          support_ticket: item.support_ticket,
          actors: [{
            id: item.actor_id,
            username: item.actor?.username ?? 'Anonim',
            avatar_url: item.actor?.avatar_url ?? null
          }],
          ids: [item.id]
        }
        groups.push(newGroup)
        groupMap.set(groupKey, newGroup)
      }
    } else {
      groups.push({
        id: item.id,
        created_at: item.created_at,
        is_read: item.is_read,
        type: item.type,
        post_id: item.post_id,
        comment_id: item.comment_id ?? null,
        actor_id: item.actor_id,
        message: item.message,
        post_preview: item.post_preview,
        communities: item.communities,
        posts: item.posts,
        comments: item.comments,
        support_ticket: item.support_ticket,
        actors: [{
          id: item.actor_id,
          username: item.actor?.username ?? 'Anonim',
          avatar_url: item.actor?.avatar_url ?? null
        }],
        ids: [item.id]
      })
    }
  }

  return groups.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

interface NotificationsClientProps {
  initialNotifications: NotificationItem[]
  followingIds: string[]
  currentUser?: EnrichedProfile | null
}

function formatRelativeTime(dateStr: string, locale: Locale) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (locale === 'tr') {
    if (diffMins < 1) return 'Şimdi'
    if (diffMins < 60) return `${diffMins}d önce`
    if (diffHours < 24) return `${diffHours}s önce`
    if (diffDays === 1) return 'Dün'
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
  } else {
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays === 1) return 'Yesterday'
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
  }
}

import { ConfirmationModal } from '@/components/havn/ConfirmationModal'

export function NotificationsClient({ initialNotifications, followingIds, currentUser }: NotificationsClientProps) {
  const { locale } = useLocale()
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications)
  const [followingList, setFollowingList] = useState<string[]>(followingIds || [])
  const [followRequestsList, setFollowRequestsList] = useState<string[]>(currentUser?.follow_requests || [])
  const [actionActorId, setActionActorId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'likes' | 'comments' | 'follows' | 'system'>('all')
  const [isClearing, setIsClearing] = useState(false)

  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean
    title: string
    message: string
    confirmText?: string
    cancelText?: string
    onConfirm: () => void
    isDanger?: boolean
    isAlert?: boolean
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    isDanger: true,
    isAlert: false
  })

  const showErrorAlert = (errorMsg: string) => {
    setModalConfig({
      isOpen: true,
      title: t('ui.error', locale),
      message: errorMsg || (locale === 'tr' ? 'Bir hata oluştu. Lütfen tekrar deneyin.' : 'Something went wrong. Please try again.'),
      confirmText: locale === 'tr' ? 'Tamam' : 'OK',
      onConfirm: () => {},
      isDanger: false,
      isAlert: true
    })
  }

  async function handleAcceptFollow(actorId: string, notifId: string) {
    if (actionActorId) return
    setActionActorId(`accept-${actorId}`)
    const res = await approveFollowRequest(actorId)
    setActionActorId(null)
    if (!res.error) {
      setFollowRequestsList(prev => prev.filter(id => id !== actorId))
    } else {
      showErrorAlert(res.error)
    }
  }

  async function handleDeclineFollow(actorId: string, notifId: string) {
    if (actionActorId) return
    setActionActorId(`decline-${actorId}`)
    const res = await declineFollowRequest(actorId)
    setActionActorId(null)
    if (!res.error) {
      setFollowRequestsList(prev => prev.filter(id => id !== actorId))
    } else {
      showErrorAlert(res.error)
    }
  }

  async function handleDeleteNotification(notifIds: string[]) {
    setModalConfig({
      isOpen: true,
      title: locale === 'tr' ? 'Bildirimi Sil' : 'Delete Notification',
      message: locale === 'tr' ? 'Bu bildirimi silmek istediğinizden emin misiniz?' : 'Are you sure you want to delete this notification?',
      confirmText: locale === 'tr' ? 'Sil' : 'Delete',
      cancelText: locale === 'tr' ? 'İptal' : 'Cancel',
      isDanger: true,
      onConfirm: async () => {
        try {
          await Promise.all(notifIds.map(id => deleteNotification(id)))
          setNotifications(prev => prev.filter(n => !notifIds.includes(n.id)))
        } catch (e) {
          showErrorAlert(locale === 'tr' ? 'Bildirim silinirken bir hata oluştu.' : 'An error occurred while deleting the notification.')
        }
      }
    })
  }

  const [notifPrefs, setNotifPrefs] = useState({
    all: true,
    support: true,
    likes: true,
    comments: true,
  })
  const [mutedUsers, setMutedUsers] = useState<string[]>([])

  useEffect(() => {
    const savedPrefs = localStorage.getItem('havn_notif_prefs')
    if (savedPrefs) {
      try {
        setNotifPrefs(JSON.parse(savedPrefs))
      } catch (e) {}
    }
    const savedMuted = localStorage.getItem('havn_muted_users')
    if (savedMuted) {
      try {
        setMutedUsers(JSON.parse(savedMuted))
      } catch (e) {}
    }
  }, [])

  const setUnreadNotificationsCount = useGlobalStore((state) => state.setUnreadNotificationsCount)

  useEffect(() => {
    // Mark notifications as read when the user views the page
    const clearNotifications = async () => {
      await markNotificationsAsRead()
      setUnreadNotificationsCount(0)
    }
    clearNotifications()
  }, [setUnreadNotificationsCount])

  // Real-time Notification Streaming
  useEffect(() => {
    if (!currentUser?.id) return

    const supabase = createClient()
    const channelToken = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    
    const channel = supabase.channel(`notifications_realtime_list_${channelToken}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        async (payload) => {
          const newNotif = payload.new as any
          if (newNotif?.user_id !== currentUser.id) return

          const newNotifId = newNotif.id
          
          // Fetch enriched notification details
          const { getSingleNotification } = await import('@/lib/actions/notifications')
          const enrichedNotif = await getSingleNotification(newNotifId)
          if (enrichedNotif) {
            setNotifications(prev => {
              if (prev.some(n => n.id === enrichedNotif.id)) return prev
              return [enrichedNotif as any, ...prev]
            })
            // Auto mark read as user is already viewing the page
            await markNotificationsAsRead()
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'notifications' },
        (payload) => {
          const deletedNotifId = payload.old.id
          setNotifications(prev => prev.filter(n => n.id !== deletedNotifId))
        }
      )
      .subscribe((status) => {
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentUser?.id])

  async function handleFollowBack(actorId: string) {
    if (actionActorId) return
    setActionActorId(actorId)
    const res = await followUser(actorId)
    setActionActorId(null)
    if (!res.error) {
      setFollowingList(prev => [...prev, actorId])
    } else {
      showErrorAlert(res.error)
    }
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center bg-card border border-border rounded-2xl p-8">
        <div 
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 text-muted-foreground/60"
          style={{ background: 'color-mix(in oklch, var(--border) 40%, transparent)' }}
        >
          <Bell size={28} className="opacity-80" />
        </div>
        <h3 className="text-base font-bold text-foreground mb-1">{t('notifications.empty', locale)}</h3>
        <p className="text-xs text-muted-foreground max-w-[280px]">
          {locale === 'tr' 
            ? 'Beğeniler, yorumlar ve topluluk üyelik güncellemeleri burada görünecektir.'
            : 'Likes, comments, and community membership updates will appear here.'}
        </p>
      </div>
    )
  }

  const filteredNotifications = notifications.filter(notif => {
    // 1. General notification toggle
    if (!notifPrefs.all) return false

    // 2. Mute list filter
    const actorUsername = notif.actor?.username?.toLowerCase()
    if (actorUsername && mutedUsers.includes(actorUsername)) return false

    // 3. Category filters
    if (!notifPrefs.support && (notif.type === 'support_reply' || notif.type === 'support_ticket')) return false
    if (!notifPrefs.likes && (notif.type === 'like' || notif.type === 'comment_like')) return false
    if (!notifPrefs.comments && (notif.type === 'comment' || notif.type === 'reply')) return false

    // 4. Tab filters on page
    if (filter === 'all') return true
    if (filter === 'likes') return notif.type === 'like' || notif.type === 'comment_like'
    if (filter === 'comments') return notif.type === 'comment' || notif.type === 'reply'
    if (filter === 'follows') return notif.type === 'follow'
    if (filter === 'system') {
      return ['join_request', 'approved', 'repost', 'post_removed', 'post_pinned', 'support_reply', 'support_ticket', 'warning', 'xp_reward', 'system_alert'].includes(notif.type)
    }
    return true
  })

  async function handleClearAll() {
    setModalConfig({
      isOpen: true,
      title: locale === 'tr' ? 'Tümünü Temizle' : 'Clear All',
      message: locale === 'tr' ? 'Tüm bildirimlerinizi kalıcı olarak silmek istediğinizden emin misiniz?' : 'Are you sure you want to permanently delete all your notifications?',
      confirmText: locale === 'tr' ? 'Temizle' : 'Clear',
      cancelText: locale === 'tr' ? 'İptal' : 'Cancel',
      isDanger: true,
      onConfirm: async () => {
        setIsClearing(true)
        const res = await clearAllNotifications()
        setIsClearing(false)
        if (!res.error) {
          setNotifications([])
        } else {
          showErrorAlert(res.error)
        }
      }
    })
  }

  const activeNotifs = notifications.filter(notif => {
    if (!notifPrefs.all) return false
    const actorUsername = notif.actor?.username?.toLowerCase()
    if (actorUsername && mutedUsers.includes(actorUsername)) return false
    return true
  })

  const countAll = activeNotifs.length
  const countLikes = activeNotifs.filter(n => n.type === 'like' || n.type === 'comment_like').length
  const countComments = activeNotifs.filter(n => n.type === 'comment' || n.type === 'reply').length
  const countFollows = activeNotifs.filter(n => n.type === 'follow').length
  const countSystem = activeNotifs.filter(n => ['join_request', 'approved', 'repost', 'post_removed', 'post_pinned', 'support_reply', 'support_ticket', 'warning', 'xp_reward', 'system_alert'].includes(n.type)).length

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between px-1 gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-black text-foreground">{t('notifications.title', locale)}</h1>
          <p className="text-[10px] text-muted-foreground font-semibold">
            {locale === 'tr' ? 'Son 50 bildirim gösteriliyor' : 'Showing last 50 notifications'}
          </p>
        </div>
        
        {notifications.length > 0 && (
          <button
            onClick={handleClearAll}
            disabled={isClearing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border border-destructive/20 hover:border-destructive/40 text-destructive bg-destructive/5 hover:bg-destructive/10 rounded-xl transition-all cursor-pointer disabled:opacity-50 select-none active:scale-95"
          >
            {isClearing ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
            {locale === 'tr' ? 'Tümünü Temizle' : 'Clear All'}
          </button>
        )}
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-1.5 p-1 bg-card/40 border border-border/60 rounded-xl w-fit">
        {[
          { key: 'all', label: locale === 'tr' ? 'Tümü' : 'All', count: countAll },
          { key: 'likes', label: locale === 'tr' ? 'Beğeniler' : 'Likes', count: countLikes },
          { key: 'comments', label: locale === 'tr' ? 'Yorumlar' : 'Comments', count: countComments },
          { key: 'follows', label: locale === 'tr' ? 'Takip' : 'Follows', count: countFollows },
          { key: 'system', label: locale === 'tr' ? 'Destek, Öneri & Sistem' : 'Support, Suggestion & System', count: countSystem }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as any)}
            className={cn(
              "px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5",
              filter === tab.key 
                ? "bg-background text-foreground shadow-sm" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span>{tab.label}</span>
            {tab.count > 0 && (
              <span className={cn(
                "px-1.5 py-0.5 rounded-md text-[9px] font-black leading-none",
                filter === tab.key ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              )}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {groupNotifications(filteredNotifications).map((group, index) => {
            const notif = group
            const username = group.actors[0]?.username ?? (locale === 'tr' ? 'Anonim' : 'Anonymous')
            const avatarUrl = group.actors[0]?.avatar_url
            const community = Array.isArray(notif.communities)
              ? notif.communities[0]
              : notif.communities
            const displayPreview =
              notif.comments?.content ||
              notif.posts?.content ||
              notif.post_preview ||
              null

            // Select icon and styles based on type
            let icon = <Bell size={14} />
            let iconBg = 'bg-muted/15 text-muted-foreground'
            let contentText: string | React.ReactNode = ''

            switch (notif.type) {
              case 'like': {
                const count = group.actors.length
                if (count === 1) {
                  const reaction = notif.message
                  if (reaction && reaction !== 'like') {
                    icon = <span className="text-sm select-none">{reaction}</span>
                    iconBg = 'bg-amber-500/10 text-amber-500 border border-amber-500/25'
                    let verb = ''
                    if (locale === 'tr') {
                      if (reaction === '🔥') verb = 'gönderine alev attı 🔥'
                      else if (reaction === '😂') verb = 'gönderine güldü 😂'
                      else if (reaction === '😮') verb = 'gönderine şaşırdı 😮'
                      else if (reaction === '😢') verb = 'gönderine üzüldü 😢'
                      else verb = `gönderine ${reaction} tepkisi verdi`
                    } else {
                      if (reaction === '🔥') verb = 'reacted with 🔥 to your post'
                      else if (reaction === '😂') verb = 'reacted with 😂 to your post'
                      else if (reaction === '😮') verb = 'reacted with 😮 to your post'
                      else if (reaction === '😢') verb = 'reacted with 😢 to your post'
                      else verb = `reacted with ${reaction} to your post`
                    }
                    contentText = verb
                  } else {
                    icon = <Heart size={14} className="fill-current" />
                    iconBg = 'bg-rose-500/10 text-rose-500 border border-rose-500/25'
                    contentText = locale === 'tr' ? 'gönderini beğendi ❤️' : 'liked your post ❤️'
                  }
                } else {
                  icon = <Heart size={14} className="fill-current text-rose-500" />
                  iconBg = 'bg-rose-500/10 text-rose-500 border border-rose-500/25'
                  contentText = getGroupedNotificationText(group, locale)
                }
                break
              }
              case 'comment':
                icon = <MessageCircle size={14} />
                iconBg = 'bg-blue-500/10 text-blue-500 border border-blue-500/25'
                contentText = locale === 'tr' ? 'gönderine yorum yaptı' : 'commented on your post'
                break
              case 'join_request':
                icon = <UserPlus size={14} />
                iconBg = 'bg-amber-500/10 text-amber-500 border border-amber-500/25'
                contentText = community
                  ? (locale === 'tr' ? `${community.name} topluluğuna katılım başvurusu yaptı` : `requested to join the ${community.name} community`)
                  : (locale === 'tr' ? 'topluluğuna katılım başvurusu yaptı' : 'requested to join the community')
                break
              case 'approved':
                icon = <CheckCircle2 size={14} />
                iconBg = 'bg-green-500/10 text-green-500 border border-green-500/25'
                contentText = community
                  ? (locale === 'tr' ? `${community.name} topluluğu katılım başvurunu onayladı` : `approved your request to join ${community.name}`)
                  : (locale === 'tr' ? 'takip isteğini onayladı' : 'approved your follow request')
                break
              case 'repost':
                icon = <Repeat size={14} />
                iconBg = 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/25'
                contentText = locale === 'tr' ? 'gönderini yeniden paylaştı' : 'reposted your post'
                break
              case 'comment_like':
                if (group.actors.length === 1) {
                  icon = <Heart size={14} className="fill-current" />
                  iconBg = 'bg-rose-500/10 text-rose-500 border border-rose-500/25'
                  contentText = locale === 'tr' ? 'yorumunu beğendi' : 'liked your comment'
                } else {
                  icon = <Heart size={14} className="fill-current text-rose-500" />
                  iconBg = 'bg-rose-500/10 text-rose-500 border border-rose-500/25'
                  contentText = getGroupedNotificationText(group, locale)
                }
                break
              case 'reply':
                icon = <MessageCircle size={14} />
                iconBg = 'bg-blue-500/10 text-blue-500 border border-blue-500/25'
                contentText = locale === 'tr' ? 'yorumuna yanıt verdi' : 'replied to your comment'
                break
              case 'post_removed': {
                const communityName = community?.name ?? (locale === 'tr' ? 'bir topluluk' : 'a community')
                icon = <Trash2 size={14} />
                iconBg = 'bg-destructive/10 text-destructive border border-destructive/25'
                contentText = locale === 'tr' 
                  ? `${communityName} topluluğundaki gönderini kaldırdı` 
                  : `removed your post in the ${communityName} community`
                break
              }
              case 'post_pinned': {
                const communityName = community?.name ?? (locale === 'tr' ? 'bir topluluk' : 'a community')
                icon = <Pin size={14} className="fill-current" />
                iconBg = 'bg-primary/10 text-primary border border-primary/25'
                contentText = locale === 'tr' 
                  ? `${communityName} topluluğundaki gönderini sabitledi` 
                  : `pinned your post in the ${communityName} community`
                break
              }
              case 'follow': {
                const isRequest = followRequestsList.includes(notif.actor_id)
                icon = <UserPlus size={14} />
                iconBg = 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/25'
                contentText = isRequest 
                  ? (locale === 'tr' ? 'sana takip isteği gönderdi' : 'sent you a follow request') 
                  : (locale === 'tr' ? 'seni takip etmeye başladı' : 'started following you')
                break
              }
              case 'warning': {
                icon = <AlertTriangle size={14} className="text-amber-500" />
                iconBg = 'bg-amber-500/10 text-amber-500 border border-amber-500/25'
                contentText = (
                  <span className="flex items-center gap-1.5 flex-wrap">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-black bg-rose-500/15 text-rose-500 border border-rose-500/25 select-none uppercase tracking-wider">
                      {locale === 'tr' ? 'Hesap Uyarısı' : 'Account Warning'}
                    </span>
                    <span className="font-semibold text-foreground/90">{notif.message ?? (locale === 'tr' ? 'Hesabınız kuralları ihlal ettiği için uyarıldı.' : 'Your account was warned for violating guidelines.')}</span>
                  </span>
                )
                break
              }
              case 'xp_reward': {
                icon = <Sparkles size={14} className="text-amber-500 fill-amber-500/10" />
                iconBg = 'bg-amber-500/10 text-amber-500 border border-amber-500/25'
                contentText = (
                  <span className="flex items-center gap-1.5 flex-wrap">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-black bg-amber-500/15 text-amber-500 border border-amber-500/25 select-none uppercase tracking-wider">
                      {locale === 'tr' ? 'Onur Ödülü (XP)' : 'Honor Award (XP)'}
                    </span>
                    <span className="font-semibold text-foreground/90">{notif.message ?? (locale === 'tr' ? 'Yetkili tarafından ödüllendirildiniz.' : 'You have been rewarded by an administrator.')}</span>
                  </span>
                )
                break
              }
              case 'system_alert': {
                icon = <Shield size={14} className="text-blue-500 fill-blue-500/10" />
                iconBg = 'bg-blue-500/10 text-blue-500 border border-blue-500/25'
                contentText = (
                  <span className="flex items-center gap-1.5 flex-wrap">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-black bg-blue-500/15 text-blue-500 border border-blue-500/25 select-none uppercase tracking-wider">
                      {locale === 'tr' ? 'Sistem Bildirimi' : 'System Notification'}
                    </span>
                    <span className="font-semibold text-foreground/90">{notif.message ?? (locale === 'tr' ? 'Sistem bildirimi.' : 'System notification.')}</span>
                  </span>
                )
                break
              }
              case 'support_reply': {
                const ticket = notif.support_ticket
                if (ticket) {
                  if (ticket.status === 'closed') {
                    icon = <CheckCircle2 size={14} />
                    iconBg = 'bg-rose-500/10 text-rose-500 border border-rose-500/25'
                    contentText = (
                      <span className="flex items-center gap-1.5 flex-wrap">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-black bg-rose-500/15 text-rose-500 border border-rose-500/25 select-none uppercase tracking-wider">
                          {locale === 'tr' ? 'Talep Kapatıldı' : 'Ticket Closed'}
                        </span>
                        <span className="font-semibold text-foreground/90">{locale === 'tr' ? `Destek talebiniz kapatıldı: ${ticket.subject}` : `Your support ticket has been closed: ${ticket.subject}`}</span>
                      </span>
                    )
                  } else if (ticket.status === 'replied') {
                    const isNewConvo = notif.message && (
                      notif.message.includes('yeni bir konuşma başlattı') || 
                      notif.message.includes('yeni bir destek talebi') ||
                      notif.message.toLowerCase().includes('started a new conversation') ||
                      notif.message.toLowerCase().includes('new support request')
                    )
                    const badgeText = isNewConvo 
                      ? (locale === 'tr' ? 'Yönetici Mesajı' : 'Admin Message') 
                      : (locale === 'tr' ? 'Destek Yanıtı' : 'Support Reply')
                    const badgeBg = isNewConvo 
                      ? 'bg-blue-500/15 text-blue-500 border border-blue-500/25'
                      : 'bg-purple-500/15 text-purple-500 border border-purple-500/25'
                    
                    icon = <HelpCircle size={14} />
                    iconBg = isNewConvo 
                      ? 'bg-blue-500/10 text-blue-500 border border-blue-500/25'
                      : 'bg-purple-500/10 text-purple-500 border border-purple-500/25'
                    
                    contentText = (
                      <span className="flex items-center gap-1.5 flex-wrap">
                        <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-black select-none uppercase tracking-wider", badgeBg)}>
                          {badgeText}
                        </span>
                        <span className="font-semibold text-foreground/90">{notif.message ?? (locale === 'tr' ? `Destek talebiniz yanıtlandı: ${ticket.subject}` : `Your support ticket has been replied: ${ticket.subject}`)}</span>
                      </span>
                    )
                  } else {
                    icon = <HelpCircle size={14} />
                    iconBg = 'bg-purple-500/10 text-purple-500 border border-purple-500/25'
                    contentText = (
                      <span className="flex items-center gap-1.5 flex-wrap">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-black bg-amber-500/15 text-amber-500 border border-amber-500/25 select-none uppercase tracking-wider">
                          {locale === 'tr' ? 'Açık Talep' : 'Open Ticket'}
                        </span>
                        <span className="font-semibold text-foreground/90">{notif.message ?? (locale === 'tr' ? `Destek talebiniz açık: ${ticket.subject}` : `Your support ticket is open: ${ticket.subject}`)}</span>
                      </span>
                    )
                  }
                } else {
                  const isSuggestion = notif.message && (
                    notif.message.includes('öneri') || 
                    notif.message.includes('Öneri') || 
                    notif.message.includes('öneriniz') || 
                    notif.message.includes('Öneriniz') ||
                    notif.message.toLowerCase().includes('suggestion')
                  )
                  
                  const isAdminAction = !isSuggestion && notif.message && (
                    notif.message.includes('yönetici') || 
                    notif.message.includes('doğrula') || 
                    notif.message.includes('sıfırla') || 
                    notif.message.includes('tik') ||
                    notif.message.includes('kurucu') ||
                    notif.message.includes('mavi') ||
                    notif.message.includes('sarı') ||
                    notif.message.toLowerCase().includes('admin') ||
                    notif.message.toLowerCase().includes('founder') ||
                    notif.message.toLowerCase().includes('badge') ||
                    notif.message.toLowerCase().includes('verify')
                  )
                  
                  const isNewConvo = !isSuggestion && !isAdminAction && notif.message && (
                    notif.message.includes('yeni bir konuşma başlattı') || 
                    notif.message.includes('yeni bir destek talebi') ||
                    notif.message.toLowerCase().includes('started a new conversation') ||
                    notif.message.toLowerCase().includes('new support request')
                  )
                  
                  let badgeText = locale === 'tr' ? 'Destek Yanıtı' : 'Support Reply'
                  let badgeBg = 'bg-purple-500/15 text-purple-500 border border-purple-500/25'
                  
                  if (isSuggestion) {
                    badgeText = locale === 'tr' ? 'Öneri Bildirimi' : 'Suggestion Notification'
                    badgeBg = 'bg-sky-500/15 text-sky-500 border border-sky-500/25'
                    icon = <Sparkles size={14} className="text-sky-500" />
                    iconBg = 'bg-sky-500/10 text-sky-500 border border-sky-500/25'
                  } else if (isAdminAction) {
                    badgeText = locale === 'tr' ? 'Sistem Bildirimi' : 'System Notification'
                    badgeBg = 'bg-amber-500/15 text-amber-500 border border-amber-500/25'
                    icon = <Shield size={14} className="text-amber-500 fill-amber-500/10" />
                    iconBg = 'bg-amber-500/10 text-amber-500 border border-amber-500/25'
                  } else {
                    badgeText = isNewConvo 
                      ? (locale === 'tr' ? 'Yönetici Mesajı' : 'Admin Message') 
                      : (locale === 'tr' ? 'Destek Yanıtı' : 'Support Reply')
                    badgeBg = isNewConvo 
                      ? 'bg-blue-500/15 text-blue-500 border border-blue-500/25'
                      : 'bg-purple-500/15 text-purple-500 border border-purple-500/25'
                    icon = <HelpCircle size={14} />
                    iconBg = isNewConvo 
                      ? 'bg-blue-500/10 text-blue-500 border border-blue-500/25'
                      : 'bg-purple-500/10 text-purple-500 border border-purple-500/25'
                  }
                    
                  contentText = (
                    <span className="flex items-center gap-1.5 flex-wrap">
                      <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-black select-none uppercase tracking-wider", badgeBg)}>
                        {badgeText}
                      </span>
                      <span className="font-semibold text-foreground/90">{notif.message ?? (locale === 'tr' ? 'Destek talebiniz yanıtlandı' : 'Your support request has been replied')}</span>
                    </span>
                  )
                }
                break
              }
              case 'support_ticket': {
                const ticket = notif.support_ticket
                if (ticket) {
                  if (ticket.status === 'closed') {
                    icon = <CheckCircle2 size={14} />
                    iconBg = 'bg-rose-500/10 text-rose-500 border border-rose-500/25'
                    contentText = (
                      <span className="flex items-center gap-1.5 flex-wrap">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-black bg-rose-500/15 text-rose-500 border border-rose-500/25 select-none uppercase tracking-wider">
                          {locale === 'tr' ? 'Talep Kapatıldı' : 'Ticket Closed'}
                        </span>
                        <span className="font-semibold text-foreground/90">{locale === 'tr' ? `Destek talebi kapatıldı: ${ticket.subject}` : `Support ticket has been closed: ${ticket.subject}`}</span>
                      </span>
                    )
                  } else if (ticket.status === 'replied') {
                    icon = <HelpCircle size={14} />
                    iconBg = 'bg-purple-500/10 text-purple-500 border border-purple-500/25'
                    contentText = (
                      <span className="flex items-center gap-1.5 flex-wrap">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-black bg-purple-500/15 text-purple-500 border border-purple-500/25 select-none uppercase tracking-wider">
                          {locale === 'tr' ? 'Talep Yanıtlandı' : 'Ticket Replied'}
                        </span>
                        <span className="font-semibold text-foreground/90">{locale === 'tr' ? `Destek talebi yanıtlandı: ${ticket.subject}` : `Support ticket has been replied: ${ticket.subject}`}</span>
                      </span>
                    )
                  } else {
                    const isFollowUp = notif.message && (
                      notif.message.includes('yeni mesaj') || 
                      notif.message.includes('Takip Mesajı') || 
                      notif.message.includes('yeni bir konuşma') ||
                      notif.message.toLowerCase().includes('new message') ||
                      notif.message.toLowerCase().includes('follow-up')
                    )
                    const badgeText = isFollowUp 
                      ? (locale === 'tr' ? 'Yeni Mesaj' : 'New Message') 
                      : (locale === 'tr' ? 'Yeni Destek Talebi' : 'New Support Request')
                    const badgeBg = isFollowUp 
                      ? 'bg-blue-500/15 text-blue-500 border border-blue-500/25'
                      : 'bg-amber-500/15 text-amber-500 border border-amber-500/25 animate-pulse'
                    
                    icon = <HelpCircle size={14} />
                    iconBg = isFollowUp 
                      ? 'bg-blue-500/10 text-blue-500 border border-blue-500/25'
                      : 'bg-amber-500/10 text-amber-500 border border-amber-500/25'

                    contentText = (
                      <span className="flex items-center gap-1.5 flex-wrap">
                        <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-black select-none uppercase tracking-wider", badgeBg)}>
                          {badgeText}
                        </span>
                        <span className="font-semibold text-foreground/90">{notif.message ?? (locale === 'tr' ? `Yeni destek talebi gönderildi: ${ticket.subject}` : `New support ticket submitted: ${ticket.subject}`)}</span>
                      </span>
                    )
                  }
                } else {
                  const isFollowUp = notif.message && (
                    notif.message.includes('yeni mesaj') || 
                    notif.message.includes('Takip Mesajı') || 
                    notif.message.includes('yeni bir konuşma') ||
                    notif.message.toLowerCase().includes('new message') ||
                    notif.message.toLowerCase().includes('follow-up')
                  )
                  const badgeText = isFollowUp 
                    ? (locale === 'tr' ? 'Yeni Mesaj' : 'New Message') 
                    : (locale === 'tr' ? 'Yeni Destek Talebi' : 'New Support Request')
                  const badgeBg = isFollowUp 
                    ? 'bg-blue-500/15 text-blue-500 border border-blue-500/25'
                    : 'bg-amber-500/15 text-amber-500 border border-amber-500/25 animate-pulse'
                  
                  icon = <HelpCircle size={14} />
                  iconBg = isFollowUp 
                    ? 'bg-blue-500/10 text-blue-500 border border-blue-500/25'
                    : 'bg-amber-500/10 text-amber-500 border border-amber-500/25'

                  contentText = (
                    <span className="flex items-center gap-1.5 flex-wrap">
                      <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-black select-none uppercase tracking-wider", badgeBg)}>
                        {badgeText}
                      </span>
                      <span className="font-semibold text-foreground/90">{notif.message ?? (locale === 'tr' ? 'Yeni destek talebi gönderildi' : 'New support request submitted')}</span>
                    </span>
                  )
                }
                break
              }
            }

            const isGroupedType = notif.type === 'like' || notif.type === 'comment_like' || notif.type === 'support_reply'
            const isMultiActor = group.actors.length > 1

            const itemContent = (
              <div className="flex items-start gap-4 p-4">
                {/* Column 1: Type Icon */}
                <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm", iconBg)}>
                  {icon}
                </div>

                {/* Column 2: Content Details */}
                <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                  {isGroupedType && isMultiActor ? (
                    /* Grouped multi-avatar row */
                    <div className="flex -space-x-2 overflow-hidden select-none mb-0.5">
                      {group.actors.slice(0, 7).map((actor, idx) => (
                        <Link 
                          key={actor.id}
                          href={`/profile/${actor.username}`} 
                          className="inline-block relative hover:scale-105 transition-all hover:z-10"
                          style={{ zIndex: 10 - idx }}
                        >
                          {actor.avatar_url ? (
                            <img 
                              src={actor.avatar_url} 
                              alt={actor.username} 
                              className="w-8 h-8 rounded-full object-cover ring-2 ring-card bg-card" 
                            />
                          ) : (
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-[10px] ring-2 ring-card bg-gradient-to-r from-primary to-primary/80 text-white"
                              style={{
                                filter: `hue-rotate(${(actor.username.charCodeAt(0) * 17) % 360}deg)`,
                              }}
                            >
                              {actor.username.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                        </Link>
                      ))}
                      {group.actors.length > 7 && (
                        <div className="w-8 h-8 rounded-full bg-muted border-2 border-card flex items-center justify-center text-[9px] font-black text-muted-foreground select-none relative z-0">
                          +{group.actors.length - 7}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Single Avatar row */
                    <div className="flex items-center justify-between gap-2">
                      <Link href={`/profile/${username}`} className="flex-shrink-0 hover:opacity-85 transition-opacity">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt={username} className="w-8 h-8 rounded-full object-cover ring-1 ring-border" />
                        ) : (
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-[10px] ring-1 ring-border text-white"
                            style={{
                              background: `linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))`,
                              filter: `hue-rotate(${(username.charCodeAt(0) * 17) % 360}deg)`,
                            }}
                          >
                            {username.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                      </Link>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-[10px] text-muted-foreground select-none">
                          {formatRelativeTime(notif.created_at, locale)}
                        </span>
                        <button
                          onClick={() => handleDeleteNotification(group.ids)}
                          className="p-1.5 rounded-xl text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-all cursor-pointer select-none active:scale-95"
                          title={locale === 'tr' ? 'Bildirimi Sil' : 'Delete Notification'}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Text Description */}
                  <div className="flex items-baseline justify-between gap-2 w-full">
                    <div className="text-xs text-muted-foreground leading-relaxed">
                      {isGroupedType && isMultiActor ? (
                        notif.type === 'support_reply' ? (
                          <span className="flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-black bg-sky-500/15 text-sky-500 border border-sky-500/25 select-none uppercase tracking-wider">
                              {locale === 'tr' ? 'Yeni Öneriler' : 'New Suggestions'}
                            </span>
                            <span className="font-semibold text-foreground/90">
                              {getGroupedNotificationText(group, locale)}
                            </span>
                          </span>
                        ) : (
                          contentText
                        )
                      ) : (
                        <span>
                          <Link href={`/profile/${username}`} className="font-semibold text-foreground hover:underline mr-1">
                            {username}
                          </Link>
                          {contentText}
                        </span>
                      )}
                    </div>
                    
                    {isGroupedType && isMultiActor && (
                      <div className="flex items-center gap-1.5 flex-shrink-0 self-start mt-0.5">
                        <span className="text-[10px] text-muted-foreground select-none">
                          {formatRelativeTime(notif.created_at, locale)}
                        </span>
                        <button
                          onClick={() => handleDeleteNotification(group.ids)}
                          className="p-1.5 rounded-xl text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-all cursor-pointer select-none active:scale-95"
                          title={locale === 'tr' ? 'Bildirimi Sil' : 'Delete Notification'}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>

                  {notif.type === 'post_removed' && notif.message && (
                    <p className="text-xs text-foreground/80 mt-1.5 italic">
                      {locale === 'tr' ? 'Neden: ' : 'Reason: '}{notif.message}
                    </p>
                  )}

                  {/* Comment or Post Preview Snippet - Link to Post */}
                  {displayPreview && notif.post_id && (
                    <Link
                      href={`/post/${notif.post_id}`}
                      className="block mt-2 text-xs text-foreground bg-accent/40 border border-border/50 rounded-lg p-2 max-w-full font-medium line-clamp-2 hover:bg-accent/60 transition-colors"
                    >
                      {(() => {
                        const stripped = displayPreview.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
                        const snippet = stripped.length > 80 ? `${stripped.slice(0, 80)}...` : stripped
                        return <FormattedMessage text={snippet} disableLinks={true} />
                      })()}
                    </Link>
                  )}

                  {/* Quick Action buttons */}
                  {notif.type === 'follow' && (
                    <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                      {followRequestsList.includes(notif.actor_id) ? (
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            onClick={() => handleAcceptFollow(notif.actor_id, notif.id)}
                            disabled={actionActorId !== null}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:opacity-90 active:scale-95 text-primary-foreground text-xs font-bold transition-all cursor-pointer shadow-sm disabled:opacity-50"
                            style={{ background: 'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))' }}
                          >
                            {actionActorId === `accept-${notif.actor_id}` ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle2 size={10} />}
                            {locale === 'tr' ? 'Kabul Et' : 'Accept'}
                          </button>
                          <button
                            onClick={() => handleDeclineFollow(notif.actor_id, notif.id)}
                            disabled={actionActorId !== null}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-accent/40 hover:bg-accent/80 active:scale-95 text-foreground text-xs font-bold transition-all cursor-pointer shadow-sm disabled:opacity-50"
                          >
                            {actionActorId === `decline-${notif.actor_id}` ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />}
                            {locale === 'tr' ? 'Reddet' : 'Decline'}
                          </button>
                        </div>
                      ) : followingList.includes(notif.actor_id) ? (
                        <div className="mt-2 flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground bg-muted/40 border border-border/50 rounded-lg px-2.5 py-1.5 w-fit select-none">
                          <UserCheck size={11} className="text-emerald-500" />
                          {locale === 'tr' ? 'Takip Ediyorsun' : 'Following'}
                        </div>
                      ) : (
                        <button
                          onClick={() => handleFollowBack(notif.actor_id)}
                          disabled={actionActorId !== null}
                          className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:opacity-90 active:scale-95 text-primary-foreground text-xs font-bold transition-all cursor-pointer shadow-sm disabled:opacity-50"
                          style={{ background: 'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))' }}
                        >
                          {actionActorId === notif.actor_id ? <Loader2 size={10} className="animate-spin" /> : <UserPlus size={10} />}
                          {locale === 'tr' ? 'Geri Takip Et' : 'Follow Back'}
                        </button>
                      )}
                    </div>
                  )}

                  {notif.type === 'join_request' && community?.slug && (
                    <Link
                      href={`/communities/${community.slug}?showRequests=true`}
                      className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary hover:opacity-90 active:scale-95 text-primary-foreground text-xs font-bold transition-all cursor-pointer shadow-sm w-fit"
                      style={{ background: 'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))' }}
                    >
                      {locale === 'tr' ? 'Başvuruları İncele' : 'Review Requests'}
                    </Link>
                  )}

                  {notif.type === 'support_reply' && notif.support_ticket && notif.support_ticket.status !== 'closed' && (
                    <Link
                      href={notif.post_preview ? `/support?ticketId=${notif.post_preview}` : "/support"}
                      className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary hover:opacity-90 active:scale-95 text-primary-foreground text-xs font-bold transition-all cursor-pointer shadow-sm w-fit"
                      style={{ background: 'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))' }}
                    >
                      {locale === 'tr' ? 'Talebi Görüntüle' : 'View Ticket'}
                    </Link>
                  )}

                  {notif.type === 'support_ticket' && notif.support_ticket && notif.support_ticket.status !== 'closed' && (
                    <Link
                      href={notif.post_preview ? `/support?ticketId=${notif.post_preview}` : "/support"}
                      className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary hover:opacity-90 active:scale-95 text-primary-foreground text-xs font-bold transition-all cursor-pointer shadow-sm w-fit"
                      style={{ background: 'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))' }}
                    >
                      {locale === 'tr' ? 'Talepleri Yönet' : 'Manage Tickets'}
                    </Link>
                  )}
                </div>
              </div>
            )

            const wrapperClass = `bg-card border ${notif.is_read ? 'border-border/60 opacity-85' : 'border-primary/30 ring-1 ring-primary/5'} rounded-2xl overflow-hidden hover:border-border transition-all duration-200`

            return (
              <motion.div
                key={group.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.03 }}
                className={wrapperClass}
              >
                <div>{itemContent}</div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      <ConfirmationModal
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        message={modalConfig.message}
        confirmText={modalConfig.confirmText}
        cancelText={modalConfig.cancelText}
        isDanger={modalConfig.isDanger}
        isAlert={modalConfig.isAlert}
        onConfirm={modalConfig.onConfirm}
        onCancel={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  )
}
