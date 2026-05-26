'use client'

import { useState, useTransition, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HelpCircle, Send, Check, Loader2, MessageSquare, AlertCircle, Clock, CheckCircle, ChevronDown, ChevronUp, User, Plus } from 'lucide-react'
import { sendSupportRequest, replyToSupportTicket, closeSupportTicketByUser, sendSupportFollowUp, closeSupportTicketByAdmin, sendAdminSupportRequest } from '@/lib/actions/support'
import { cn } from '@/lib/utils'
import { isFounder as checkIsFounder } from '@/lib/founder'
import { useSearchParams } from 'next/navigation'
import { ConfirmDialog } from '@/components/havn/ConfirmDialog'
import Link from 'next/link'

interface Ticket {
  id: string
  user_id: string
  subject: string
  message: string
  status: 'open' | 'replied' | 'closed'
  admin_reply: string | null
  replied_by?: string | null
  created_at: string
  updated_at?: string | null
  profiles?: {
    username: string
    first_name: string | null
    last_name: string | null
    avatar_url: string | null
  }
  replier?: {
    id: string
    username: string
    first_name: string | null
    last_name: string | null
    avatar_url: string | null
  } | null
}

interface SupportFormProps {
  profile: any
  isFounder: boolean
  initialTickets: any[]
  userProfiles?: any[]
  focusedTicketId?: string
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return ''
  }
}

function StatusBadge({ status, isInitiatedByAdmin, isFounder }: { status: Ticket['status']; isInitiatedByAdmin?: boolean; isFounder?: boolean }) {
  if (isInitiatedByAdmin) {
    if (status === 'closed') {
      return (
        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full border bg-zinc-500/10 border-zinc-500/20 text-muted-foreground">
          Kapatıldı
        </span>
      )
    }
    if (status === 'replied') {
      return (
        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full border bg-violet-500/10 border-violet-500/20 text-violet-500">
          {isFounder ? 'Gönderildi' : 'Yönetici Mesajı'}
        </span>
      )
    }
    if (status === 'open') {
      return (
        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full border bg-blue-500/10 border-blue-500/20 text-blue-500 animate-pulse">
          {isFounder ? 'Kullanıcı Yanıtladı' : 'Açık'}
        </span>
      )
    }
  }

  const configs = {
    open: { label: 'Açık', bg: 'bg-blue-500/10 border-blue-500/20 text-blue-500' },
    replied: { label: 'Yanıtlandı', bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' },
    closed: { label: 'Kapatıldı', bg: 'bg-zinc-500/10 border-zinc-500/20 text-muted-foreground' },
  }

  const current = configs[status] || configs.open

  return (
    <span className={cn("px-2 py-0.5 text-[10px] font-bold rounded-full border", current.bg)}>
      {current.label}
    </span>
  )
}

interface ConversationMessage {
  sender: string;
  content: string;
  isAgent: boolean;
  timestamp: string | null;
  replier?: any;
}

function parseConversation(messageText: string, initialTimestamp?: string): ConversationMessage[] {
  const regex = /\[([^\]]+) - (Yanıt|Takip Mesajı)(?:\s*\|\s*([^\]]+))?\]:?/g;
  const matches = [];
  let match;
  while ((match = regex.exec(messageText)) !== null) {
    matches.push({
      index: match.index,
      header: match[0],
      sender: match[1],
      type: match[2],
      timestamp: match[3] || null
    });
  }

  const messages: ConversationMessage[] = [];
  if (matches.length === 0) {
    messages.push({
      sender: 'Kullanıcı',
      content: messageText.trim(),
      isAgent: false,
      timestamp: initialTimestamp ? formatDate(initialTimestamp) : null
    });
  } else {
    const firstContent = messageText.substring(0, matches[0].index).trim();
    if (firstContent) {
      messages.push({
        sender: 'Kullanıcı',
        content: firstContent,
        isAgent: false,
        timestamp: initialTimestamp ? formatDate(initialTimestamp) : null
      });
    }

    for (let i = 0; i < matches.length; i++) {
      const start = matches[i].index + matches[i].header.length;
      const end = i + 1 < matches.length ? matches[i + 1].index : messageText.length;
      const content = messageText.substring(start, end).trim();
      
      messages.push({
        sender: matches[i].sender,
        content: content,
        isAgent: matches[i].sender !== 'Kullanıcı',
        timestamp: matches[i].timestamp
      });
    }
  }

  return messages;
}

export function SupportForm({ profile, isFounder, initialTickets, userProfiles = [], focusedTicketId }: SupportFormProps) {
  const searchParams = useSearchParams()
  const ticketIdParam = searchParams.get('ticketId')
  const targetTicketId = focusedTicketId || ticketIdParam || null

  const [activeTab, setActiveTab] = useState<'create' | 'list' | 'admin-create'>(() => {
    if (!isFounder) return 'create'
    const hasIncomingOpen = initialTickets.some(t => {
      const isInitiatedByAdmin = t.message?.trim().startsWith('[Kurucu - Yanıt') || t.message?.trim().startsWith('[Yönetici - Yanıt')
      return !isInitiatedByAdmin && t.status === 'open'
    })
    const hasOutgoingActive = initialTickets.some(t => {
      const isInitiatedByAdmin = t.message?.trim().startsWith('[Kurucu - Yanıt') || t.message?.trim().startsWith('[Yönetici - Yanıt')
      return isInitiatedByAdmin && (t.status === 'open' || t.status === 'replied')
    })
    if (!hasIncomingOpen && hasOutgoingActive) {
      return 'admin-create'
    }
    return 'list'
  })
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets)
  const [filter, setFilter] = useState<'all' | 'open' | 'replied' | 'closed' | 'admin'>(() => {
    if (!isFounder) {
      const hasOpen = initialTickets.some(t => {
        const isInitiatedByAdmin = t.message?.trim().startsWith('[Kurucu - Yanıt') || t.message?.trim().startsWith('[Yönetici - Yanıt')
        return t.status === 'open' || (isInitiatedByAdmin && t.status === 'replied')
      })
      return hasOpen ? 'open' : 'all'
    }

    const hasIncomingOpen = initialTickets.some(t => {
      const isInitiatedByAdmin = t.message?.trim().startsWith('[Kurucu - Yanıt') || t.message?.trim().startsWith('[Yönetici - Yanıt')
      return !isInitiatedByAdmin && t.status === 'open'
    })
    const hasOutgoingActive = initialTickets.some(t => {
      const isInitiatedByAdmin = t.message?.trim().startsWith('[Kurucu - Yanıt') || t.message?.trim().startsWith('[Yönetici - Yanıt')
      return isInitiatedByAdmin && (t.status === 'open' || t.status === 'replied')
    })
    const initialTab = (!hasIncomingOpen && hasOutgoingActive) ? 'admin-create' : 'list'

    if (initialTab === 'admin-create') {
      const hasActiveOutgoing = initialTickets.some(t => {
        const isInitiatedByAdmin = t.message?.trim().startsWith('[Kurucu - Yanıt') || t.message?.trim().startsWith('[Yönetici - Yanıt')
        return isInitiatedByAdmin && (t.status === 'open' || t.status === 'replied')
      })
      return hasActiveOutgoing ? 'open' : 'all'
    } else {
      return hasIncomingOpen ? 'open' : 'all'
    }
  })
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  
  const [confirmCloseTicketId, setConfirmCloseTicketId] = useState<string | null>(null)
  const [confirmAdminCloseTicketId, setConfirmAdminCloseTicketId] = useState<string | null>(null)
  
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null)
  const [autoOpenedId, setAutoOpenedId] = useState<string | null>(null)

  // When targetTicketId is set, scroll to it and visually highlight (no modal, no expand)
  useEffect(() => {
    if (targetTicketId && autoOpenedId !== targetTicketId) {
      const ticket = tickets.find(t => t.id === targetTicketId)
      if (ticket) {
        setAutoOpenedId(targetTicketId)
        // Ensure correct tab is shown so the ticket is visible in list
        if (isFounder) {
          const isInitiatedByAdmin = ticket.message?.trim().startsWith('[Kurucu - Yanıt') || ticket.message?.trim().startsWith('[Yönetici - Yanıt')
          setActiveTab(isInitiatedByAdmin ? 'admin-create' : 'list')
        }
        setFilter('all') // Make sure ticket isn't filtered out
        // Scroll to the ticket
        setTimeout(() => {
          const el = document.getElementById(`ticket-${targetTicketId}`)
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 350)
      }
    }
  }, [targetTicketId, tickets, isFounder, autoOpenedId])

  useEffect(() => {
    if (!isFounder) return
    const isTabAdminCreate = activeTab === 'admin-create'
    if (isTabAdminCreate) {
      const hasActiveOutgoing = tickets.some(t => {
        const isInitiatedByAdmin = t.message?.trim().startsWith('[Kurucu - Yanıt') || t.message?.trim().startsWith('[Yönetici - Yanıt')
        return isInitiatedByAdmin && (t.status === 'open' || t.status === 'replied')
      })
      setFilter(hasActiveOutgoing ? 'open' : 'all')
    } else {
      const hasIncomingOpen = tickets.some(t => {
        const isInitiatedByAdmin = t.message?.trim().startsWith('[Kurucu - Yanıt') || t.message?.trim().startsWith('[Yönetici - Yanıt')
        return !isInitiatedByAdmin && t.status === 'open'
      })
      setFilter(hasIncomingOpen ? 'open' : 'all')
    }
  }, [activeTab, tickets, isFounder])

  // Ticket creation states
  const [createPending, startCreateTransition] = useTransition()
  const [createResult, setCreateResult] = useState<{ error?: string; success?: boolean } | null>(null)

  // Admin Ticket creation states
  const [adminCreatePending, startAdminCreateTransition] = useTransition()
  const [adminCreateResult, setAdminCreateResult] = useState<{ error?: string; success?: boolean } | null>(null)

  // Reply states
  const [replyPending, startReplyTransition] = useTransition()
  const [replyText, setReplyText] = useState('')
  const [replyResult, setReplyResult] = useState<{ error?: string; success?: boolean } | null>(null)

  // Collapsible forms visibility states
  const [showAdminForm, setShowAdminForm] = useState(false)
  const [showUserForm, setShowUserForm] = useState(false)

  async function handleAdminCreateSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setAdminCreateResult(null)
    const formEl = e.currentTarget
    const fd = new FormData(formEl)
    const targetUserId = fd.get('targetUserId') as string
    const subject = fd.get('subject') as string
    const message = fd.get('message') as string

    if (!targetUserId) {
      setAdminCreateResult({ error: 'Lütfen mesaj göndermek için bir kullanıcı seçin.' })
      return
    }

    startAdminCreateTransition(async () => {
      const res = await sendAdminSupportRequest(targetUserId, subject, message)
      setAdminCreateResult(res)
      if (!res.error && res.ticket) {
        formEl.reset()
        const newTicket: Ticket = {
          ...res.ticket,
          replier: profile
        }
        setTickets([newTicket, ...tickets])
        setTimeout(() => {
          setActiveTab('list')
          setAdminCreateResult(null)
          setShowAdminForm(false)
        }, 1000)
      }
    })
  }

  async function handleCreateSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setCreateResult(null)
    const formEl = e.currentTarget
    const fd = new FormData(formEl)
    
    startCreateTransition(async () => {
      const res = await sendSupportRequest(fd)
      setCreateResult(res)
      if (!res.error) {
        // Clear fields
        formEl.reset()
        // Refresh local tickets list if we query it client-side
        // We can just add a mock one or re-fetch in real usage
        const newTicket: Ticket = {
          id: Math.random().toString(),
          user_id: profile.id,
          subject: fd.get('subject') as string,
          message: fd.get('message') as string,
          status: 'open',
          admin_reply: null,
          created_at: new Date().toISOString()
        }
        setTickets([newTicket, ...tickets])
        setTimeout(() => {
          setCreateResult(null)
          setShowUserForm(false)
        }, 1000)
      }
    })
  }

  async function handleReplySubmit(status: 'replied' | 'closed') {
    if (!selectedTicket || !replyText.trim()) return
    setReplyResult(null)

    startReplyTransition(async () => {
      const res = await replyToSupportTicket(selectedTicket.id, replyText, status)
      setReplyResult(res)
      if (!res.error) {
        // Update local list
        setTickets(prev =>
          prev.map(t =>
            t.id === selectedTicket.id
              ? { ...t, admin_reply: replyText, status, replied_by: profile.id, replier: profile }
              : t
          )
        )
        // Update selected
        setSelectedTicket(prev => prev ? { ...prev, admin_reply: replyText, status, replied_by: profile.id, replier: profile, updated_at: new Date().toISOString() } : null)
        setReplyText('')
        setTimeout(() => {
          setSelectedTicket(null)
        }, 600)
      }
    })
  }

  const filteredTickets = tickets.filter(t => {
    if (targetTicketId && t.id === targetTicketId) return true
    const isInitiatedByAdmin = t.message?.trim().startsWith('[Kurucu - Yanıt') || t.message?.trim().startsWith('[Yönetici - Yanıt')
    
    // For admins:
    if (isFounder) {
      if (activeTab === 'admin-create') {
        // Under "Kullanıcıya Yaz" tab, show only admin-initiated tickets
        if (!isInitiatedByAdmin) return false
        if (filter === 'all') return true
        if (filter === 'open') return t.status === 'replied' || t.status === 'open' // Show both admin sent and user replied under 'Açık'
        if (filter === 'closed') return t.status === 'closed'
        return true
      } else {
        // Under "Gelen Talepler" tab, show only user-initiated tickets
        if (isInitiatedByAdmin) return false
        if (filter === 'all') return true
        return t.status === filter
      }
    }
    
    // For users:
    if (filter === 'all') return true
    if (filter === 'admin') return isInitiatedByAdmin && t.status !== 'closed'
    if (filter === 'open') {
      // Show user-initiated open tickets + admin-initiated active tickets
      return t.status === 'open' || (isInitiatedByAdmin && t.status === 'replied')
    }
    if (filter === 'replied') {
      // Only show user-initiated replied tickets
      return t.status === 'replied' && !isInitiatedByAdmin
    }
    if (filter === 'closed') {
      return t.status === 'closed'
    }
    return true
  })

  return (
    <div className="flex flex-col gap-6 w-full px-1">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm"
          style={{
            background: 'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))',
            color: 'var(--primary-foreground)',
          }}
        >
          <HelpCircle size={20} />
        </div>
        <div>
          <h1 className="text-lg font-black text-foreground">Destek Portalı</h1>
          <p className="text-xs text-muted-foreground">
            {isFounder ? 'Kullanıcılardan gelen destek taleplerini yönet' : 'Bizimle iletişime geçin ve taleplerinizi takip edin'}
          </p>
        </div>
      </div>

      {isFounder && (
        <div className="flex flex-wrap gap-1.5 p-1 bg-card/40 border border-border/60 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('list')}
            className={cn(
              "px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5",
              activeTab === 'list'
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span>Gelen Talepler</span>
            {(() => {
              const count = tickets.filter(t => {
                const isInitiatedByAdmin = t.message?.trim().startsWith('[Kurucu - Yanıt') || t.message?.trim().startsWith('[Yönetici - Yanıt')
                return !isInitiatedByAdmin && t.status === 'open'
              }).length
              return count > 0 ? (
                <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[9px] font-black bg-rose-500 text-white rounded-full min-w-4 h-4 shadow-sm animate-pulse">
                  {count}
                </span>
              ) : null
            })()}
          </button>
          <button
            onClick={() => setActiveTab('admin-create')}
            className={cn(
              "px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5",
              activeTab === 'admin-create'
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span>Kullanıcıya Yaz</span>
            {(() => {
              const count = tickets.filter(t => {
                const isInitiatedByAdmin = t.message?.trim().startsWith('[Kurucu - Yanıt') || t.message?.trim().startsWith('[Yönetici - Yanıt')
                return isInitiatedByAdmin && t.status === 'open'
              }).length
              return count > 0 ? (
                <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[9px] font-black bg-blue-500 text-white rounded-full min-w-4 h-4 shadow-sm animate-pulse">
                  {count}
                </span>
              ) : null
            })()}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {activeTab === 'admin-create' && isFounder && (
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setShowAdminForm(!showAdminForm)}
              className="w-full flex items-center justify-between p-4 rounded-2xl border border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/45 hover:shadow-sm transition-all duration-200 font-bold text-xs text-primary cursor-pointer select-none group"
            >
              <div className="flex items-center gap-2.5">
                <div 
                  className="w-7 h-7 rounded-lg text-primary-foreground flex items-center justify-center group-hover:scale-105 transition-all shadow-sm"
                  style={{ background: 'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))' }}
                >
                  <Plus size={14} className="stroke-[3]" />
                </div>
                <span>Kullanıcıya Destek Mesajı Gönder</span>
              </div>
              <div className="text-primary/70">
                {showAdminForm ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </div>
            </button>

            <AnimatePresence initial={false}>
              {showAdminForm && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                  className="overflow-hidden bg-card border border-border rounded-2xl"
                >
                  <div className="p-6">
                    <form onSubmit={handleAdminCreateSubmit} className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground" htmlFor="targetUserId">Kullanıcı Seçin</label>
                        <select
                          id="targetUserId"
                          name="targetUserId"
                          required
                          className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                        >
                          <option value="">-- Bir Kullanıcı Seçin --</option>
                          {userProfiles.map((u: any) => (
                            <option key={u.id} value={u.id}>
                              {u.first_name || u.last_name
                                ? `${u.first_name || ''} ${u.last_name || ''}`.trim()
                                : `@${u.username}`}{' '}
                              (@{u.username})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground" htmlFor="subject">Konu</label>
                        <input
                          id="subject"
                          name="subject"
                          type="text"
                          required
                          placeholder="Destek konusu başlığı..."
                          className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground" htmlFor="message">Mesajınız</label>
                        <textarea
                          id="message"
                          name="message"
                          required
                          rows={6}
                          placeholder="Kullanıcıya iletmek istediğiniz başlangıç mesajını yazın..."
                          className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                        />
                      </div>

                      {adminCreateResult && (
                        <div
                          className={cn(
                            "flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border",
                            adminCreateResult.error
                              ? "bg-destructive/10 border-destructive/25 text-destructive"
                              : "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                          )}
                        >
                          {adminCreateResult.error ? <AlertCircle size={16} /> : <Check size={16} />}
                          <span>{adminCreateResult.error ?? 'Destek talebi başarıyla başlatıldı! Gelen kutusuna yönlendiriliyorsunuz...'}</span>
                        </div>
                      )}

                      <motion.button
                        type="submit"
                        disabled={adminCreatePending}
                        whileTap={{ scale: 0.98 }}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                        style={{
                          background: 'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))',
                          color: 'var(--primary-foreground)',
                        }}
                      >
                        {adminCreatePending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                        Destek Başlat
                      </motion.button>
                    </form>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {activeTab === 'create' && !isFounder && (
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setShowUserForm(!showUserForm)}
              className="w-full flex items-center justify-between p-4 rounded-2xl border border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/45 hover:shadow-sm transition-all duration-200 font-bold text-xs text-primary cursor-pointer select-none group"
            >
              <div className="flex items-center gap-2.5">
                <div 
                  className="w-7 h-7 rounded-lg text-primary-foreground flex items-center justify-center group-hover:scale-105 transition-all shadow-sm"
                  style={{ background: 'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))' }}
                >
                  <Plus size={14} className="stroke-[3]" />
                </div>
                <span>Yeni Destek Talebi Oluştur</span>
              </div>
              <div className="text-primary/70">
                {showUserForm ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </div>
            </button>

            <AnimatePresence initial={false}>
              {showUserForm && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                  className="overflow-hidden bg-card border border-border rounded-2xl"
                >
                  <div className="p-6">
                    <form onSubmit={handleCreateSubmit} className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground" htmlFor="subject">Konu</label>
                        <input
                          id="subject"
                          name="subject"
                          type="text"
                          required
                          placeholder="Örn: Profil resmi yüklerken hata alıyorum"
                          className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground" htmlFor="message">Detaylı Açıklama</label>
                        <textarea
                          id="message"
                          name="message"
                          required
                          rows={5}
                          placeholder="Yaşadığınız sorunu veya önerinizi buraya yazın..."
                          className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                        />
                      </div>

                      {createResult && (
                        <div
                          className={cn(
                            "flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border",
                            createResult.error
                              ? "bg-destructive/10 border-destructive/25 text-destructive"
                              : "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                          )}
                        >
                          {createResult.error ? <AlertCircle size={16} /> : <Check size={16} />}
                          <span>{createResult.error ?? 'Talebiniz başarıyla alındı! En kısa sürede yanıtlanacaktır.'}</span>
                        </div>
                      )}

                      <motion.button
                        type="submit"
                        disabled={createPending}
                        whileTap={{ scale: 0.98 }}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                        style={{
                          background: 'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))',
                          color: 'var(--primary-foreground)',
                        }}
                      >
                        {createPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                        Talebi Gönder
                      </motion.button>
                    </form>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Tickets List View */}
        {true && (
          <div className="flex flex-col gap-4">
            {/* List Title for Admin under 'Kullanıcıya Yaz' */}
            {isFounder && activeTab === 'admin-create' && (
              <div className="mt-8 pt-8 border-t border-border/60">
                <h3 className="text-sm font-bold text-foreground mb-1 select-none">
                  Kullanıcılara Gönderilen Mesajlar
                </h3>
                <p className="text-xs text-muted-foreground mb-2">
                  Sizin tarafınızdan başlatılan destek talepleri ve yazışmalar
                </p>
              </div>
            )}

            {/* Filter controls */}
            <div className="flex flex-wrap gap-1.5 p-1 bg-card/40 border border-border/60 rounded-xl w-fit">
              {(() => {
                if (!isFounder) return ['all', 'open', 'replied', 'admin', 'closed'] as const
                if (activeTab === 'admin-create') return ['all', 'open', 'closed'] as const
                return ['all', 'open', 'replied', 'closed'] as const
              })().map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all capitalize",
                    filter === f ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {f === 'all' 
                    ? 'Tümü' 
                    : f === 'open' 
                      ? 'Açık' 
                      : f === 'replied' 
                        ? 'Yanıtlandı' 
                        : f === 'admin' 
                          ? 'Yöneticiden' 
                          : 'Kapatıldı'}
                </button>
              ))}
            </div>

            {/* List */}
            <div className="space-y-3">
              {filteredTickets.length === 0 ? (
                <div className="bg-card border border-border rounded-2xl p-8 text-center text-muted-foreground text-sm">
                  Kayıtlı destek talebi bulunmamaktadır.
                </div>
              ) : (
                filteredTickets.map(ticket => {
                  const isExpanded = expandedTicketId === ticket.id
                  const isFocusedTicket = targetTicketId === ticket.id
                  
                  return (
                    <motion.div
                      layout
                      key={ticket.id}
                      id={`ticket-${ticket.id}`}
                      className={cn(
                        "bg-card border rounded-2xl overflow-hidden transition-all duration-200",
                        isFocusedTicket
                          ? "border-primary/50 ring-2 ring-primary/15 shadow-[0_0_30px_color-mix(in_oklch,var(--primary)_15%,transparent)]"
                          : isExpanded ? "border-primary/40 shadow-sm" : "border-border hover:border-border/120"
                      )}
                    >
                      {isFocusedTicket && !isFounder && (
                        <div className="flex items-center gap-2 px-5 py-2.5 border-b border-primary/20 bg-primary/5 select-none">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                          <span className="text-[10px] font-black text-primary tracking-wider uppercase">Odaklanılan Talep</span>
                        </div>
                      )}
                      {/* Ticket Header (Clickable) */}
                      <div
                        onClick={() => {
                          if (isFounder) {
                            setSelectedTicket(ticket)
                            setReplyText('')
                            setReplyResult(null)
                          } else {
                            setExpandedTicketId(isExpanded ? null : ticket.id)
                          }
                        }}
                        className="p-5 flex items-center justify-between gap-4 cursor-pointer select-none"
                      >
                        <div className="flex flex-col gap-1 min-w-0">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="font-bold text-sm text-foreground truncate">{ticket.subject}</span>
                            <StatusBadge status={ticket.status} isInitiatedByAdmin={ticket.message?.trim().startsWith('[Kurucu - Yanıt') || ticket.message?.trim().startsWith('[Yönetici - Yanıt')} isFounder={isFounder} />
                          </div>
                          
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-1">
                            <Clock size={10} />
                            <span>{formatDate(ticket.created_at)}</span>
                            {isFounder && ticket.profiles && (
                              <>
                                <span>•</span>
                                <Link href={`/profile/${ticket.profiles.username}`} className="font-bold text-primary hover:underline">
                                  @{ticket.profiles.username}
                                </Link>
                              </>
                            )}
                          </div>
                        </div>

                        {isFounder ? (
                          <div className="px-3 py-1.5 rounded-lg border border-border text-[11px] font-bold hover:bg-muted text-foreground transition-all">
                            Yönet
                          </div>
                        ) : (
                          <div className="text-muted-foreground">
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </div>
                        )}
                      </div>

                      {/* Ticket Detail (User collapse view) */}
                      {!isFounder && isExpanded && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="px-5 pb-5 border-t border-border/40 pt-4 bg-muted/20"
                        >
                          <div className="space-y-4">
                            {/* Conversations Timeline */}
                            <div className="space-y-3">
                              <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase select-none">
                                Konuşma Geçmişi
                              </span>
                              <div className="space-y-4">
                                {(() => {
                                  const conversation = parseConversation(ticket.message, ticket.created_at);
                                  if (ticket.admin_reply) {
                                    const replierLabel = ticket.replied_by === 'ea58c495-0c6c-49a7-bfc6-30ae3ed253a9' ? 'Kurucu' : 'Yönetici';
                                    conversation.push({
                                      sender: replierLabel,
                                      content: ticket.admin_reply,
                                      isAgent: true,
                                      replier: ticket.replier,
                                      timestamp: ticket.updated_at ? formatDate(ticket.updated_at) : null
                                    });
                                  }

                                  return conversation.map((msg, idx) => {
                                    const isUser = !msg.isAgent;
                                    const msgReplier = msg.isAgent ? (msg.replier || ticket.replier) : null;

                                    return (
                                      <div key={idx} className="space-y-1">
                                        <div className="flex items-center justify-between gap-1.5 select-none w-full">
                                          <div className="flex items-center gap-1.5">
                                            {isUser ? (
                                              ticket.profiles ? (
                                                <Link href={`/profile/${ticket.profiles.username}`} className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
                                                  <User size={11} className="text-muted-foreground" />
                                                  <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase hover:underline">
                                                    {ticket.profiles.first_name || ticket.profiles.last_name
                                                      ? `${ticket.profiles.first_name || ''} ${ticket.profiles.last_name || ''}`.trim()
                                                      : `@${ticket.profiles.username}`}
                                                  </span>
                                                </Link>
                                              ) : (
                                                <div className="flex items-center gap-1.5">
                                                  <User size={11} className="text-muted-foreground" />
                                                  <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">
                                                    Talep Sahibi
                                                  </span>
                                                </div>
                                              )
                                            ) : (
                                              msgReplier ? (
                                                <Link href={`/profile/${msgReplier.username}`} className="flex items-center gap-1.5 hover:opacity-85 transition-opacity">
                                                  {msgReplier.avatar_url ? (
                                                    <img
                                                      src={msgReplier.avatar_url}
                                                      alt={msgReplier.username}
                                                      className="w-4 h-4 rounded-full object-cover ring-1 ring-amber-500/20"
                                                    />
                                                  ) : (
                                                    <div className="w-4 h-4 rounded-full bg-amber-500/10 flex items-center justify-center ring-1 ring-amber-500/20">
                                                      <User size={8} className="text-amber-500" />
                                                    </div>
                                                  )}
                                                  <span className="text-[10px] font-bold text-amber-500 tracking-wider uppercase hover:underline">
                                                    {msgReplier.first_name || msgReplier.last_name
                                                      ? `${msgReplier.first_name || ''} ${msgReplier.last_name || ''}`.trim()
                                                      : `@${msgReplier.username}`}
                                                  </span>
                                                  <span className={cn(
                                                    "px-1.5 py-0.5 text-[8px] font-black tracking-wider uppercase rounded-sm scale-95",
                                                    checkIsFounder(msgReplier) || msg.sender === 'Kurucu'
                                                      ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                                                      : "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                                                  )}>
                                                    {checkIsFounder(msgReplier) || msg.sender === 'Kurucu' ? 'Kurucu' : 'Yönetici'}
                                                  </span>
                                                </Link>
                                              ) : (
                                                <div className="flex items-center gap-1.5">
                                                  <div className="w-4 h-4 rounded-full bg-amber-500/10 flex items-center justify-center ring-1 ring-amber-500/20">
                                                    <User size={8} className="text-amber-500" />
                                                  </div>
                                                  <span className="text-[10px] font-bold text-amber-500 tracking-wider uppercase">
                                                    {msg.sender}
                                                  </span>
                                                  <span className={cn(
                                                    "px-1.5 py-0.5 text-[8px] font-black tracking-wider uppercase rounded-sm scale-95",
                                                    msg.sender === 'Kurucu'
                                                      ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                                                      : "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                                                  )}>
                                                    {msg.sender === 'Kurucu' ? 'Kurucu' : 'Yönetici'}
                                                  </span>
                                                </div>
                                              )
                                            )}
                                          </div>
                                          
                                          {msg.timestamp && (
                                            <span className="text-[9px] text-muted-foreground font-medium flex items-center gap-1">
                                              <Clock size={9} />
                                              {msg.timestamp}
                                            </span>
                                          )}
                                        </div>

                                        <div className={cn(
                                          "rounded-2xl p-3.5 text-xs leading-relaxed whitespace-pre-wrap border",
                                          isUser
                                            ? "bg-background border-border/80 text-foreground font-medium"
                                            : "bg-gradient-to-br from-amber-500/5 to-yellow-500/5 border-amber-500/20 text-foreground font-semibold"
                                        )}>
                                          {msg.content}
                                        </div>
                                      </div>
                                    );
                                  });
                                })()}
                              </div>
                            </div>

                            {!ticket.admin_reply && ticket.status !== 'closed' && (
                              <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground select-none">
                                <Clock size={11} className="animate-spin text-blue-400" />
                                Yanıt bekleniyor...
                              </div>
                            )}

                            {ticket.status === 'closed' && (
                              <div className="pt-2 text-[10px] text-muted-foreground flex items-center gap-1.5 justify-end font-medium select-none">
                                <CheckCircle size={11} className="text-emerald-500" />
                                Bu talep {ticket.updated_at ? `${formatDate(ticket.updated_at)} tarihinde ` : ''}kapatıldı.
                              </div>
                            )}

                            {ticket.status !== 'closed' && (
                              <div className="pt-4 border-t border-border/40 space-y-3">
                                <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">
                                  Yeni Mesaj Yazın
                                </span>
                                <div className="flex flex-col gap-2">
                                  <textarea
                                    placeholder="Yetkiliye cevap yazın veya sorunu detaylandırın..."
                                    rows={3}
                                    id={`user-reply-${ticket.id}`}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs outline-none focus:border-primary transition-all resize-none"
                                  />
                                  <div className="flex gap-2 justify-end">
                                    <button
                                      onClick={async () => {
                                        const textEl = document.getElementById(`user-reply-${ticket.id}`) as HTMLTextAreaElement
                                        const text = textEl?.value || ''
                                        if (!text.trim()) return
                                        
                                        const res = await sendSupportFollowUp(ticket.id, text)
                                        if (!res.error) {
                                          textEl.value = ''
                                          // Update local state
                                          setTickets(prev =>
                                            prev.map(t => {
                                              if (t.id === ticket.id) {
                                                const isReplierFounder = t.replier ? checkIsFounder(t.replier) : (t.replied_by === 'ea58c495-0c6c-49a7-bfc6-30ae3ed253a9')
                                                const replierLabel = isReplierFounder ? 'Kurucu' : 'Yönetici'
                                                return {
                                                  ...t,
                                                  message: t.message + (t.admin_reply ? `\n\n[${replierLabel} - Yanıt]:\n${t.admin_reply}` : '') + `\n\n[Kullanıcı - Takip Mesajı]:\n${text.trim()}`,
                                                  admin_reply: null,
                                                  status: 'open' as const,
                                                  updated_at: new Date().toISOString()
                                                }
                                              }
                                              return t
                                            })
                                          )
                                        } else {
                                          alert(res.error)
                                        }
                                      }}
                                      className="px-4 py-2 rounded-xl text-xs font-bold text-primary-foreground hover:opacity-90 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                                      style={{ background: 'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))' }}
                                    >
                                      <Send size={11} />
                                      Cevap Gönder
                                    </button>
                                    {!(ticket.message.trim().startsWith('[Kurucu - Yanıt') || ticket.message.trim().startsWith('[Yönetici - Yanıt')) && (
                                      <button
                                        onClick={() => setConfirmCloseTicketId(ticket.id)}
                                        className="px-4 py-2 rounded-xl text-xs font-bold border border-border text-foreground hover:bg-accent active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                                      >
                                        <CheckCircle size={11} />
                                        Talebi Çözüldü Olarak Kapat
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  )
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Admin Reply Modal (Only for Founder) */}
      <AnimatePresence>
        {isFounder && selectedTicket && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-3xl w-full max-w-lg overflow-hidden shadow-xl"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                <div className="flex flex-col">
                  <h3 className="font-bold text-sm text-foreground truncate max-w-[280px]">
                    Destek Talebi Detayı
                  </h3>
                  <span className="text-[10px] text-muted-foreground">
                    Gönderen: @{selectedTicket.profiles?.username} • {formatDate(selectedTicket.created_at)}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground rounded-lg border border-border/80 transition-colors"
                >
                  Kapat
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                {/* Conversations Timeline */}
                <div className="space-y-3">
                  <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase select-none">
                    Konuşma Geçmişi
                  </span>
                  <div className="space-y-4 max-h-[35vh] overflow-y-auto pr-1">
                    {(() => {
                      const conversation = parseConversation(selectedTicket.message, selectedTicket.created_at);
                      if (selectedTicket.admin_reply) {
                        const replierLabel = selectedTicket.replied_by === 'ea58c495-0c6c-49a7-bfc6-30ae3ed253a9' ? 'Kurucu' : 'Yönetici';
                        conversation.push({
                          sender: replierLabel,
                          content: selectedTicket.admin_reply,
                          isAgent: true,
                          replier: selectedTicket.replier,
                          timestamp: selectedTicket.updated_at ? formatDate(selectedTicket.updated_at) : null
                        });
                      }

                      return conversation.map((msg, idx) => {
                        const isUser = !msg.isAgent;
                        const msgReplier = msg.isAgent ? (msg.replier || selectedTicket.replier) : null;

                        return (
                          <div key={idx} className="space-y-1">
                            <div className="flex items-center justify-between gap-1.5 select-none w-full">
                              <div className="flex items-center gap-1.5">
                                {isUser ? (
                                  selectedTicket.profiles ? (
                                    <Link href={`/profile/${selectedTicket.profiles.username}`} className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
                                      <User size={11} className="text-muted-foreground" />
                                      <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase hover:underline">
                                        {selectedTicket.profiles.first_name || selectedTicket.profiles.last_name
                                          ? `${selectedTicket.profiles.first_name || ''} ${selectedTicket.profiles.last_name || ''}`.trim()
                                          : `@${selectedTicket.profiles.username}`}
                                      </span>
                                    </Link>
                                  ) : (
                                    <div className="flex items-center gap-1.5">
                                      <User size={11} className="text-muted-foreground" />
                                      <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">
                                        Kullanıcı
                                      </span>
                                    </div>
                                  )
                                ) : (
                                  msgReplier ? (
                                    <Link href={`/profile/${msgReplier.username}`} className="flex items-center gap-1.5 hover:opacity-85 transition-opacity">
                                      {msgReplier.avatar_url ? (
                                        <img
                                          src={msgReplier.avatar_url}
                                          alt={msgReplier.username}
                                          className="w-4 h-4 rounded-full object-cover ring-1 ring-amber-500/20"
                                        />
                                      ) : (
                                        <div className="w-4 h-4 rounded-full bg-amber-500/10 flex items-center justify-center ring-1 ring-amber-500/20">
                                          <User size={8} className="text-amber-500" />
                                        </div>
                                      )}
                                      <span className="text-[10px] font-bold text-amber-500 tracking-wider uppercase hover:underline">
                                        {msgReplier.first_name || msgReplier.last_name
                                          ? `${msgReplier.first_name || ''} ${msgReplier.last_name || ''}`.trim()
                                          : `@${msgReplier.username}`}
                                      </span>
                                      <span className={cn(
                                        "px-1.5 py-0.5 text-[8px] font-black tracking-wider uppercase rounded-sm scale-95",
                                        checkIsFounder(msgReplier) || msg.sender === 'Kurucu'
                                          ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                                          : "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                                      )}>
                                        {checkIsFounder(msgReplier) || msg.sender === 'Kurucu' ? 'Kurucu' : 'Yönetici'}
                                      </span>
                                    </Link>
                                  ) : (
                                    <div className="flex items-center gap-1.5">
                                      <div className="w-4 h-4 rounded-full bg-amber-500/10 flex items-center justify-center ring-1 ring-amber-500/20">
                                        <User size={8} className="text-amber-500" />
                                      </div>
                                      <span className="text-[10px] font-bold text-amber-500 tracking-wider uppercase">
                                        {msg.sender}
                                      </span>
                                      <span className={cn(
                                        "px-1.5 py-0.5 text-[8px] font-black tracking-wider uppercase rounded-sm scale-95",
                                        msg.sender === 'Kurucu'
                                          ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                                          : "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                                      )}>
                                        {msg.sender === 'Kurucu' ? 'Kurucu' : 'Yönetici'}
                                      </span>
                                    </div>
                                  )
                                )}
                              </div>

                              {msg.timestamp && (
                                <span className="text-[9px] text-muted-foreground font-medium flex items-center gap-1">
                                  <Clock size={9} />
                                  {msg.timestamp}
                                </span>
                              )}
                            </div>

                            <div className={cn(
                              "rounded-2xl p-3.5 text-xs leading-relaxed whitespace-pre-wrap border",
                              isUser
                                ? "bg-muted/40 border-border/80 text-foreground font-medium"
                                : "bg-gradient-to-br from-amber-500/5 to-yellow-500/5 border-amber-500/20 text-foreground font-semibold"
                            )}>
                              {idx === 0 && (
                                <div className="font-bold mb-1 text-foreground/80">
                                  Konu: {selectedTicket.subject}
                                </div>
                              )}
                              {msg.content}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* Status and Form */}
                {selectedTicket.status === 'closed' ? (
                  <div className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-center text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1.5 select-none">
                    <CheckCircle size={14} className="text-emerald-500" />
                    Bu talep {selectedTicket.updated_at ? `${formatDate(selectedTicket.updated_at)} tarihinde ` : ''}kapatılmıştır.
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                          <MessageSquare size={12} className="text-amber-500" />
                          Yanıtınız
                        </label>
                        {selectedTicket.admin_reply && (
                          <span className="text-[10px] text-muted-foreground">
                            Son yanıtlayan: <span className="font-bold text-foreground">
                              {selectedTicket.replier
                                ? (selectedTicket.replier.first_name || selectedTicket.replier.last_name
                                  ? `${selectedTicket.replier.first_name || ''} ${selectedTicket.replier.last_name || ''}`.trim()
                                  : `@${selectedTicket.replier.username}`)
                                : 'Destek Ekibi'
                              }
                            </span>
                          </span>
                        )}
                      </div>
                      <textarea
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        rows={5}
                        required
                        placeholder="Kullanıcıya iletilecek çözüm veya bilgilendirme yazın..."
                        className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                      />
                    </div>

                    {replyResult && (
                      <div
                        className={cn(
                          "flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-semibold border",
                          replyResult.error
                            ? "bg-destructive/10 border-destructive/25 text-destructive"
                            : "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                        )}
                      >
                        {replyResult.error ? <AlertCircle size={14} /> : <CheckCircle size={14} />}
                        <span>{replyResult.error ?? 'Yanıt kaydedildi ve kullanıcıya e-posta gönderildi!'}</span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 justify-end pt-2">
                      <button
                        onClick={() => setConfirmAdminCloseTicketId(selectedTicket.id)}
                        disabled={replyPending}
                        className="px-4 py-2.5 rounded-xl text-xs font-bold border border-destructive/60 text-destructive hover:bg-destructive/5 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        {replyPending ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                        Direkt Kapat
                      </button>
                      <button
                        onClick={() => handleReplySubmit('replied')}
                        disabled={replyPending || !replyText.trim()}
                        className="px-4 py-2.5 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:opacity-90 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        {replyPending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                        Yanıtla
                      </button>
                      <button
                        onClick={() => handleReplySubmit('closed')}
                        disabled={replyPending || !replyText.trim()}
                        className="px-4 py-2.5 rounded-xl text-xs font-bold border border-border text-foreground hover:bg-accent active:scale-95 disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        {replyPending ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                        Yanıtla ve Talebi Kapat
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={!!confirmCloseTicketId}
        onClose={() => setConfirmCloseTicketId(null)}
        onConfirm={async () => {
          if (!confirmCloseTicketId) return
          const ticketId = confirmCloseTicketId
          setConfirmCloseTicketId(null)
          const res = await closeSupportTicketByUser(ticketId)
          if (!res.error) {
            setTickets(prev =>
              prev.map(t =>
                t.id === ticketId ? { ...t, status: 'closed', updated_at: new Date().toISOString() } : t
              )
            )
          } else {
            alert(res.error)
          }
        }}
        title="Talebi Kapat"
        description="Talebinizi çözüldü olarak kapatmak istediğinize emin misiniz? Bu işlem geri alınamaz."
        confirmLabel="Talebi Kapat"
        cancelLabel="Vazgeç"
      />

      <ConfirmDialog
        open={!!confirmAdminCloseTicketId}
        onClose={() => setConfirmAdminCloseTicketId(null)}
        onConfirm={async () => {
          if (!confirmAdminCloseTicketId || !selectedTicket) return
          const ticketId = confirmAdminCloseTicketId
          setConfirmAdminCloseTicketId(null)
          startReplyTransition(async () => {
            const res = await closeSupportTicketByAdmin(ticketId)
            setReplyResult(res)
            if (!res.error) {
              setTickets(prev =>
                prev.map(t =>
                  t.id === ticketId
                    ? { ...t, status: 'closed', replied_by: profile.id, replier: profile, updated_at: new Date().toISOString() }
                    : t
                )
              )
              setSelectedTicket(prev => prev ? { ...prev, status: 'closed', replied_by: profile.id, replier: profile, updated_at: new Date().toISOString() } : null)
              setReplyText('')
              setTimeout(() => {
                setSelectedTicket(null)
              }, 600)
            }
          })
        }}
        title="Talebi Yanıtsız Kapat"
        description="Bu destek talebini herhangi bir yanıt yazmadan kapatmak istediğinize emin misiniz?"
        confirmLabel="Talebi Kapat"
        cancelLabel="Vazgeç"
        variant="destructive"
      />
    </div>
  )
}
