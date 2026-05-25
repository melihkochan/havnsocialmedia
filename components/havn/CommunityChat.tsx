'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Loader2, MessageSquare, ShieldCheck, Crown, Clock, Pencil, Trash2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ProfileName } from '@/components/havn/ProfileName'
import { EmojiPickerButton } from '@/components/havn/EmojiPickerButton'
import { getCommunityMessages, sendCommunityMessage, editCommunityMessage, deleteCommunityMessage } from '@/lib/actions/community-messages'
import { cn } from '@/lib/utils'

interface Profile {
  id: string
  username: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  updated_at: string
}

interface CommunityMessage {
  id: string
  community_id: string
  user_id: string
  content: string
  type: 'general' | 'announcement'
  created_at: string
  user?: Profile
}

interface CommunityChatProps {
  communityId: string
  type: 'general' | 'announcement'
  currentUser: Profile
  isAdmin: boolean
  membershipRole?: 'owner' | 'moderator' | 'member'
}

export function CommunityChat({
  communityId,
  type,
  currentUser,
  isAdmin,
  membershipRole
}: CommunityChatProps) {
  const supabase = createClient()
  const [messages, setMessages] = useState<CommunityMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [inputText, setInputText] = useState('')
  const [rolesByUserId, setRolesByUserId] = useState<Record<string, string>>({})
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [sendPending, startSendTransition] = useTransition()

  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editInputText, setEditInputText] = useState('')

  async function handleSaveEdit(msgId: string) {
    if (!editInputText.trim()) return
    const content = editInputText.trim()
    const originalMessages = [...messages]

    setMessages(prev =>
      prev.map(m => m.id === msgId ? { ...m, content } : m)
    )
    setEditingMessageId(null)

    const res = await editCommunityMessage(msgId, content)
    if (res.error) {
      setMessages(originalMessages)
      alert(res.error)
    }
  }

  async function handleDeleteMessage(msgId: string) {
    if (!confirm('Bu mesajı silmek istediğinizden emin misiniz?')) return
    const originalMessages = [...messages]

    setMessages(prev => prev.filter(m => m.id !== msgId))

    const res = await deleteCommunityMessage(msgId)
    if (res.error) {
      setMessages(originalMessages)
      alert(res.error)
    }
  }

  const scrollToBottom = (behavior: 'smooth' | 'auto' = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior })
  }

  // Load initial messages and community roles
  useEffect(() => {
    async function initChat() {
      setLoading(true)
      try {
        const [msgs, membersData] = await Promise.all([
          getCommunityMessages(communityId, type),
          supabase
            .from('community_members')
            .select('user_id, role')
            .eq('community_id', communityId)
            .eq('status', 'approved')
        ])

        setMessages(msgs)

        // Store roles mapping
        if (membersData.data) {
          const mapping: Record<string, string> = {}
          membersData.data.forEach((m: any) => {
            mapping[m.user_id] = m.role
          })
          setRolesByUserId(mapping)
        }

        setTimeout(() => scrollToBottom('auto'), 50)
      } catch (err) {
        console.error('Initialize chat error:', err)
      } finally {
        setLoading(false)
      }
    }

    initChat()
  }, [communityId, type])

  // Real-time WebSocket subscriptions
  useEffect(() => {
    const channel = supabase.channel(`community_messages_${communityId}_${type}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'community_messages',
          filter: `community_id=eq.${communityId}`
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMsg = payload.new as CommunityMessage
            if (newMsg.type !== type) return

            // Fetch sender profile details
            const { data: userProfile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', newMsg.user_id)
              .single()

            const enrichedMsg: CommunityMessage = {
              ...newMsg,
              user: userProfile ?? undefined
            }

            setMessages(prev => {
              if (prev.some(m => m.id === enrichedMsg.id)) return prev
              return [...prev, enrichedMsg]
            })

            // Auto-scroll
            setTimeout(() => scrollToBottom('smooth'), 50)
          } else if (payload.eventType === 'UPDATE') {
            const updatedMsg = payload.new as CommunityMessage
            if (updatedMsg.type !== type) return
            setMessages(prev =>
              prev.map(m => m.id === updatedMsg.id ? { ...m, content: updatedMsg.content } : m)
            )
          } else if (payload.eventType === 'DELETE') {
            const oldMsg = payload.old as { id: string }
            setMessages(prev => prev.filter(m => m.id !== oldMsg.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [communityId, type])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!inputText.trim() || sendPending) return

    const content = inputText.trim()
    setInputText('')

    startSendTransition(async () => {
      const res = await sendCommunityMessage(communityId, content, type)
      if (res.error) {
        console.error(res.error)
        setInputText(content) // Restore text on failure
      } else if (res.message) {
        const sentMsg = res.message as CommunityMessage
        setMessages(prev => {
          if (prev.some(m => m.id === sentMsg.id)) return prev
          return [...prev, sentMsg]
        })
        scrollToBottom('smooth')
      }
    })
  }

  function formatTime(dateStr: string) {
    const d = new Date(dateStr)
    return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
  }

  function renderUserBadge(userId: string, username: string) {
    // 1. Founder badge takes precedence
    if (username === 'melih') return null // ProfileName handles this automatically

    // 2. Community role badge
    const role = rolesByUserId[userId]
    if (role === 'owner') {
      return (
        <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-[9px] font-bold text-red-500 select-none">
          <Crown size={9} className="fill-red-500/10" />
          YÖNETİCİ
        </span>
      )
    }
    if (role === 'moderator') {
      return (
        <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-[9px] font-bold text-blue-500 select-none">
          <ShieldCheck size={9} />
          MOD
        </span>
      )
    }
    return null
  }

  const isWriteAllowed = type === 'general' || isAdmin

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden h-[500px] flex flex-col shadow-sm">
      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-muted/5 scrollbar-thin flex flex-col justify-end min-h-0">
        {loading ? (
          <div className="h-full flex items-center justify-center text-xs text-muted-foreground gap-2">
            <Loader2 size={16} className="animate-spin" /> Mesajlar yükleniyor...
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
            <MessageSquare size={36} className="opacity-40" />
            <span className="text-xs">Henüz mesaj gönderilmemiş. İlk yazan siz olun!</span>
          </div>
        ) : (
          <div className="space-y-4 overflow-y-auto pr-1">
            {messages.map((msg) => {
              const isOwn = msg.user_id === currentUser.id
              const sender = msg.user
              
              return (
                <div key={msg.id} className={cn("flex gap-3 items-start group relative", isOwn ? "flex-row-reverse" : "")}>
                  {/* Avatar */}
                  <div className="flex-shrink-0 mt-0.5">
                    {sender?.avatar_url ? (
                      <img src={sender.avatar_url} alt={sender.username} className="w-8 h-8 rounded-full object-cover ring-1 ring-border/50" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                        {sender?.username.slice(0, 2).toUpperCase() || 'U'}
                      </div>
                    )}
                  </div>

                  {/* Bubble Container */}
                  <div className={cn("flex flex-col gap-0.5 max-w-[70%]", isOwn ? "items-end" : "items-start")}>
                    {/* Display Name & Badges */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <ProfileName
                        profile={sender ?? { username: 'Kullanıcı', first_name: null, last_name: null }}
                        layout="inline"
                        showHandle={false}
                        nameClassName="text-[11px] font-bold text-foreground"
                      />
                      {sender && renderUserBadge(msg.user_id, sender.username)}
                      <span className="text-[9px] text-muted-foreground">
                        {formatTime(msg.created_at)}
                      </span>
                    </div>

                    {editingMessageId === msg.id ? (
                      <div className={cn("flex gap-2 items-center w-full mt-1", isOwn ? "flex-row-reverse" : "flex-row")}>
                        <input
                          type="text"
                          value={editInputText}
                          onChange={e => setEditInputText(e.target.value)}
                          className="px-3 py-1.5 rounded-lg border border-border bg-card text-foreground text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 w-44 sm:w-60"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(msg.id)
                            if (e.key === 'Escape') setEditingMessageId(null)
                          }}
                        />
                        <button
                          onClick={() => handleSaveEdit(msg.id)}
                          className="p-1.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 text-[10px] font-bold"
                        >
                          Kaydet
                        </button>
                        <button
                          onClick={() => setEditingMessageId(null)}
                          className="p-1.5 rounded bg-muted hover:bg-accent text-muted-foreground text-[10px] font-bold"
                        >
                          İptal
                        </button>
                      </div>
                    ) : (
                      <div className={cn("flex items-center gap-2 group/bubble", isOwn ? "flex-row-reverse" : "flex-row")}>
                        {/* Content Bubble */}
                        <div
                          className={cn(
                            "px-3.5 py-2 rounded-xl text-xs leading-relaxed break-all",
                            isOwn
                              ? "text-primary-foreground font-medium rounded-tr-none"
                              : "bg-background border border-border rounded-tl-none text-foreground"
                          )}
                          style={isOwn ? { background: 'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))' } : {}}
                        >
                          {msg.content}
                        </div>

                        {/* Edit/Delete controls */}
                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-all select-none">
                          {isOwn && (
                            <button
                              onClick={() => {
                                setEditingMessageId(msg.id)
                                setEditInputText(msg.content)
                              }}
                              className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                              title="Mesajı Düzenle"
                            >
                              <Pencil size={11} />
                            </button>
                          )}
                          {(isOwn || isAdmin) && (
                            <button
                              onClick={() => handleDeleteMessage(msg.id)}
                              className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-destructive cursor-pointer transition-colors"
                              title="Mesajı Sil"
                            >
                              <Trash2 size={11} />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-border/80 bg-background/20 backdrop-blur-sm">
        {isWriteAllowed ? (
          <form onSubmit={handleSend} className="flex items-center gap-2">
            <EmojiPickerButton
              onInsert={(emoji) => setInputText(prev => prev + emoji)}
              className="flex-shrink-0"
            />
            
            <input
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder={type === 'announcement' ? "Duyuru yayınlayın..." : "Sohbete yazın..."}
              className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground"
            />

            <button
              type="submit"
              disabled={!inputText.trim() || sendPending}
              className="p-2.5 rounded-xl transition-all cursor-pointer bg-primary text-primary-foreground hover:opacity-90 active:scale-95 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))' }}
            >
              {sendPending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
            </button>
          </form>
        ) : (
          <div className="text-center py-2 text-xs font-bold text-muted-foreground flex items-center justify-center gap-1.5 bg-muted/40 rounded-xl border border-border/60">
            <Clock size={12} />
            Sadece topluluk yöneticileri duyuru paylaşabilir.
          </div>
        )}
      </div>
    </div>
  )
}
