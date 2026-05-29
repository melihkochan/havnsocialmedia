'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getHQMessages, sendHQMessage, getTeamMembers } from '@/lib/actions/hq-chat'
import { Send, Lock, Loader2, MessageSquare, Shield } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Message {
  id: string
  user_id: string
  content: string
  created_at: string
  user?: {
    id: string
    username: string
    first_name: string | null
    last_name: string | null
    avatar_url: string | null
    role: string | null
  } | null
}

const ROLE_COLORS: Record<string, string> = {
  founder: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
  admin: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
  moderator: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
}

function getTeamMemberStatus(lastSeenAt?: string | null, showStatus?: boolean) {
  if (showStatus === false || !lastSeenAt) return 'offline'
  
  const lastSeen = new Date(lastSeenAt)
  const now = new Date()
  const diffMs = now.getTime() - lastSeen.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  
  if (diffMins < 3) return 'online'
  if (diffMins < 10) return 'idle'
  return 'offline'
}

export function HQTeamChat({ currentUserId }: { currentUserId: string }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function loadTeam() {
      try {
        const data = await getTeamMembers()
        setTeamMembers(data)
      } catch (err) {
        console.error('Failed to load team members:', err)
      }
    }
    loadTeam()
    const interval = setInterval(loadTeam, 15000)
    return () => clearInterval(interval)
  }, [messages])

  useEffect(() => {
    async function loadMessages() {
      try {
        const data = await getHQMessages()
        setMessages(data as any)
      } catch (err) {
        console.error('Failed to load HQ messages:', err)
      } finally {
        setLoading(false)
      }
    }
    loadMessages()
  }, [])

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('hq-chat-room')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'hq_messages' },
        async (payload) => {
          // Fetch profile of the sender
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, username, first_name, last_name, avatar_url, role')
            .eq('id', payload.new.user_id)
            .single()

          const newMessage: Message = {
            id: payload.new.id,
            user_id: payload.new.user_id,
            content: payload.new.content,
            created_at: payload.new.created_at,
            user: profile,
          }

          setMessages((prev) => {
            if (prev.some((m) => m.id === newMessage.id)) return prev
            return [...prev, newMessage]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim() || sending) return

    const text = inputText.trim()
    setInputText('')
    setSending(true)

    const res = await sendHQMessage(text)
    if (res?.error) {
      alert(`Mesaj gönderilemedi: ${res.error}`)
    } else if (res?.message) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === res.message.id)) return prev
        return [...prev, res.message]
      })
    }
    setSending(false)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-xs text-muted-foreground">Ekip sohbeti yükleniyor...</p>
      </div>
    )
  }

  return (
    <div
      className="rounded-2xl border border-border bg-card/40 backdrop-blur-md flex h-[680px] overflow-hidden"
    >
      {/* Left Sidebar: Team Members */}
      <div className="w-60 border-r border-border/60 bg-muted/5 flex flex-col h-full flex-shrink-0 select-none">
        <div className="p-4 border-b border-border/60 bg-muted/15 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-foreground">Aktif Ekip</h3>
            <p className="text-[9px] text-muted-foreground mt-0.5">
              {teamMembers.filter(m => getTeamMemberStatus(m.last_seen_at, m.show_status) === 'online').length} Çevrimiçi
            </p>
          </div>
          <span className="text-[8px] font-black text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded-md uppercase tracking-wider">
            {teamMembers.length} Yetkili
          </span>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {teamMembers.map((member) => {
            const isOwn = member.id === currentUserId
            const status = getTeamMemberStatus(member.last_seen_at, member.show_status)
            const statusColor = status === 'online' ? 'bg-emerald-500' : status === 'idle' ? 'bg-amber-500' : 'bg-slate-500'
            const statusLabel = status === 'online' ? 'Çevrimiçi' : status === 'idle' ? 'Boşta' : 'Çevrimdışı'
            
            const initials = [member.first_name?.[0], member.last_name?.[0]].filter(Boolean).join('').toUpperCase()
              || member.username.slice(0, 2).toUpperCase()
            
            return (
              <div
                key={member.id}
                className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-white/[0.03] transition-all"
              >
                {/* Avatar with Status Dot overlay */}
                <div className="relative flex-shrink-0">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black text-white overflow-hidden shadow-sm"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
                  >
                    {member.avatar_url ? (
                      <img src={member.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : initials}
                  </div>
                  {/* Status dot overlay */}
                  <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#0d0d1a] ${statusColor}`} title={statusLabel} />
                </div>
                
                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold text-white truncate">
                    {member.first_name || member.username} {isOwn && <span className="text-[9px] text-muted-foreground font-normal">(Siz)</span>}
                  </p>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                    {member.role === 'founder' ? 'Kurucu' : member.role === 'admin' ? 'Yönetici' : 'Moderatör'}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Right Side: Chat Box */}
      <div className="flex-1 flex flex-col h-full min-w-0">
        {/* Top Banner */}
        <div className="p-4 border-b border-border/60 bg-muted/20 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 text-primary">
            <MessageSquare size={16} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-foreground">HQ Dahili İletişim</h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">Sadece platform yöneticileri ve ekip üyeleri görebilir.</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-rose-500/20 bg-rose-500/5 text-[9px] font-black text-rose-500 uppercase tracking-wider">
          <Lock size={10} />
          <span>Şifreli & Gizli</span>
        </div>
      </div>

      {/* Messages list */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 min-h-0">
        {messages.map((msg, i) => {
          const isOwn = msg.user_id === currentUserId
          const displayName = msg.user
            ? `${msg.user.first_name || ''} ${msg.user.last_name || ''}`.trim() || `@${msg.user.username}`
            : 'Sistem Yetkilisi'

          const initials = msg.user
            ? [msg.user.first_name?.[0], msg.user.last_name?.[0]].filter(Boolean).join('').toUpperCase() || msg.user.username.slice(0, 2).toUpperCase()
            : 'HQ'

          const roleStyle = msg.user?.role ? ROLE_COLORS[msg.user.role] : null

          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex items-start gap-3 max-w-[70%] ${isOwn ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
            >
              {/* Avatar */}
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black text-white flex-shrink-0 overflow-hidden shadow-md"
                style={{ background: isOwn ? 'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))' : 'linear-gradient(135deg, #4f46e5, #3b82f6)' }}
              >
                {msg.user?.avatar_url ? (
                  <img src={msg.user.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : initials}
              </div>

              {/* Bubble Body */}
              <div className="space-y-1 min-w-[120px]">
                {/* Meta */}
                <div className={`flex items-center gap-1.5 text-[10px] ${isOwn ? 'justify-end' : 'justify-start'}`}>
                  <span className="font-bold text-foreground/80">{displayName}</span>
                  {msg.user?.role && msg.user.role !== 'member' && (
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase border ${roleStyle}`}>
                      {msg.user.role === 'founder' ? 'Kurucu' : msg.user.role === 'admin' ? 'Yönetici' : 'Moderatör'}
                    </span>
                  )}
                  <span className="text-muted-foreground/60">
                    {new Date(msg.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* Bubble */}
                <div
                  className={`p-3 rounded-2xl text-xs leading-relaxed break-words shadow-sm ${
                    isOwn
                      ? 'bg-primary text-white rounded-tr-none'
                      : 'bg-muted/40 border border-border text-foreground rounded-tl-none'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            </motion.div>
          )
        })}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-2">
            <MessageSquare size={24} className="text-muted-foreground/45" />
            <p className="text-xs text-muted-foreground font-semibold">Henüz mesaj yok</p>
            <p className="text-[10px] text-muted-foreground/60 max-w-xs">Geliştirici ekibi ve sistem yöneticileri ile sohbet etmek için ilk mesajı yazın.</p>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input panel */}
      <form onSubmit={handleSend} className="p-3 border-t border-border/60 bg-muted/10 flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Ekip arkadaşlarınıza bir şeyler yazın..."
          className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background/55 text-xs text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/60"
        />
        <button
          type="submit"
          disabled={sending || !inputText.trim()}
          className="p-2.5 rounded-xl bg-primary text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center cursor-pointer shadow-md shadow-primary/10"
        >
          {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        </button>
      </form>
    </div>
  </div>
  )
}
