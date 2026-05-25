'use client'

import { useEffect, useState } from 'react'
import { Bell, Heart, MessageCircle, UserPlus, CheckCircle2, Loader2, Repeat, Trash2, Pin, UserCheck, HelpCircle } from 'lucide-react'
import { markNotificationsAsRead, clearAllNotifications, deleteNotification } from '@/lib/actions/notifications'
import { followUser, approveFollowRequest, declineFollowRequest } from '@/lib/actions/follows'
import type { EnrichedProfile } from '@/lib/profile-enrich'
import Link from 'next/link'
import { FormattedMessage } from '@/components/havn/FormattedMessage'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

type NotificationItem = {
  id: string
  created_at: string
  type: 'like' | 'comment' | 'join_request' | 'approved' | 'repost' | 'comment_like' | 'reply' | 'post_removed' | 'post_pinned' | 'follow' | 'support_reply' | 'support_ticket'
  is_read: boolean
  post_id: string | null
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

interface NotificationsClientProps {
  initialNotifications: NotificationItem[]
  followingIds: string[]
  currentUser?: EnrichedProfile | null
}

function formatRelativeTime(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Şimdi'
  if (diffMins < 60) return `${diffMins}d önce`
  if (diffHours < 24) return `${diffHours}s önce`
  if (diffDays === 1) return 'Dün'
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
}

import { ConfirmationModal } from '@/components/havn/ConfirmationModal'

export function NotificationsClient({ initialNotifications, followingIds, currentUser }: NotificationsClientProps) {
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
      title: 'Hata',
      message: errorMsg || 'Bir hata oluştu. Lütfen tekrar deneyin.',
      confirmText: 'Tamam',
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

  async function handleDeleteNotification(notifId: string) {
    setModalConfig({
      isOpen: true,
      title: 'Bildirimi Sil',
      message: 'Bu bildirimi silmek istediğinizden emin misiniz?',
      confirmText: 'Sil',
      cancelText: 'İptal',
      isDanger: true,
      onConfirm: async () => {
        const res = await deleteNotification(notifId)
        if (!res.error) {
          setNotifications(prev => prev.filter(n => n.id !== notifId))
        } else {
          showErrorAlert(res.error)
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

  useEffect(() => {
    // Mark notifications as read when the user views the page
    const clearNotifications = async () => {
      await markNotificationsAsRead()
    }
    clearNotifications()
  }, [])

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
        <h3 className="text-base font-bold text-foreground mb-1">Henüz bildiriminiz yok</h3>
        <p className="text-xs text-muted-foreground max-w-[280px]">
          Beğeniler, yorumlar ve topluluk üyelik güncellemeleri burada görünecektir.
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
      return ['join_request', 'approved', 'repost', 'post_removed', 'post_pinned', 'support_reply', 'support_ticket'].includes(notif.type)
    }
    return true
  })

  async function handleClearAll() {
    setModalConfig({
      isOpen: true,
      title: 'Tümünü Temizle',
      message: 'Tüm bildirimlerinizi kalıcı olarak silmek istediğinizden emin misiniz?',
      confirmText: 'Temizle',
      cancelText: 'İptal',
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between px-1 gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-black text-foreground">Bildirimler</h1>
          <p className="text-[10px] text-muted-foreground font-semibold">
            Son 50 bildirim gösteriliyor
          </p>
        </div>
        
        {notifications.length > 0 && (
          <button
            onClick={handleClearAll}
            disabled={isClearing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border border-destructive/20 hover:border-destructive/40 text-destructive bg-destructive/5 hover:bg-destructive/10 rounded-xl transition-all cursor-pointer disabled:opacity-50 select-none active:scale-95"
          >
            {isClearing ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
            Tümünü Temizle
          </button>
        )}
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-1.5 p-1 bg-card/40 border border-border/60 rounded-xl w-fit">
        {[
          { key: 'all', label: 'Tümü' },
          { key: 'likes', label: 'Beğeniler' },
          { key: 'comments', label: 'Yorumlar' },
          { key: 'follows', label: 'Takip' },
          { key: 'system', label: 'Destek & Sistem' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as any)}
            className={cn(
              "px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer",
              filter === tab.key 
                ? "bg-background text-foreground shadow-sm" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {filteredNotifications.map((notif, index) => {
            const username = notif.actor?.username ?? 'Anonim'
            const avatarUrl = notif.actor?.avatar_url
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
                const reaction = notif.message
                if (reaction && reaction !== 'like') {
                  icon = <span className="text-sm select-none">{reaction}</span>
                  iconBg = 'bg-amber-500/10 text-amber-500 border border-amber-500/25'
                  let verb = 'beğendi'
                  if (reaction === '🔥') verb = 'gönderine alev attı 🔥'
                  else if (reaction === '😂') verb = 'gönderine güldü 😂'
                  else if (reaction === '😮') verb = 'gönderine şaşırdı 😮'
                  else if (reaction === '😢') verb = 'gönderine üzüldü 😢'
                  else verb = `gönderine ${reaction} tepkisi verdi`
                  contentText = verb
                } else {
                  icon = <Heart size={14} className="fill-current" />
                  iconBg = 'bg-rose-500/10 text-rose-500 border border-rose-500/25'
                  contentText = 'gönderini beğendi ❤️'
                }
                break
              }
              case 'comment':
                icon = <MessageCircle size={14} />
                iconBg = 'bg-blue-500/10 text-blue-500 border border-blue-500/25'
                contentText = 'gönderine yorum yaptı'
                break
              case 'join_request':
                icon = <UserPlus size={14} />
                iconBg = 'bg-amber-500/10 text-amber-500 border border-amber-500/25'
                contentText = community
                  ? `${community.name} topluluğuna katılım başvurusu yaptı`
                  : 'topluluğuna katılım başvurusu yaptı'
                break
              case 'approved':
                icon = <CheckCircle2 size={14} />
                iconBg = 'bg-green-500/10 text-green-500 border border-green-500/25'
                contentText = community
                  ? `${community.name} topluluğu katılım başvurunu onayladı`
                  : 'takip isteğini onayladı'
                break
              case 'repost':
                icon = <Repeat size={14} />
                iconBg = 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/25'
                contentText = 'gönderini yeniden paylaştı'
                break
              case 'comment_like':
                icon = <Heart size={14} className="fill-current" />
                iconBg = 'bg-rose-500/10 text-rose-500 border border-rose-500/25'
                contentText = 'yorumunu beğendi'
                break
              case 'reply':
                icon = <MessageCircle size={14} />
                iconBg = 'bg-blue-500/10 text-blue-500 border border-blue-500/25'
                contentText = 'yorumuna yanıt verdi'
                break
              case 'post_removed': {
                const communityName = community?.name ?? 'bir topluluk'
                icon = <Trash2 size={14} />
                iconBg = 'bg-destructive/10 text-destructive border border-destructive/25'
                contentText = `${communityName} topluluğundaki gönderini kaldırdı`
                break
              }
              case 'post_pinned': {
                const communityName = community?.name ?? 'bir topluluk'
                icon = <Pin size={14} className="fill-current" />
                iconBg = 'bg-primary/10 text-primary border border-primary/25'
                contentText = `${communityName} topluluğundaki gönderini sabitledi`
                break
              }
              case 'follow': {
                const isRequest = followRequestsList.includes(notif.actor_id)
                icon = <UserPlus size={14} />
                iconBg = 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/25'
                contentText = isRequest ? 'sana takip isteği gönderdi' : 'seni takip etmeye başladı'
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
                          Talep Kapatıldı
                        </span>
                        <span className="font-semibold text-foreground/90">Destek talebiniz kapatıldı: {ticket.subject}</span>
                      </span>
                    )
                  } else if (ticket.status === 'replied') {
                    const isNewConvo = notif.message && (notif.message.includes('yeni bir konuşma başlattı') || notif.message.includes('yeni bir destek talebi'))
                    const badgeText = isNewConvo ? 'Yönetici Mesajı' : 'Destek Yanıtı'
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
                        <span className="font-semibold text-foreground/90">{notif.message ?? `Destek talebiniz yanıtlandı: ${ticket.subject}`}</span>
                      </span>
                    )
                  } else {
                    icon = <HelpCircle size={14} />
                    iconBg = 'bg-purple-500/10 text-purple-500 border border-purple-500/25'
                    contentText = (
                      <span className="flex items-center gap-1.5 flex-wrap">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-black bg-amber-500/15 text-amber-500 border border-amber-500/25 select-none uppercase tracking-wider">
                          Açık Talep
                        </span>
                        <span className="font-semibold text-foreground/90">{notif.message ?? `Destek talebiniz açık: ${ticket.subject}`}</span>
                      </span>
                    )
                  }
                } else {
                  const isNewConvo = notif.message && (notif.message.includes('yeni bir konuşma başlattı') || notif.message.includes('yeni bir destek talebi'))
                  const badgeText = isNewConvo ? 'Yönetici Mesajı' : 'Destek Yanıtı'
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
                      <span className="font-semibold text-foreground/90">{notif.message ?? 'Destek talebiniz yanıtlandı'}</span>
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
                          Talep Kapatıldı
                        </span>
                        <span className="font-semibold text-foreground/90">Destek talebi kapatıldı: {ticket.subject}</span>
                      </span>
                    )
                  } else if (ticket.status === 'replied') {
                    icon = <HelpCircle size={14} />
                    iconBg = 'bg-purple-500/10 text-purple-500 border border-purple-500/25'
                    contentText = (
                      <span className="flex items-center gap-1.5 flex-wrap">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-black bg-purple-500/15 text-purple-500 border border-purple-500/25 select-none uppercase tracking-wider">
                          Talep Yanıtlandı
                        </span>
                        <span className="font-semibold text-foreground/90">Destek talebi yanıtlandı: {ticket.subject}</span>
                      </span>
                    )
                  } else {
                    const isFollowUp = notif.message && (notif.message.includes('yeni mesaj') || notif.message.includes('Takip Mesajı') || notif.message.includes('yeni bir konuşma'))
                    const badgeText = isFollowUp ? 'Yeni Mesaj' : 'Yeni Destek Talebi'
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
                        <span className="font-semibold text-foreground/90">{notif.message ?? `Yeni destek talebi gönderildi: ${ticket.subject}`}</span>
                      </span>
                    )
                  }
                } else {
                  const isFollowUp = notif.message && (notif.message.includes('yeni mesaj') || notif.message.includes('Takip Mesajı') || notif.message.includes('yeni bir konuşma'))
                  const badgeText = isFollowUp ? 'Yeni Mesaj' : 'Yeni Destek Talebi'
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
                      <span className="font-semibold text-foreground/90">{notif.message ?? 'Yeni destek talebi gönderildi'}</span>
                    </span>
                  )
                }
                break
              }
            }

            const itemContent = (
              <div className="flex items-start gap-3 p-4">
                {/* Type Icon (Standalone Column) */}
                <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm", iconBg)}>
                  {icon}
                </div>

                {/* User Avatar - Link to Profile */}
                <Link href={`/profile/${username}`} className="flex-shrink-0 hover:opacity-85 transition-opacity">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={username} className="w-10 h-10 rounded-full object-cover ring-1 ring-border" />
                  ) : (
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ring-1 ring-border"
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

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <Link href={`/profile/${username}`} className="text-sm font-semibold text-foreground truncate hover:underline">
                      {username}
                    </Link>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-[10px] text-muted-foreground select-none">
                        {formatRelativeTime(notif.created_at)}
                      </span>
                      <button
                        onClick={() => handleDeleteNotification(notif.id)}
                        className="p-1.5 rounded-xl text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-all cursor-pointer select-none active:scale-95"
                        title="Bildirimi Sil"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {notif.post_id ? (
                      <Link href={`/post/${notif.post_id}`} className="hover:text-primary hover:underline transition-colors">
                        {contentText}
                      </Link>
                    ) : (community?.slug ? (
                      <Link href={`/communities/${community.slug}`} className="hover:text-primary hover:underline transition-colors">
                        {contentText}
                      </Link>
                    ) : (
                      contentText
                    ))}
                  </p>

                  {notif.type === 'post_removed' && notif.message && (
                    <p className="text-xs text-foreground/80 mt-1.5 italic">
                      Neden: {notif.message}
                    </p>
                  )}

                  {/* Comment or Post Preview Snippet - Link to Post */}
                  {displayPreview && notif.post_id && (
                    <Link
                      href={`/post/${notif.post_id}`}
                      className="block mt-2 text-xs text-foreground bg-accent/40 border border-border/50 rounded-lg p-2 max-w-full font-medium line-clamp-2 hover:bg-accent/60 transition-colors"
                    >
                      <FormattedMessage text={displayPreview.length > 80 ? `${displayPreview.slice(0, 80)}…` : displayPreview} />
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
                            Kabul Et
                          </button>
                          <button
                            onClick={() => handleDeclineFollow(notif.actor_id, notif.id)}
                            disabled={actionActorId !== null}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-accent/40 hover:bg-accent/80 active:scale-95 text-foreground text-xs font-bold transition-all cursor-pointer shadow-sm disabled:opacity-50"
                          >
                            {actionActorId === `decline-${notif.actor_id}` ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />}
                            Reddet
                          </button>
                        </div>
                      ) : followingList.includes(notif.actor_id) ? (
                        <div className="mt-2 flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground bg-muted/40 border border-border/50 rounded-lg px-2.5 py-1.5 w-fit select-none">
                          <UserCheck size={11} className="text-emerald-500" />
                          Takip Ediyorsun
                        </div>
                      ) : (
                        <button
                          onClick={() => handleFollowBack(notif.actor_id)}
                          disabled={actionActorId === notif.actor_id}
                          className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:opacity-90 active:scale-95 text-primary-foreground text-xs font-bold transition-all cursor-pointer shadow-sm disabled:opacity-50"
                          style={{ background: 'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))' }}
                        >
                          {actionActorId === notif.actor_id ? <Loader2 size={10} className="animate-spin" /> : <UserPlus size={10} />}
                          Geri Takip Et
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
                      Başvuruları İncele
                    </Link>
                  )}

                  {notif.type === 'support_reply' && notif.support_ticket && notif.support_ticket.status !== 'closed' && (
                    <Link
                      href={notif.post_preview ? `/support?ticketId=${notif.post_preview}` : "/support"}
                      className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary hover:opacity-90 active:scale-95 text-primary-foreground text-xs font-bold transition-all cursor-pointer shadow-sm w-fit"
                      style={{ background: 'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))' }}
                    >
                      Talebi Görüntüle
                    </Link>
                  )}

                  {notif.type === 'support_ticket' && notif.support_ticket && notif.support_ticket.status !== 'closed' && (
                    <Link
                      href={notif.post_preview ? `/support?ticketId=${notif.post_preview}` : "/support"}
                      className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary hover:opacity-90 active:scale-95 text-primary-foreground text-xs font-bold transition-all cursor-pointer shadow-sm w-fit"
                      style={{ background: 'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))' }}
                    >
                      Talepleri Yönet
                    </Link>
                  )}
                </div>
              </div>
            )

            const wrapperClass = `bg-card border ${notif.is_read ? 'border-border/60 opacity-85' : 'border-primary/30 ring-1 ring-primary/5'} rounded-2xl overflow-hidden hover:border-border transition-all duration-200`

            return (
              <motion.div
                key={notif.id}
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
