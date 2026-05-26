'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { Clock, CheckCircle, MessageSquare, User, Sparkles, Heart, X, ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { isFounder } from '@/lib/founder'

interface ProfileTabsClientProps {
  tickets?: any[]
  suggestions?: any[]
  isCurrentFounder: boolean
  profile: any
  tab: 'tickets' | 'suggestions'
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

interface ConversationMessage {
  sender: string
  content: string
  isAgent: boolean
  timestamp: string | null
  replier?: any
}

function parseConversation(messageText: string, initialTimestamp?: string): ConversationMessage[] {
  const regex = /\[([^\]]+) - (Yanıt|Takip Mesajı)(?:\s*\|\s*([^\]]+))?\]:?/g
  const matches = []
  let match
  while ((match = regex.exec(messageText)) !== null) {
    matches.push({
      index: match.index,
      header: match[0],
      sender: match[1],
      type: match[2],
      timestamp: match[3] || null
    })
  }

  const messages: ConversationMessage[] = []
  if (matches.length === 0) {
    messages.push({
      sender: 'Kullanıcı',
      content: messageText.trim(),
      isAgent: false,
      timestamp: initialTimestamp ? formatDate(initialTimestamp) : null
    })
  } else {
    const firstContent = messageText.substring(0, matches[0].index).trim()
    if (firstContent) {
      messages.push({
        sender: 'Kullanıcı',
        content: firstContent,
        isAgent: false,
        timestamp: initialTimestamp ? formatDate(initialTimestamp) : null
      })
    }

    for (let i = 0; i < matches.length; i++) {
      const start = matches[i].index + matches[i].header.length
      const end = i + 1 < matches.length ? matches[i + 1].index : messageText.length
      const content = messageText.substring(start, end).trim()
      
      messages.push({
        sender: matches[i].sender,
        content: content,
        isAgent: matches[i].sender !== 'Kullanıcı',
        timestamp: matches[i].timestamp
      })
    }
  }

  return messages
}

export function ProfileTabsClient({ tickets = [], suggestions = [], isCurrentFounder, profile, tab }: ProfileTabsClientProps) {
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null)
  const [selectedSuggestion, setSelectedSuggestion] = useState<any | null>(null)

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'open':
        return {
          label: 'Açık',
          classes: 'bg-sky-500/10 border-sky-500/20 text-sky-600 dark:text-sky-400'
        }
      case 'in_progress':
        return {
          label: 'Yapılıyor',
          classes: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
        }
      case 'completed':
        return {
          label: 'Tamamlandı',
          classes: 'bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400'
        }
      case 'closed':
        return {
          label: 'Kapatıldı',
          classes: 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
        }
      default:
        return {
          label: 'Bilinmiyor',
          classes: 'bg-zinc-500/10 border-zinc-500/20 text-muted-foreground'
        }
    }
  }

  if (tab === 'tickets') {
    return (
      <div className="mt-2 flex flex-col gap-3">
        <h2 className="text-sm font-bold text-foreground mb-1 select-none">Destek Talepleri</h2>
        {tickets.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-8 text-center text-muted-foreground text-xs select-none">
            Bu kullanıcının henüz açtığı bir destek talebi bulunmamaktadır.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {tickets.map((ticket: any) => (
              <div
                key={ticket.id}
                onClick={() => setSelectedTicket(ticket)}
                className="bg-card border border-border rounded-2xl p-5 hover:border-primary/45 hover:shadow-xs transition-all duration-200 flex items-center justify-between gap-4 cursor-pointer select-none"
              >
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-bold text-sm text-foreground truncate">{ticket.subject}</span>
                    <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full border ${
                      ticket.status === 'open' ? 'bg-blue-500/10 border-blue-500/20 text-blue-500' :
                      ticket.status === 'replied' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
                      'bg-zinc-500/10 border-zinc-500/20 text-muted-foreground'
                    }`}>
                      {ticket.status === 'open' ? 'Açık' : ticket.status === 'replied' ? 'Yanıtlandı' : 'Kapatıldı'}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-0.5">
                    Açılış Tarihi: {formatDate(ticket.created_at)}
                  </span>
                </div>
                <div className="px-3 py-1.5 rounded-lg border border-border text-[10px] font-black tracking-wider text-muted-foreground hover:bg-muted transition-all select-none">
                  TALEP DETAYI
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Support Ticket Modal */}
        <AnimatePresence>
          {selectedTicket && (
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
                    <span className="text-[10px] text-muted-foreground mt-0.5">
                      Gönderen: @{profile.username} • {formatDate(selectedTicket.created_at)}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedTicket(null)}
                    className="px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground rounded-lg border border-border/80 transition-colors cursor-pointer select-none"
                  >
                    Kapat
                  </button>
                </div>

                {/* Modal Content */}
                <div className="p-6 space-y-4 max-h-[55vh] overflow-y-auto">
                  <div className="space-y-3">
                    <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase select-none">
                      Konuşma Geçmişi
                    </span>
                    <div className="space-y-4 pr-1">
                      {(() => {
                        const conversation = parseConversation(selectedTicket.message, selectedTicket.created_at)
                        if (selectedTicket.admin_reply) {
                          const replierLabel = selectedTicket.replied_by === 'ea58c495-0c6c-49a7-bfc6-30ae3ed253a9' ? 'Kurucu' : 'Yönetici'
                          conversation.push({
                            sender: replierLabel,
                            content: selectedTicket.admin_reply,
                            isAgent: true,
                            timestamp: selectedTicket.updated_at ? formatDate(selectedTicket.updated_at) : null
                          })
                        }

                        return conversation.map((msg, idx) => {
                          const isUser = !msg.isAgent

                          return (
                            <div key={idx} className="space-y-1">
                              <div className="flex items-center justify-between gap-1.5 select-none w-full">
                                <div className="flex items-center gap-1.5">
                                  <User size={11} className="text-muted-foreground" />
                                  <span className={cn(
                                    "text-[10px] font-bold tracking-wider uppercase",
                                    isUser ? "text-muted-foreground" : "text-amber-500"
                                  )}>
                                    {isUser ? `@${profile.username}` : msg.sender}
                                  </span>
                                  {!isUser && (
                                    <span className="px-1.5 py-0.2 text-[8px] font-black tracking-wider uppercase rounded-sm bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                      {msg.sender === 'Kurucu' ? 'Kurucu' : 'Yönetici'}
                                    </span>
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
                                  <div className="font-bold mb-1 text-foreground/85">
                                    Konu: {selectedTicket.subject}
                                  </div>
                                )}
                                {msg.content}
                              </div>
                            </div>
                          )
                        })
                      })()}
                    </div>
                  </div>
                </div>

                {/* Modal Actions */}
                <div className="p-6 border-t border-border/60 bg-muted/10 flex justify-end gap-2">
                  <Link
                    href={`/support?ticketId=${selectedTicket.id}`}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-primary-foreground transition-all cursor-pointer flex items-center gap-1.5 select-none"
                    style={{ background: 'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))' }}
                  >
                    <span>Detaylı İncele (Destek Sayfası)</span>
                    <ArrowUpRight size={13} />
                  </Link>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  if (tab === 'suggestions') {
    return (
      <div className="mt-2 flex flex-col gap-3">
        <h2 className="text-sm font-bold text-foreground mb-1 select-none">Öneriler</h2>
        {suggestions.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-8 text-center text-muted-foreground text-xs select-none">
            Bu kullanıcının henüz açtığı bir öneri bulunmamaktadır.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {suggestions.map((suggestion: any) => {
              const statusInfo = getStatusConfig(suggestion.status)

              return (
                <div
                  key={suggestion.id}
                  onClick={() => setSelectedSuggestion(suggestion)}
                  className="bg-card border border-border rounded-2xl p-5 hover:border-primary/45 hover:shadow-xs transition-all duration-200 flex items-center justify-between gap-4 cursor-pointer select-none"
                >
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-bold text-sm text-foreground truncate">{suggestion.title}</span>
                      <span className={cn("px-2 py-0.5 text-[9px] font-black rounded-full border tracking-wide uppercase", statusInfo.classes)}>
                        {statusInfo.label}
                      </span>
                      {suggestion.is_private && (
                        <span className="px-2 py-0.5 text-[9px] font-black rounded-full border bg-amber-500/10 border-amber-500/20 text-amber-500 flex items-center gap-1 select-none">
                          🔒 Özel
                        </span>
                      )}
                      {suggestion.is_anonymous && (
                        <span className="px-2 py-0.5 text-[9px] font-black rounded-full border bg-zinc-500/10 border-zinc-500/20 text-muted-foreground select-none">
                          👤 Anonim
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1 break-words">
                      {suggestion.description}
                    </p>
                    <span className="text-[10px] text-muted-foreground mt-1 select-none">
                      Tarih: {formatDate(suggestion.created_at)} • Toplam Oy: {suggestion.score}
                    </span>
                  </div>
                  <div className="px-3 py-1.5 rounded-lg border border-border text-[10px] font-black tracking-wider text-muted-foreground hover:bg-muted transition-all select-none">
                    ÖNERİ DETAYI
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Suggestion Detail Modal */}
        <AnimatePresence>
          {selectedSuggestion && (
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
                      Öneri Detayı
                    </h3>
                    <span className="text-[10px] text-muted-foreground mt-0.5">
                      Gönderen: {selectedSuggestion.is_anonymous ? 'Anonim' : `@${profile.username}`} • {formatDate(selectedSuggestion.created_at)}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedSuggestion(null)}
                    className="px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground rounded-lg border border-border/80 transition-colors cursor-pointer select-none"
                  >
                    Kapat
                  </button>
                </div>

                {/* Modal Content */}
                <div className="p-6 space-y-4 max-h-[55vh] overflow-y-auto">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase select-none">
                        Öneri Açıklaması
                      </span>
                      <span className={cn("px-2 py-0.5 text-[9px] font-black rounded-full border tracking-wide uppercase select-none", getStatusConfig(selectedSuggestion.status).classes)}>
                        {getStatusConfig(selectedSuggestion.status).label}
                      </span>
                      {selectedSuggestion.is_private && (
                        <span className="px-1.5 py-0.2 text-[8px] font-black rounded-full border bg-amber-500/10 border-amber-500/20 text-amber-500 select-none">
                          🔒 Özel
                        </span>
                      )}
                    </div>
                    <div className="p-4 rounded-2xl bg-muted/40 border border-border/80 text-xs leading-relaxed whitespace-pre-wrap">
                      <div className="font-bold text-foreground mb-1 text-sm">{selectedSuggestion.title}</div>
                      {selectedSuggestion.description}
                    </div>
                  </div>

                  {/* Suggestion Stats */}
                  <div className="flex items-center gap-4 text-xs font-semibold border-t border-b border-border/50 py-3 select-none">
                    <span className="flex items-center gap-1 text-primary">
                      <Heart size={14} className="fill-primary" />
                      <span>{selectedSuggestion.score} Puan (Oy)</span>
                    </span>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <MessageSquare size={14} />
                      <span>{selectedSuggestion.commentCount || 0} Yorum</span>
                    </span>
                  </div>

                  {/* Admin Notes History (if any) */}
                  {((selectedSuggestion.admin_notes && selectedSuggestion.admin_notes.length > 0) || selectedSuggestion.admin_note) && (
                    <div className="space-y-3">
                      <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase select-none">
                        Yönetici Notları ve Süreç
                      </span>
                      <div className="space-y-3 pr-1">
                        {selectedSuggestion.admin_notes && selectedSuggestion.admin_notes.length > 0 ? (
                          selectedSuggestion.admin_notes.map((note: any, idx: number) => (
                            <div key={idx} className="p-3 bg-accent/40 border border-border/60 rounded-xl text-xs leading-relaxed flex flex-col gap-1">
                              <div className="flex items-center justify-between select-none">
                                <span className="font-bold text-foreground">
                                  {note.admin_first_name} {note.admin_last_name} (@{note.admin_username})
                                </span>
                                <span className="text-[9px] text-muted-foreground">
                                  {formatDate(note.created_at)}
                                </span>
                              </div>
                              <p className="text-muted-foreground whitespace-pre-wrap">{note.note}</p>
                            </div>
                          ))
                        ) : (
                          // Fallback to legacy single note
                          <div className="p-3 bg-accent/40 border border-border/60 rounded-xl text-xs leading-relaxed flex flex-col gap-1">
                            <div className="flex items-center justify-between select-none">
                              <span className="font-bold text-foreground">Yönetici Yanıtı</span>
                              <span className="text-[9px] text-muted-foreground">
                                {formatDate(selectedSuggestion.updated_at || selectedSuggestion.created_at)}
                              </span>
                            </div>
                            <p className="text-muted-foreground whitespace-pre-wrap">{selectedSuggestion.admin_note}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Modal Actions */}
                <div className="p-6 border-t border-border/60 bg-muted/10 flex justify-end gap-2">
                  <Link
                    href={`/suggestions?suggestionId=${selectedSuggestion.id}`}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-primary-foreground transition-all cursor-pointer flex items-center gap-1.5 select-none"
                    style={{ background: 'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))' }}
                  >
                    <span>Detaylı İncele (Öneri Panosu)</span>
                    <ArrowUpRight size={13} />
                  </Link>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  return null
}
