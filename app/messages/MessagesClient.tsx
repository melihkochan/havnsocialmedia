'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, Send, Search, Loader2, ArrowLeft, Clock, ShieldCheck, CheckCircle, Trash2, Pencil, X, Heart } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ProfileName } from '@/components/havn/ProfileName'
import { EmojiPickerButton } from '@/components/havn/EmojiPickerButton'
import { sendDirectMessage, markMessagesAsRead, editDirectMessage, reopenConversation, deleteDirectMessage, closeConversation, restoreStreak } from '@/lib/actions/messages'
import { calculateLastActiveStreak, calculateStreak } from '@/lib/streak-utils'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { getOnlineStatus } from '@/lib/profile-display'
import { ConfirmationModal } from '@/components/havn/ConfirmationModal'
import { enrichProfile } from '@/lib/profile-enrich'


import { PostPreviewBubble } from '@/components/havn/PostPreviewBubble'

interface Profile {
  id: string
  username: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  updated_at: string
  streak_restores?: {
    lives: number
    restored_chats: Record<string, string>
  }
}

interface Message {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  created_at: string
  is_read: boolean
  sender?: Profile
  receiver?: Profile
}

interface Conversation {
  otherUser: Profile
  lastMessage: Message
  unreadCount: number
  streak?: number
}

function formatDividerDate(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  const yesterday = new Date()
  yesterday.setDate(now.getDate() - 1)
  
  if (d.toDateString() === now.toDateString()) {
    return 'Bugün'
  }
  if (d.toDateString() === yesterday.toDateString()) {
    return 'Dün'
  }
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function dTimeOnly(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
}

function renderMessageContent(content: string, isOwn: boolean) {
  const postUrlRegex = /(https?:\/\/[^\s]+)\/post\/([a-fA-F0-9-]{36})/i
  const match = content.match(postUrlRegex)
  
  if (match) {
    const fullUrl = match[1] + '/post/' + match[2]
    const textWithoutUrl = content.replace(fullUrl, '').trim()
    
    return (
      <div className="space-y-1.5">
        {textWithoutUrl && <p>{textWithoutUrl}</p>}
        <PostPreviewBubble postId={match[2]} isOwn={isOwn} />
      </div>
    )
  }

  return <p>{content}</p>
}

const STREAK_MILESTONES = [1, 5, 10, 20, 50, 100, 150, 200, 300, 500]

interface MessagesClientProps {
  currentUser: any
  initialConversations: Conversation[]
  activeChatUser: Profile | null
  initialMessages: Message[]
}

export function MessagesClient({
  currentUser,
  initialConversations,
  activeChatUser: initialActiveChatUser,
  initialMessages
}: MessagesClientProps) {
  const supabase = createClient()
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations)
  const [activeChatUser, setActiveChatUser] = useState<Profile | null>(initialActiveChatUser)
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [inputText, setInputText] = useState('')
  const [mobileTab, setMobileTab] = useState<'list' | 'chat'>(initialActiveChatUser ? 'chat' : 'list')
  const [inboxFilter, setInboxFilter] = useState<'all' | 'unread'>('all')
  const filteredConversations = conversations.filter(c => inboxFilter === 'all' || c.unreadCount > 0)

  const [isPartnerTyping, setIsPartnerTyping] = useState(false)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isCurrentlyTypingRef = useRef(false)
  const typingChannelRef = useRef<any>(null)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setInputText(val)

    if (!activeChatUser || !currentUser.id || !typingChannelRef.current) return

    if (!isCurrentlyTypingRef.current && val.trim().length > 0) {
      isCurrentlyTypingRef.current = true
      typingChannelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId: currentUser.id, isTyping: true },
      })
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)

    typingTimeoutRef.current = setTimeout(() => {
      isCurrentlyTypingRef.current = false
      if (typingChannelRef.current) {
        typingChannelRef.current.send({
          type: 'broadcast',
          event: 'typing',
          payload: { userId: currentUser.id, isTyping: false },
        })
      }
    }, 2000)
  }

  // Confirmation Modal state
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

  // Message edit state
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editInputText, setEditInputText] = useState('')

  // Streak Restore States
  const [streakLives, setStreakLives] = useState<number>(() => {
    return currentUser?.streak_restores?.lives ?? 5
  })
  const [myRestoredChats, setMyRestoredChats] = useState<Record<string, string>>(() => {
    return currentUser?.streak_restores?.restored_chats || {}
  })
  const [restorePending, setRestorePending] = useState(false)
  const [dismissedBanners, setDismissedBanners] = useState<Record<string, boolean>>({})

  const getRestoredDate = (otherUser: Profile, msgsList: Message[]) => {
    const lastActive = calculateLastActiveStreak(msgsList)
    const targetRestoredDate = lastActive.latestMutualDate
    if (!targetRestoredDate) return null

    const myRestoredDate = myRestoredChats[otherUser.id]
    const otherRestoredDate = otherUser.streak_restores?.restored_chats?.[currentUser.id]

    if (myRestoredDate === targetRestoredDate || otherRestoredDate === targetRestoredDate) {
      return targetRestoredDate
    }
    return null
  }

  // Streak Animation States
  const [prevStreak, setPrevStreak] = useState<number | null>(null)
  const [showStreakAnimation, setShowStreakAnimation] = useState(false)
  const [animateStreakNum, setAnimateStreakNum] = useState<number | null>(null)
  const [animateOldNum, setAnimateOldNum] = useState<number | null>(null)
  const [displayNum, setDisplayNum] = useState(0)

  useEffect(() => {
    if (showStreakAnimation && animateOldNum !== null && animateStreakNum !== null) {
      setDisplayNum(animateOldNum)
      const timer = setTimeout(() => {
        setDisplayNum(animateStreakNum)
      }, 600)
      return () => clearTimeout(timer)
    }
  }, [showStreakAnimation, animateOldNum, animateStreakNum])

  // Searching profiles
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Profile[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [isSearching, setIsSearching] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [sendPending, startSendTransition] = useTransition()

  // Scroll to bottom helper
  const scrollToBottom = (behavior: 'smooth' | 'auto' = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior })
  }

  // Ensure scroll snaps to bottom on chat change and initial message load
  useEffect(() => {
    if (activeChatUser && messages.length > 0) {
      const timer = setTimeout(() => {
        scrollToBottom('auto')
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [activeChatUser?.id, messages.length])

  // Load messages when active user changes
  useEffect(() => {
    const targetChatUser = activeChatUser
    if (!targetChatUser) {
      setMessages([])
      return
    }
    const activeUserId = targetChatUser.id

    // Clear messages from previous chat immediately to avoid visual lag
    setMessages([])
    setEditingMessageId(null)

    async function loadMessages() {
      // Reopen conversation asynchronously so it's unhidden in database
      reopenConversation(activeUserId).catch(() => {
        // silent
      })

      const { data, error } = await supabase
        .from('direct_messages')
        .select(`
          *,
          sender:profiles!sender_id(*),
          receiver:profiles!receiver_id(*)
        `)
        .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${activeUserId}),and(sender_id.eq.${activeUserId},receiver_id.eq.${currentUser.id})`)
        .order('created_at', { ascending: true })

      if (!error && data) {
        setMessages(data)
        // Ensure scroll snaps to bottom on change and initial load
        setTimeout(() => scrollToBottom('auto'), 50)
        setTimeout(() => scrollToBottom('auto'), 150)
        
        // Calculate and update streak locally!
        const restoredDate = getRestoredDate(targetChatUser!, data)
        const newStreak = calculateStreak(data, restoredDate)
        setPrevStreak(newStreak) // Initialize prevStreak

        // Check if we should celebrate this streak on load
        if (newStreak > 0) {
          const celebratedStr = localStorage.getItem('havn_celebrated_streaks')
          let celebrated: Record<string, number> = {}
          try {
            if (celebratedStr) celebrated = JSON.parse(celebratedStr)
          } catch (e) {}
          
          const lastCelebrated = celebrated[activeUserId] || 0
          if (newStreak > lastCelebrated && STREAK_MILESTONES.includes(newStreak)) {
            setAnimateStreakNum(newStreak)
            setAnimateOldNum(lastCelebrated)
            setShowStreakAnimation(true)
            setTimeout(() => setShowStreakAnimation(false), 3000)
            
            celebrated[activeUserId] = newStreak
            localStorage.setItem('havn_celebrated_streaks', JSON.stringify(celebrated))
          }
        }

        setConversations(prev =>
          prev.map(c =>
            c.otherUser.id === activeUserId
              ? { ...c, unreadCount: 0, streak: newStreak }
              : c
          )
        )
      } else {
        // Update conversations unread count locally if messages fetch failed
        setConversations(prev =>
          prev.map(c =>
            c.otherUser.id === activeUserId
              ? { ...c, unreadCount: 0 }
              : c
          )
        )
      }

      // Mark messages as read
      await markMessagesAsRead(activeUserId)
    }

    loadMessages()
  }, [activeChatUser?.id, currentUser.id])

  // Subscribing to direct messages typing status
  useEffect(() => {
    if (!activeChatUser || !currentUser?.id) {
      setIsPartnerTyping(false)
      typingChannelRef.current = null
      return
    }

    const sortedIds = [currentUser.id, activeChatUser.id].sort().join('_')
    const channelName = `typing_${sortedIds}`
    const typingChannel = supabase.channel(channelName)
    typingChannelRef.current = typingChannel

    typingChannel
      .on('broadcast', { event: 'typing' }, (payload) => {
        const data = payload.payload
        if (data && data.userId === activeChatUser.id) {
          setIsPartnerTyping(!!data.isTyping)
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(typingChannel)
      typingChannelRef.current = null
      setIsPartnerTyping(false)
    }
  }, [activeChatUser?.id, currentUser?.id])

  // Scroll to bottom when partner starts typing
  useEffect(() => {
    if (isPartnerTyping) {
      scrollToBottom('smooth')
    }
  }, [isPartnerTyping])

  // Real-time listener
  useEffect(() => {
    const channelToken = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    const channel = supabase.channel(`direct_messages_realtime_${channelToken}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'direct_messages' },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMsg = payload.new as Message
            
            // Check if this message belongs to the current user (either sender or receiver)
            if (newMsg.sender_id !== currentUser.id && newMsg.receiver_id !== currentUser.id) return

            // Fetch profiles to enrich payload
            const { data: senderProfile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', newMsg.sender_id)
              .single()

            const { data: receiverProfile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', newMsg.receiver_id)
              .single()

            const enrichedMsg: Message = {
              ...newMsg,
              sender: senderProfile ?? undefined,
              receiver: receiverProfile ?? undefined
            }

            const otherUserId = newMsg.sender_id === currentUser.id ? newMsg.receiver_id : newMsg.sender_id
            const otherUser = newMsg.sender_id === currentUser.id ? receiverProfile : senderProfile

            // 1. Update messages stream if active chat user matches
            if (activeChatUser && (newMsg.sender_id === activeChatUser.id || newMsg.receiver_id === activeChatUser.id)) {
              setMessages(prev => {
                // Avoid duplicates
                if (prev.some(m => m.id === enrichedMsg.id)) return prev
                const updatedMsgs = [...prev, enrichedMsg]
                
                // Update streak locally
                const restoredDate = getRestoredDate(activeChatUser!, updatedMsgs)
                const newStreak = calculateStreak(updatedMsgs, restoredDate)
                
                // Trigger pop animation if streak increased
                if (prevStreak !== null && newStreak > prevStreak && STREAK_MILESTONES.includes(newStreak)) {
                  setAnimateStreakNum(newStreak)
                  setAnimateOldNum(prevStreak)
                  setShowStreakAnimation(true)
                  setTimeout(() => setShowStreakAnimation(false), 3000)

                  // Update celebrated in localStorage
                  try {
                    const celebratedStr = localStorage.getItem('havn_celebrated_streaks')
                    let celebrated: Record<string, number> = celebratedStr ? JSON.parse(celebratedStr) : {}
                    celebrated[activeChatUser.id] = newStreak
                    localStorage.setItem('havn_celebrated_streaks', JSON.stringify(celebrated))
                  } catch (e) {}
                }
                setPrevStreak(newStreak)

                setConversations(convs =>
                  convs.map(c =>
                    c.otherUser.id === activeChatUser.id
                      ? { ...c, streak: newStreak }
                      : c
                  )
                )
                
                return updatedMsgs
              })
              
              // Auto scroll
              setTimeout(() => scrollToBottom('smooth'), 50)

              // If we are currently in this chat and received a message, mark it as read in database
              if (newMsg.receiver_id === currentUser.id) {
                await supabase
                  .from('direct_messages')
                  .update({ is_read: true })
                  .eq('id', newMsg.id)
              }
            }

            // 2. Update conversations list
            if (otherUser) {
              supabase
                .from('direct_messages')
                .select('*')
                .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUser.id})`)
                .then(({ data: convMsgs }) => {
                  const restoredDate = convMsgs ? getRestoredDate(otherUser as Profile, convMsgs as Message[]) : null
                  const calculatedStreak = convMsgs ? calculateStreak(convMsgs as Message[], restoredDate) : 0

                  setConversations(prev => {
                    const existingIdx = prev.findIndex(c => c.otherUser.id === otherUserId)
                    const isUnread = newMsg.receiver_id === currentUser.id && (!activeChatUser || activeChatUser.id !== otherUserId)
                    
                    const newConv: Conversation = {
                      otherUser: otherUser as Profile,
                      lastMessage: enrichedMsg,
                      unreadCount: isUnread ? 1 : 0,
                      streak: calculatedStreak
                    }

                    let updated = [...prev]
                    if (existingIdx > -1) {
                      const currentUnread = prev[existingIdx].unreadCount
                      newConv.unreadCount = isUnread ? currentUnread + 1 : 0
                      updated.splice(existingIdx, 1)
                    }
                    return [newConv, ...updated]
                  })
                })
            }
          } else if (payload.eventType === 'UPDATE') {
            const newMsg = payload.new as Message
            if (newMsg.sender_id !== currentUser.id && newMsg.receiver_id !== currentUser.id) return

            const otherUserId = newMsg.sender_id === currentUser.id ? newMsg.receiver_id : newMsg.sender_id

            // Update read status & content of messages in active chat
            if (activeChatUser && activeChatUser.id === otherUserId) {
              setMessages(prev =>
                prev.map(m => m.id === newMsg.id ? { ...m, content: newMsg.content, is_read: newMsg.is_read } : m)
              )
            }

            // Update read status, content & unread counts in conversations list
            setConversations(prev => {
              return prev.map(c => {
                if (c.otherUser.id === otherUserId) {
                  const lastMessage = c.lastMessage.id === newMsg.id 
                    ? { ...c.lastMessage, content: newMsg.content, is_read: newMsg.is_read } 
                    : c.lastMessage

                  const unreadCount = (newMsg.receiver_id === currentUser.id && newMsg.is_read) 
                    ? 0 
                    : c.unreadCount

                  return {
                    ...c,
                    lastMessage,
                    unreadCount
                  }
                }
                return c
              })
            })
          } else if (payload.eventType === 'DELETE') {
            const oldMsg = payload.old as { id: string }
            setMessages(prev => prev.filter(m => m.id !== oldMsg.id))
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        (payload) => {
          const updatedProfile = payload.new as Profile
          const enriched = enrichProfile(updatedProfile)
          if (!enriched) return

          // Update activeChatUser if it's the active user
          setActiveChatUser(prev => prev && prev.id === enriched.id ? { ...prev, ...enriched } : prev)
          // Update profiles in conversations
          setConversations(prev =>
            prev.map(c => c.otherUser.id === enriched.id ? { ...c, otherUser: { ...c.otherUser, ...enriched } } : c)
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [activeChatUser, currentUser.id])

  // Search handles
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    const delayDebounce = setTimeout(async () => {
      setSearchLoading(true)
      setIsSearching(true)
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .neq('id', currentUser.id)
          .or(`username.ilike.%${searchQuery}%,first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%`)
          .limit(8)

        if (!error && data) {
          setSearchResults(data)
        }
      } catch {
        // silent
      } finally {
        setSearchLoading(false)
      }
    }, 300)

    return () => clearTimeout(delayDebounce)
  }, [searchQuery, currentUser.id])

  async function handleDeleteMessage(msgId: string) {
    setModalConfig({
      isOpen: true,
      title: 'Mesajı Sil',
      message: 'Bu mesajı silmek istediğinizden emin misiniz? (Mesaj içeriği "Bu mesaj silindi" olarak güncellenecektir)',
      confirmText: 'Sil',
      cancelText: 'İptal',
      isDanger: true,
      onConfirm: async () => {
        const res = await deleteDirectMessage(msgId)
        if (!res.error) {
          setMessages(prev =>
            prev.map(m => m.id === msgId ? { ...m, content: '\u200B[silindi]' } : m)
          )
        } else {
          showErrorAlert(res.error)
        }
      }
    })
  }

  async function handleSaveEdit(msgId: string) {
    if (!editInputText.trim()) return
    const content = editInputText.trim()
    
    // Save original content for rollback
    const originalMessages = [...messages]
    
    // Optimistic UI update
    setMessages(prev =>
      prev.map(m => m.id === msgId ? { ...m, content: `${content}\u200B[guncellendi]` } : m)
    )
    setEditingMessageId(null)

    const res = await editDirectMessage(msgId, content)
    if (res.error) {
      setMessages(originalMessages)
      showErrorAlert(res.error)
    }
  }

  async function handleCloseConversation() {
    if (!activeChatUser) return
    setModalConfig({
      isOpen: true,
      title: 'Sohbeti Kapat',
      message: 'Bu sohbeti kapatmak istediğinizden emin misiniz? (Yeni mesaj geldiğinde sohbet geçmişinizle birlikte tekrar açılacaktır)',
      confirmText: 'Kapat',
      cancelText: 'İptal',
      isDanger: false,
      onConfirm: async () => {
        const res = await closeConversation(activeChatUser.id)
        if (!res.error) {
          setConversations(prev => prev.filter(c => c.otherUser.id !== activeChatUser.id))
          setActiveChatUser(null)
          setMessages([])
          setMobileTab('list')
        } else {
          showErrorAlert(res.error)
        }
      }
    })
  }

  async function handleRestoreStreak() {
    if (!activeChatUser) return
    const historicalStreakInfo = calculateLastActiveStreak(messages)
    const historicalStreak = historicalStreakInfo.streak
    if (historicalStreak <= 0) return

    setRestorePending(true)
    try {
      const res = await restoreStreak(activeChatUser.id)
      if (res.error) {
        showErrorAlert(res.error)
      } else if (res.success) {
        setStreakLives(res.newLives ?? 0)
        if (res.restoredDate) {
          setMyRestoredChats(prev => ({
            ...prev,
            [activeChatUser.id]: res.restoredDate
          }))
        }
        
        // Trigger celebration animation
        setAnimateOldNum(0)
        setAnimateStreakNum(historicalStreak)
        setShowStreakAnimation(true)
        setTimeout(() => setShowStreakAnimation(false), 3000)
        
        // Update local conversation streak
        setConversations(prev =>
          prev.map(c =>
            c.otherUser.id === activeChatUser.id
              ? { ...c, streak: historicalStreak }
              : c
          )
        )
      }
    } catch (err: any) {
      showErrorAlert(err.message || 'Bir hata oluştu.')
    } finally {
      setRestorePending(false)
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!activeChatUser || !inputText.trim() || sendPending) return

    const content = inputText.trim()
    setInputText('')

    // Clear typing timeout and set isCurrentlyTypingRef.current = false
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = null
    }
    isCurrentlyTypingRef.current = false

    // Broadcast that we stopped typing
    if (typingChannelRef.current) {
      typingChannelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId: currentUser.id, isTyping: false },
      })
    }

    startSendTransition(async () => {
      const res = await sendDirectMessage(activeChatUser.id, content)
      if (res.error) {
        setInputText(content) // Restore text on failure
      } else if (res.message) {
        const sentMsg = res.message as Message
        
        const updatedMsgs = [...messages, sentMsg]
        const restoredDate = getRestoredDate(activeChatUser, updatedMsgs)
        const newStreak = calculateStreak(updatedMsgs, restoredDate)
        
        // Trigger pop animation if streak increased
        if (prevStreak !== null && newStreak > prevStreak && STREAK_MILESTONES.includes(newStreak)) {
          setAnimateStreakNum(newStreak)
          setAnimateOldNum(prevStreak)
          setShowStreakAnimation(true)
          setTimeout(() => setShowStreakAnimation(false), 3000)

          // Update celebrated in localStorage
          try {
            const celebratedStr = localStorage.getItem('havn_celebrated_streaks')
            let celebrated: Record<string, number> = celebratedStr ? JSON.parse(celebratedStr) : {}
            celebrated[activeChatUser.id] = newStreak
            localStorage.setItem('havn_celebrated_streaks', JSON.stringify(celebrated))
          } catch (e) {}
        }
        setPrevStreak(newStreak)

        setMessages(prev => {
          if (prev.some(m => m.id === sentMsg.id)) return prev
          return [...prev, sentMsg]
        })
        scrollToBottom('smooth')

        // Also update conversations list lastMessage locally
        setConversations(prev => {
          const existingIdx = prev.findIndex(c => c.otherUser.id === activeChatUser.id)
          const newConv: Conversation = {
            otherUser: activeChatUser,
            lastMessage: sentMsg,
            unreadCount: 0,
            streak: newStreak
          }
          let updated = [...prev]
          if (existingIdx > -1) {
            updated.splice(existingIdx, 1)
          }
          return [newConv, ...updated]
        })
      }
    })
  }

  function handleSelectChat(user: Profile) {
    setActiveChatUser(user)
    setMobileTab('chat')
    setSearchQuery('')
    setIsSearching(false)
    
    // Add to conversations locally if not exists
    setConversations(prev => {
      if (prev.some(c => c.otherUser.id === user.id)) return prev
      return [
        {
          otherUser: user,
          unreadCount: 0,
          lastMessage: {
            id: 'temp',
            sender_id: currentUser.id,
            receiver_id: user.id,
            content: 'Sohbet başlatıldı',
            created_at: new Date().toISOString(),
            is_read: true
          }
        },
        ...prev
      ]
    })
  }

  function formatTime(dateStr: string) {
    const d = new Date(dateStr)
    const now = new Date()
    
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
    }
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
  }

  return (
    <div className="h-full w-full flex bg-background/5 relative overflow-hidden">
      
      {/* LEFT: Conversations List */}
      <div
        className={cn(
          "w-full md:w-80 border-r border-border flex flex-col h-full bg-background/40 backdrop-blur-md transition-all duration-300 flex-shrink-0",
          mobileTab === 'chat' ? 'hidden md:flex' : 'flex'
        )}
      >
        {/* Search */}
        <div className="p-4 border-b border-border/80 relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Kişi ara..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
            />
          </div>

          {/* Search Dropdown */}
          <AnimatePresence>
            {isSearching && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="absolute left-4 right-4 top-16 z-10 bg-card border border-border rounded-2xl shadow-xl overflow-hidden max-h-60 overflow-y-auto"
              >
                {searchLoading ? (
                  <div className="p-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <Loader2 size={12} className="animate-spin" /> Yükleniyor...
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted-foreground">
                    Kullanıcı bulunamadı.
                  </div>
                ) : (
                  searchResults.map(user => (
                    <button
                      key={user.id}
                      onClick={() => handleSelectChat(user)}
                      className="w-full text-left px-4 py-3 hover:bg-muted flex items-center gap-3 transition-colors cursor-pointer border-b border-border/40 last:border-0"
                    >
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt={user.username} className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                          {user.username.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <ProfileName profile={user} layout="stacked" nameClassName="text-xs" showHandle={true} />
                    </button>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Inbox Filters */}
        <div className="px-4 py-2 border-b border-border/40 flex items-center gap-1.5 select-none flex-wrap">
          <button
            onClick={() => setInboxFilter('all')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer",
              inboxFilter === 'all'
                ? "text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
            style={inboxFilter === 'all' ? { background: 'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))' } : {}}
          >
            Tümü
          </button>
          <button
            onClick={() => setInboxFilter('unread')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1",
              inboxFilter === 'unread'
                ? "text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
            style={inboxFilter === 'unread' ? { background: 'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))' } : {}}
          >
            Okunmamış
            {conversations.some(c => c.unreadCount > 0) && (
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            )}
          </button>
        </div>

        {/* Conversations List Scroll */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              {inboxFilter === 'unread'
                ? "Okunmamış mesajınız bulunmuyor."
                : "Henüz sohbetiniz yok. Yukarıdan bir kişi aratarak mesaj atmaya başlayabilirsiniz."}
            </div>
          ) : (
            filteredConversations.map(conv => {
              const isSelected = activeChatUser?.id === conv.otherUser.id
              const otherStatus = getOnlineStatus(conv.otherUser)
              const isOnline = otherStatus.status === 'online'
              return (
                <button
                  key={conv.otherUser.id}
                  onClick={() => {
                    setActiveChatUser(conv.otherUser)
                    setMobileTab('chat')
                  }}
                  className={cn(
                    "w-full text-left px-3 py-3 rounded-2xl flex gap-3 transition-all duration-200 cursor-pointer group items-center relative",
                    isSelected
                      ? "bg-primary text-primary-foreground font-medium shadow-sm"
                      : "text-foreground hover:bg-muted/80"
                  )}
                  style={isSelected ? { background: 'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))' } : {}}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    {conv.otherUser.avatar_url ? (
                      <img src={conv.otherUser.avatar_url} alt={conv.otherUser.username} className="w-10 h-10 rounded-full object-cover ring-1 ring-border/50" />
                    ) : (
                      <div
                        className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm",
                          isSelected ? "bg-background/20 text-white" : "bg-primary/10 text-primary"
                        )}
                      >
                        {conv.otherUser.username.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    {isOnline && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
                    )}
                    {conv.unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center ring-2 ring-background">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                    <div className="flex justify-between items-baseline gap-2">
                       <ProfileName
                        profile={conv.otherUser}
                        layout="inline"
                        showHandle={false}
                        nameClassName={cn("text-xs font-bold truncate", isSelected ? "text-white" : "text-foreground")}
                        streak={conv.streak}
                      />
                      <span className={cn("text-[9px]", isSelected ? "text-white/80" : "text-muted-foreground")}>
                        {formatTime(conv.lastMessage.created_at)}
                      </span>
                    </div>
                    <p className={cn("text-[11px] truncate leading-tight", isSelected ? "text-white/90" : "text-muted-foreground")}>
                      {conv.lastMessage.sender_id === currentUser.id ? 'Siz: ' : ''}{conv.lastMessage.content}
                    </p>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* RIGHT: Active Chat area */}
      <div
        className={cn(
          "flex-1 flex flex-col h-full bg-card/10 backdrop-blur-md transition-all duration-300",
          mobileTab === 'list' ? 'hidden md:flex' : 'flex'
        )}
      >
        {activeChatUser ? (
          <>
            {/* Active Header */}
            <div className="px-6 py-4 border-b border-border/80 flex items-center justify-between bg-background/10">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setMobileTab('list')}
                  className="md:hidden p-1.5 rounded-xl border border-border text-foreground hover:bg-muted"
                >
                  <ArrowLeft size={16} />
                </button>

                <Link href={`/profile/${activeChatUser.username}`} className="flex items-center gap-3 hover:opacity-85 transition-opacity">
                  <div className="flex-shrink-0">
                    {activeChatUser.avatar_url ? (
                      <img src={activeChatUser.avatar_url} alt={activeChatUser.username} className="w-9 h-9 rounded-full object-cover ring-2 ring-border" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                        {activeChatUser.username.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div>
                    <ProfileName
                      profile={activeChatUser}
                      layout="stacked"
                      nameClassName="text-sm"
                      showHandle={true}
                      streak={conversations.find(c => c.otherUser.id === activeChatUser.id)?.streak}
                    />
                    {/* Status Subtext */}
                    {isPartnerTyping ? (
                      <p className="text-[10px] text-emerald-500 font-bold animate-pulse mt-0.5">
                        ✍️ Yazıyor...
                      </p>
                    ) : (() => {
                      const statusObj = getOnlineStatus(activeChatUser)
                      return (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {statusObj.status === 'online' ? (
                            <span className="text-emerald-500 font-bold">● Çevrimiçi</span>
                          ) : (
                            statusObj.text
                          )}
                        </p>
                      )
                    })()}
                  </div>
                </Link>
              </div>

              {/* Close Convo Button */}
              {activeChatUser && (
                <button
                  onClick={handleCloseConversation}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border border-border/85 text-muted-foreground hover:text-foreground hover:bg-accent/60 rounded-xl transition-all cursor-pointer select-none active:scale-95"
                  title="Sohbeti Kapat"
                >
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <line x1="9" y1="9" x2="15" y2="15"/>
                    <line x1="15" y1="9" x2="9" y2="15"/>
                  </svg>
                  Sohbeti Kapat
                </button>
              )}
            </div>

            {/* Streak Restore Banner */}
            {(() => {
              const activeConversation = conversations.find(c => c.otherUser.id === activeChatUser.id)
              const currentStreak = activeConversation?.streak ?? 0
              const historicalStreakInfo = calculateLastActiveStreak(messages)
              const historicalStreak = historicalStreakInfo.streak
              
              const showRestoreBanner = 
                activeChatUser &&
                currentStreak === 0 &&
                historicalStreak > 0 &&
                !dismissedBanners[activeChatUser.id]
              
              if (!showRestoreBanner) return null

              return (
                <div className="mx-6 mt-4 p-4 bg-background/40 border border-orange-500/30 rounded-2xl flex items-center justify-between gap-3 shadow-[0_0_20px_rgba(249,115,22,0.08)] relative overflow-hidden backdrop-blur-md">
                  <div className="absolute -left-4 -top-4 w-12 h-12 bg-orange-500/10 rounded-full blur-xl pointer-events-none" />
                  <div className="flex items-center gap-3.5 z-10 flex-1 min-w-0">
                    <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/35 overflow-hidden flex-shrink-0">
                      <motion.span
                        animate={{ y: [0, -2, 0], scale: [1, 1.15, 1] }}
                        transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
                        className="text-lg z-10 filter drop-shadow-[0_2px_5px_rgba(249,115,22,0.5)] select-none"
                      >
                        🔥
                      </motion.span>
                      <div className="absolute inset-0 bg-orange-500/5 animate-pulse" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <p className="text-[11px] font-black text-foreground leading-tight tracking-wide uppercase bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
                        Alev Seriniz Sönmüş!
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate leading-normal mt-0.5">
                        {historicalStreak} günlük serinizi kurtarmak ister misiniz?
                      </p>
                      {/* Heart Lives Indicator */}
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="text-[8px] text-muted-foreground uppercase font-black tracking-wider select-none mr-0.5">Kalan Can:</span>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <Heart
                              key={i}
                              size={10}
                              className={cn(
                                "transition-all duration-300",
                                i <= streakLives
                                  ? "fill-rose-500 text-rose-500 drop-shadow-[0_0_3px_rgba(244,63,94,0.6)]"
                                  : "fill-zinc-200 text-zinc-200 dark:fill-zinc-800 dark:text-zinc-800"
                              )}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 z-10 flex-shrink-0">
                    <button
                      onClick={handleRestoreStreak}
                      disabled={restorePending || streakLives <= 0}
                      className="px-3 py-1.5 text-[10px] font-black tracking-wider uppercase rounded-xl text-primary-foreground transition-all cursor-pointer select-none active:scale-95 disabled:opacity-40 disabled:pointer-events-none shadow-md hover:shadow-lg"
                      style={{ background: 'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))' }}
                    >
                      {restorePending ? (
                        <Loader2 size={10} className="animate-spin" />
                      ) : (
                        'Kurtar'
                      )}
                    </button>
                    <button
                      onClick={() => setDismissedBanners(prev => ({ ...prev, [activeChatUser.id]: true }))}
                      className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer"
                      title="Kapat"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
              )
            })()}

            {/* Message Stream */}
            <div className="flex-1 overflow-y-auto p-6 bg-muted/5 scrollbar-thin">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                  <MessageSquare size={36} className="opacity-40" />
                  <span className="text-xs">Sohbeti başlatın... Bir selam verin!</span>
                </div>
              ) : (
                <div className="flex flex-col justify-end min-h-full space-y-4">
                  {messages.map((msg, index) => {
                  const isOwn = msg.sender_id === currentUser.id
                  const isRead = msg.is_read
                  
                  // Parse edited and soft-deleted states
                  let displayContent = msg.content
                  let isEdited = false
                  let isDeleted = false

                  if (displayContent === '\u200B[silindi]') {
                    isDeleted = true
                    displayContent = 'Bu mesaj silindi'
                  } else if (displayContent.includes('\u200B[guncellendi]')) {
                    isEdited = true
                    displayContent = displayContent.replace(/\u200B\[guncellendi\]/g, '')
                  }

                  const messageDate = new Date(msg.created_at);
                  const prevMsg = index > 0 ? messages[index - 1] : null;
                  const showDateSeparator = !prevMsg || 
                    new Date(prevMsg.created_at).toDateString() !== messageDate.toDateString();
                  
                  return (
                    <div key={msg.id} className="w-full flex flex-col gap-1">
                      {showDateSeparator && (
                        <div className="w-full flex justify-center my-4">
                          <span className="px-3.5 py-1.5 rounded-full text-[9px] font-black bg-card/85 backdrop-blur-md text-muted-foreground border border-border shadow-sm uppercase tracking-wider select-none">
                            {formatDividerDate(msg.created_at)}
                          </span>
                        </div>
                      )}
                      
                      <div
                        className={cn(
                          "flex flex-col gap-1 max-w-[70%] group/msg relative",
                          isOwn ? "ml-auto items-end" : "mr-auto items-start"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {/* Only show edit/delete controls for own messages that are not deleted */}
                          {isOwn && !isDeleted && editingMessageId !== msg.id && (
                            <div className="opacity-0 group-hover/msg:opacity-100 transition-opacity flex items-center gap-1 flex-shrink-0">
                              <button
                                onClick={() => {
                                  setEditingMessageId(msg.id)
                                  setEditInputText(displayContent)
                                }}
                                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-all select-none"
                                title="Mesajı Düzenle"
                              >
                                <Pencil size={12} />
                              </button>
                              <button
                                onClick={() => handleDeleteMessage(msg.id)}
                                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-destructive cursor-pointer transition-all select-none"
                                title="Mesajı Sil"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          )}
                          
                          {/* Edit Input vs Standard bubble */}
                          {editingMessageId === msg.id ? (
                            <div className="px-4 py-2.5 rounded-2xl text-xs bg-background border border-border rounded-tr-none min-w-[200px] flex flex-col gap-2">
                              <input
                                type="text"
                                value={editInputText}
                                onChange={e => setEditInputText(e.target.value)}
                                className="w-full px-2 py-1 text-xs rounded bg-muted/40 border border-border text-foreground outline-none focus:border-primary"
                                autoFocus
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleSaveEdit(msg.id)
                                  if (e.key === 'Escape') setEditingMessageId(null)
                                }}
                              />
                              <div className="flex justify-end gap-1.5 text-[10px]">
                                <button
                                  type="button"
                                  onClick={() => setEditingMessageId(null)}
                                  className="px-2 py-1 rounded hover:bg-muted text-muted-foreground transition-all cursor-pointer"
                                >
                                  İptal
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveEdit(msg.id)}
                                  className="px-2 py-1 rounded bg-primary text-primary-foreground font-bold hover:opacity-90 transition-all cursor-pointer"
                                  style={{ background: 'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))' }}
                                >
                                  Kaydet
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div
                              className={cn(
                                "px-4 py-2.5 rounded-2xl text-xs leading-relaxed shadow-sm break-all",
                                isOwn
                                  ? cn(
                                      "text-primary-foreground font-medium rounded-tr-none",
                                      isDeleted && "bg-muted/10 text-muted-foreground/60 border border-border/40 italic font-normal"
                                    )
                                  : cn(
                                      "bg-background text-foreground border border-border rounded-tl-none",
                                      isDeleted && "text-muted-foreground/60 italic font-normal"
                                    )
                              )}
                              style={isOwn && !isDeleted ? { background: 'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))' } : {}}
                            >
                              {isDeleted ? (
                                <p>{displayContent}</p>
                              ) : (
                                renderMessageContent(displayContent, isOwn)
                              )}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1.5 px-1">
                          <span className="text-[9px] text-muted-foreground select-none">
                            {dTimeOnly(msg.created_at)}
                            {isEdited && !isDeleted && (
                              <span className="text-muted-foreground/50 italic ml-1 select-none">(düzenlendi)</span>
                            )}
                          </span>
                          {isOwn && (
                            <span className="flex items-center gap-1">
                              {isRead ? (
                                <span className="cursor-help text-emerald-500 flex items-center" title="Okundu">
                                  <CheckCircle size={10} className="fill-emerald-500/10" />
                                </span>
                              ) : (
                                <span className="cursor-help text-muted-foreground/60 flex items-center" title="İletildi (Okunmadı)">
                                  <Clock size={10} />
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              }

              {/* Bouncing Typing Wave */}
              <AnimatePresence>
                {isPartnerTyping && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="flex items-center gap-2 mr-auto pt-2"
                  >
                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-background border border-border rounded-tl-none shadow-sm select-none">
                      <span className="text-[11px] text-muted-foreground mr-1 font-medium">
                        @{activeChatUser.username} yazıyor
                      </span>
                      <div className="flex gap-1 items-center">
                        {[0, 1, 2].map((i) => (
                          <motion.span
                            key={i}
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ background: 'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))' }}
                            animate={{
                              y: [0, -5, 0],
                            }}
                            transition={{
                              duration: 0.6,
                              repeat: Infinity,
                              delay: i * 0.15,
                              ease: 'easeInOut',
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

            {/* Input Form */}
            <form onSubmit={handleSend} className="p-4 border-t border-border/85 flex items-center gap-2 bg-background/20 backdrop-blur-sm">
              <EmojiPickerButton
                onInsert={(emoji) => setInputText(prev => prev + emoji)}
                className="flex-shrink-0"
              />

              <input
                type="text"
                value={inputText}
                onChange={handleInputChange}
                placeholder="Bir mesaj yazın..."
                className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground"
              />

              <button
                type="submit"
                disabled={!inputText.trim() || sendPending}
                className="p-2.5 rounded-xl transition-all cursor-pointer bg-primary text-primary-foreground hover:opacity-90 active:scale-95 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))' }}
              >
                {sendPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <div className="w-16 h-16 rounded-3xl bg-muted/60 flex items-center justify-center shadow-inner">
              <MessageSquare size={32} className="opacity-40" />
            </div>
            <div className="text-center">
              <h3 className="font-bold text-sm text-foreground">Mesajlaşma Paneli</h3>
              <p className="text-[11px] text-muted-foreground mt-1 max-w-[280px] px-4">
                Soldaki sohbet listesinden birini seçin veya yeni bir sohbet başlatmak için arama yapın.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Direct Messages Streak Overlay Animation */}
      <AnimatePresence>
        {showStreakAnimation && animateStreakNum !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md select-none overflow-hidden"
          >
            {/* Custom rising particles (flames/sparks) */}
            {Array.from({ length: 25 }).map((_, i) => {
              const size = Math.random() * 8 + 4
              const duration = Math.random() * 2 + 1.5
              const delay = Math.random() * 0.5
              const xOffset = Math.random() * 320 - 160
              return (
                <motion.div
                  key={i}
                  initial={{ y: 250, x: xOffset, opacity: 1, scale: 1 }}
                  animate={{
                    y: -350,
                    x: xOffset + (Math.random() * 60 - 30),
                    opacity: 0,
                    scale: 0.2,
                  }}
                  transition={{
                    duration,
                    delay,
                    ease: "easeOut",
                    repeat: Infinity,
                  }}
                  className="absolute rounded-full pointer-events-none z-10"
                  style={{
                    width: size,
                    height: size,
                    background: Math.random() > 0.4 
                      ? 'radial-gradient(circle, #f97316 0%, #ef4444 100%)' 
                      : 'radial-gradient(circle, #fbbf24 0%, #f97316 100%)',
                    boxShadow: '0 0 10px rgba(249, 115, 22, 0.8)',
                  }}
                />
              )
            })}

            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0, transition: { type: 'spring', damping: 15 } }}
              exit={{ scale: 0.8, y: 20 }}
              className="bg-card/90 border border-orange-500/35 rounded-3xl p-8 flex flex-col items-center text-center gap-4 max-w-xs shadow-2xl relative overflow-hidden z-20"
            >
              {/* Concentric glowing waves behind the 🔥 emoji */}
              <div className="absolute w-28 h-28 rounded-full bg-orange-500/10 border border-orange-500/20 animate-ping pointer-events-none" style={{ animationDuration: '3s' }} />
              <div className="absolute w-36 h-36 rounded-full bg-orange-500/5 border border-orange-500/10 animate-ping pointer-events-none" style={{ animationDuration: '4s' }} />
              
              {/* Glow Background Effect */}
              <div className="absolute -inset-10 bg-orange-500/10 blur-3xl rounded-full" />
              
              <motion.div
                animate={{ 
                  scale: [1, 1.2, 1],
                  rotate: [0, -8, 8, 0],
                }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                className="text-7xl filter drop-shadow-[0_4px_15px_rgba(249,115,22,0.55)] select-none z-10"
              >
                🔥
              </motion.div>
              
              <div className="space-y-1 z-10">
                <h3 className="text-lg font-black text-foreground uppercase tracking-wider bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent filter drop-shadow-[0_2px_4px_rgba(249,115,22,0.15)]">
                  {animateStreakNum === 1 ? 'Seri Başladı!' : 'Seri Büyüyor!'}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  @{activeChatUser?.username} ile sohbet seriniz büyüyor!
                </p>
              </div>
              
              <div className="flex items-baseline gap-2 z-10 mt-2">
                <span className="text-muted-foreground text-[10px] font-black tracking-widest uppercase">GÜN</span>
                <AnimatePresence mode="wait">
                  <motion.span
                    key={displayNum}
                    initial={{ scale: 0.4, y: 15, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    exit={{ scale: 0.4, y: -15, opacity: 0 }}
                    transition={{ type: 'spring', damping: 10, stiffness: 150 }}
                    className="text-5xl font-black text-foreground font-mono filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.15)]"
                  >
                    {displayNum}
                  </motion.span>
                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
