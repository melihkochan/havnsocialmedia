'use client'

import { useState, useTransition, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lightbulb, Plus, X, Loader2, Check, AlertCircle, Clock, ChevronUp, ShieldAlert } from 'lucide-react'
import { createSuggestion, voteSuggestion, updateSuggestionStatus, deleteSuggestion } from '@/lib/actions/suggestions'
import { ConfirmDialog } from '@/components/havn/ConfirmDialog'
import { InteractiveAvatar } from '@/components/havn/InteractiveAvatar'
import { ProfileName } from '@/components/havn/ProfileName'
import { getRankInfo } from '@/lib/gamification'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Suggestion {
  id: string
  title: string
  description: string
  user_id: string
  status: 'open' | 'in_progress' | 'completed' | 'closed'
  admin_note: string | null
  admin_notes?: Array<{
    admin_id: string
    admin_username: string
    admin_avatar_url: string | null
    admin_first_name: string | null
    admin_last_name: string | null
    note: string
    status: string
    created_at: string
  }> | null
  created_at: string
  updated_at: string
  score: number
  userVote: number
  voteCount: number
  profiles: {
    username: string
    avatar_url: string | null
    first_name: string | null
    last_name: string | null
    xp?: number
    is_verified?: boolean
    is_gold?: boolean
  } | null
  adminProfile?: {
    id: string
    username: string
    avatar_url: string | null
    first_name: string | null
    last_name: string | null
    is_verified?: boolean
    is_gold?: boolean
  } | null
  is_anonymous?: boolean
  is_private?: boolean
}

interface SuggestionsClientProps {
  profile: any
  isAdmin: boolean
  initialSuggestions: any[]
  focusedSuggestionId?: string
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

export function SuggestionsClient({ profile, isAdmin, initialSuggestions, focusedSuggestionId }: SuggestionsClientProps) {
  const router = useRouter()
  const [items, setItems] = useState<Suggestion[]>(initialSuggestions)
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'in_progress' | 'completed' | 'closed'>('all')
  const [sortBy, setSortBy] = useState<'votes' | 'new'>('votes')
  const [showMySuggestions, setShowMySuggestions] = useState(false)

  const [showAddModal, setShowAddModal] = useState(false)
  const [addTitle, setAddTitle] = useState('')
  const [addDescription, setAddDescription] = useState('')
  const [addIsAnonymous, setAddIsAnonymous] = useState(false)
  const [addIsPrivate, setAddIsPrivate] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [addPending, startAddTransition] = useTransition()

  const [moderatingItem, setModeratingItem] = useState<Suggestion | null>(null)
  const [modStatus, setModStatus] = useState<'open' | 'in_progress' | 'completed' | 'closed'>('open')
  const [modAdminNote, setModAdminNote] = useState('')
  const [modError, setModError] = useState<string | null>(null)
  const [modPending, startModTransition] = useTransition()

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deletePending, startDeleteTransition] = useTransition()

  // Sync moderating fields when moderatingItem changes
  useEffect(() => {
    if (moderatingItem) {
      setModStatus(moderatingItem.status)
      setModAdminNote('') // Start with empty box for fresh note
    } else {
      setModStatus('open')
      setModAdminNote('')
    }
  }, [moderatingItem])

  const handleDeleteConfirm = () => {
    if (!confirmDeleteId) return
    setDeleteError(null)
    startDeleteTransition(async () => {
      const res = await deleteSuggestion(confirmDeleteId)
      if (res.error) {
        setDeleteError(res.error)
      } else {
        router.refresh()
        setItems(prev => prev.filter(i => i.id !== confirmDeleteId))
        setConfirmDeleteId(null)
      }
    })
  }

  // Re-sync local state when initialSuggestions change from server
  useEffect(() => {
    setItems(initialSuggestions)
  }, [initialSuggestions])

  // Scroll to focused suggestion if present
  useEffect(() => {
    if (focusedSuggestionId) {
      const timer = setTimeout(() => {
        const element = document.getElementById(`suggestion-${focusedSuggestionId}`)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [focusedSuggestionId])

  // Filter and sort items locally
  const filteredAndSortedItems = items
    .filter(item => {
      if (focusedSuggestionId && item.id === focusedSuggestionId) return true
      if (showMySuggestions && item.user_id !== profile.id) return false
      if (statusFilter === 'all') return true
      return item.status === statusFilter
    })
    .sort((a, b) => {
      if (focusedSuggestionId) {
        if (a.id === focusedSuggestionId) return -1
        if (b.id === focusedSuggestionId) return 1
      }
      if (sortBy === 'new') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      } else {
        if (b.score !== a.score) {
          return b.score - a.score
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })

  const handleVote = async (itemId: string, direction: 'up' | 'down') => {
    const item = items.find(i => i.id === itemId)
    if (!item) return
    if (item.status === 'closed') return // Block voting on closed suggestions

    const currentVote = item.userVote
    let targetVote = 0

    if (direction === 'up') {
      targetVote = currentVote === 1 ? 0 : 1
    } else {
      targetVote = currentVote === -1 ? 0 : -1
    }

    // Optimistic Update
    setItems(prev =>
      prev.map(i => {
        if (i.id === itemId) {
          const voteDiff = targetVote - currentVote
          return {
            ...i,
            userVote: targetVote,
            score: i.score + voteDiff
          }
        }
        return i
      })
    )

    const res = await voteSuggestion(itemId, targetVote)
    if (res.error) {
      // Revert optimistic update
      setItems(prev =>
        prev.map(i => {
          if (i.id === itemId) {
            const voteDiff = currentVote - targetVote
            return {
              ...i,
              userVote: currentVote,
              score: i.score + voteDiff
            }
          }
          return i
        })
      )
      alert(res.error)
    }
  }

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setAddError(null)

    if (!addTitle.trim() || !addDescription.trim()) {
      setAddError('Lütfen tüm alanları doldurun.')
      return
    }

    startAddTransition(async () => {
      const res = await createSuggestion(addTitle, addDescription, addIsAnonymous, addIsPrivate)
      if (res.error) {
        setAddError(res.error)
      } else {
        setAddTitle('')
        setAddDescription('')
        setAddIsAnonymous(false)
        setAddIsPrivate(false)
        setShowAddModal(false)
        router.refresh()
        if (res.suggestion) {
          const newSuggestion: Suggestion = {
            ...res.suggestion,
            score: 0,
            userVote: 0,
            voteCount: 0,
            profiles: res.suggestion.is_anonymous ? {
              username: 'gizli',
              first_name: 'Gizli',
              last_name: 'Kullanıcı',
              avatar_url: null,
              xp: 0
            } : {
              username: profile.username,
              avatar_url: profile.avatar_url,
              first_name: profile.first_name,
              last_name: profile.last_name,
              xp: profile.xp,
              is_verified: profile.is_verified,
              is_gold: profile.is_gold
            }
          }
          setItems(prev => [newSuggestion, ...prev])
        }
      }
    })
  }

  const handleModerationSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!moderatingItem) return
    setModError(null)

    startModTransition(async () => {
      const res = await updateSuggestionStatus(moderatingItem.id, modStatus, modAdminNote)
      if (res.error) {
        setModError(res.error)
      } else {
        router.refresh()
        setItems(prev =>
          prev.map(i => {
            if (i.id === moderatingItem.id) {
              let updatedNotes = i.admin_notes ? [...i.admin_notes] : []
              if (i.admin_note && updatedNotes.length === 0) {
                updatedNotes.push({
                  admin_id: profile?.id || 'admin',
                  admin_username: 'melih',
                  admin_avatar_url: null,
                  admin_first_name: 'Melih',
                  admin_last_name: 'KOÇHAN',
                  note: i.admin_note,
                  status: i.status || 'open',
                  created_at: i.updated_at || i.created_at
                })
              }
              if (modAdminNote.trim()) {
                updatedNotes.push({
                  admin_id: profile?.id || 'admin',
                  admin_username: profile?.username || 'admin',
                  admin_avatar_url: profile?.avatar_url || null,
                  admin_first_name: profile?.first_name || 'Yönetici',
                  admin_last_name: profile?.last_name || '',
                  note: modAdminNote.trim(),
                  status: modStatus,
                  created_at: new Date().toISOString()
                })
              }
              return {
                ...i,
                status: modStatus,
                admin_note: modAdminNote.trim() || i.admin_note,
                admin_notes: updatedNotes,
                updated_at: new Date().toISOString()
              }
            }
            return i
          })
        )
        setModeratingItem(null)
      }
    })
  }

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

  return (
    <div className="flex flex-col gap-6 w-full px-1 max-w-4xl mx-auto">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))',
              color: 'var(--primary-foreground)',
            }}
          >
            <Lightbulb size={20} />
          </div>
          <div>
            <h1 className="text-lg font-black text-foreground">Öneri ve Geri Bildirim Forumu</h1>
            <p className="text-xs text-muted-foreground">
              Havn'ı birlikte geliştirelim. Yeni fikirlerinizi paylaşın veya paylaşılan fikirleri oylayın.
            </p>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md text-primary-foreground hover:shadow-lg"
          style={{
            background: 'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))'
          }}
        >
          <Plus size={15} />
          <span>Yeni Öneri Gönder</span>
        </motion.button>
      </div>

      {/* Filters and Sorting control bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card/30 border border-border/60 p-2 rounded-2xl">
        {/* Status filters */}
        <div className="flex flex-wrap gap-1 p-0.5 bg-background/50 rounded-xl w-fit border border-border/40">
          {(['all', 'open', 'in_progress', 'completed', 'closed'] as const).map(tab => {
            const config = getStatusConfig(tab)
            return (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={cn(
                  "px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer",
                  statusFilter === tab
                    ? "bg-background text-foreground shadow-sm border border-border/20"
                    : "text-muted-foreground hover:text-foreground border border-transparent"
                )}
              >
                {tab === 'all' ? 'Hepsi' : config.label}
              </button>
            )
          })}
        </div>

        {/* Right side: Own filter & Sort selector */}
        <div className="flex items-center gap-2 ml-auto sm:ml-0">
          <button
            onClick={() => setShowMySuggestions(prev => !prev)}
            className={cn(
              "px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer border select-none",
              showMySuggestions
                ? "bg-primary/10 border-primary/25 text-primary shadow-xs"
                : "bg-background/50 border-border/40 text-muted-foreground hover:text-foreground"
            )}
          >
            Önerilerim
          </button>

          <div className="flex items-center gap-1 p-0.5 bg-background/50 rounded-xl w-fit border border-border/40">
            <button
              onClick={() => setSortBy('votes')}
              className={cn(
                "px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer select-none",
                sortBy === 'votes'
                  ? "bg-background text-foreground shadow-sm border border-border/20"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Popüler
            </button>
            <button
              onClick={() => setSortBy('new')}
              className={cn(
                "px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer select-none",
                sortBy === 'new'
                  ? "bg-background text-foreground shadow-sm border border-border/20"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Yeni
            </button>
          </div>
        </div>
      </div>

      {/* Suggestion list */}
      <div className="space-y-4">
        {filteredAndSortedItems.length === 0 ? (
          <div className="bg-card/40 border border-border rounded-2xl p-12 text-center text-muted-foreground text-sm flex flex-col items-center justify-center gap-2 select-none">
            <Lightbulb size={24} className="text-muted-foreground/50 animate-pulse" />
            <span>Seçilen filtrelere uygun öneri bulunamadı. Havn'ı geliştirmek için ilk adımı sen at!</span>
          </div>
        ) : (
          filteredAndSortedItems.map(item => {
            const isFocused = item.id === focusedSuggestionId
            const statusInfo = getStatusConfig(item.status)
            const authorXp = item.profiles?.xp ?? 0
            const authorRank = getRankInfo(authorXp)
            const initials = item.profiles?.username ? item.profiles.username.slice(0, 2).toUpperCase() : 'H'

            return (
              <motion.div
                layout
                key={item.id}
                id={`suggestion-${item.id}`}
                initial={isFocused ? { scale: 0.98, opacity: 0.85 } : undefined}
                animate={isFocused ? { scale: 1, opacity: 1 } : undefined}
                transition={isFocused ? { type: "spring", stiffness: 200, damping: 15 } : undefined}
                className={cn(
                  "bg-card border rounded-2xl p-5 flex gap-4 transition-all duration-300",
                  isFocused 
                    ? "border-primary/60 ring-2 ring-primary/15 shadow-[0_0_30px_color-mix(in_oklch,var(--primary)_22%,transparent)] bg-gradient-to-br from-card to-primary/[0.03]" 
                    : "border-border/80 hover:border-border/120"
                )}
              >
                {/* Vote panel */}
                <div className="flex flex-col items-center gap-1 select-none">
                  <button
                    onClick={() => item.status !== 'closed' && handleVote(item.id, 'up')}
                    disabled={item.status === 'closed'}
                    className={cn(
                      "p-1.5 rounded-lg border transition-all select-none",
                      item.status === 'closed'
                        ? "opacity-35 cursor-not-allowed border-transparent text-muted-foreground/60"
                        : item.userVote === 1
                          ? "bg-primary/10 border-primary/20 text-primary cursor-pointer"
                          : "hover:bg-accent border-transparent text-muted-foreground hover:text-foreground cursor-pointer"
                    )}
                  >
                    <ChevronUp size={18} className="stroke-[3]" />
                  </button>
                  <span className={cn(
                    "text-xs font-black min-w-[20px] text-center",
                    item.score > 0 ? "text-primary font-black" : item.score < 0 ? "text-rose-500" : "text-muted-foreground"
                  )}>
                    {item.score}
                  </span>
                </div>

                {/* Main Content */}
                <div className="flex-1 min-w-0 flex flex-col gap-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-sm text-foreground break-words">{item.title}</h3>
                        <span className={cn("px-2 py-0.5 text-[9px] font-black rounded-full border tracking-wide uppercase", statusInfo.classes)}>
                          {statusInfo.label}
                        </span>
                        {item.is_private && (
                          <span className="px-2 py-0.5 text-[9px] font-black rounded-full border bg-amber-500/10 border-amber-500/20 text-amber-500 flex items-center gap-1 select-none">
                            🔒 Özel
                          </span>
                        )}
                        {item.is_anonymous && isAdmin && (
                          <span className="px-2 py-0.5 text-[9px] font-black rounded-full border bg-zinc-500/10 border-zinc-500/20 text-muted-foreground select-none">
                            👤 Anonim
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap mt-0.5 break-words">
                        {item.description}
                      </p>
                    </div>

                    {(isAdmin || item.user_id === profile.id) && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setConfirmDeleteId(item.id)}
                          className="px-2.5 py-1.5 rounded-lg border border-rose-500/35 hover:bg-rose-500/10 text-[10px] font-bold text-rose-500 transition-all cursor-pointer flex-shrink-0"
                        >
                          Sil
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => {
                              setModeratingItem(item)
                              setModStatus(item.status)
                              setModAdminNote(item.admin_note || '')
                              setModError(null)
                            }}
                            className="px-2.5 py-1.5 rounded-lg border border-border hover:bg-accent text-[10px] font-bold text-foreground transition-all cursor-pointer flex-shrink-0"
                          >
                            Yönet
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Admin Explanation Note History */}
                  {((item.admin_notes && item.admin_notes.length > 0) || item.admin_note) && (
                    <div className="flex flex-col gap-2.5">
                      {item.admin_notes && item.admin_notes.length > 0 ? (
                        item.admin_notes.map((note, index) => (
                          <div key={index} className="p-3.5 rounded-xl bg-accent/40 border border-border/60 text-xs leading-relaxed flex flex-col gap-2">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 border border-border/40 bg-background">
                                  {note.admin_avatar_url ? (
                                    <img
                                      src={note.admin_avatar_url}
                                      alt={note.admin_username}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-primary flex items-center justify-center text-[9px] font-bold text-white">
                                      {note.admin_username?.slice(0, 2).toUpperCase() || 'A'}
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 min-w-0">
                                  <ProfileName
                                    profile={{
                                      username: note.admin_username,
                                      first_name: note.admin_first_name,
                                      last_name: note.admin_last_name
                                    }}
                                    layout="inline"
                                    showHandle={false}
                                    nameClassName="text-[11px] font-bold text-foreground"
                                  />
                                  <span className="text-[10px] text-muted-foreground ml-1">yanıtladı:</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 text-[9px] text-muted-foreground ml-auto select-none">
                                <span className={cn(
                                  "px-1.5 py-0.5 rounded text-[8px] font-black border uppercase tracking-wide",
                                  getStatusConfig(note.status).classes
                                )}>
                                  {getStatusConfig(note.status).label}
                                </span>
                                <span>{formatDate(note.created_at)}</span>
                              </div>
                            </div>
                            <p className="text-muted-foreground whitespace-pre-wrap break-words pl-8 leading-relaxed">{note.note}</p>
                          </div>
                        ))
                      ) : (
                        // Fallback to legacy single note
                        <div className="p-3.5 rounded-xl bg-accent/40 border border-border/60 text-xs leading-relaxed flex flex-col gap-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 border border-border/40 bg-background">
                              {item.adminProfile?.avatar_url ? (
                                <img
                                  src={item.adminProfile.avatar_url}
                                  alt={item.adminProfile.username}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-primary flex items-center justify-center text-[9px] font-bold text-white">
                                  {item.adminProfile?.username?.slice(0, 2).toUpperCase() || 'A'}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-1 min-w-0">
                              <ProfileName
                                profile={item.adminProfile || { username: 'admin', first_name: 'Yönetici' }}
                                layout="inline"
                                showHandle={false}
                                nameClassName="text-[11px] font-bold text-foreground"
                              />
                              <span className="text-[10px] text-muted-foreground ml-1">yanıtladı:</span>
                            </div>
                          </div>
                          <p className="text-muted-foreground whitespace-pre-wrap break-words pl-8">{item.admin_note}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Footer - user info and date */}
                  <div className="flex items-center justify-between border-t border-border/40 pt-2.5 mt-1 flex-wrap gap-2 text-[10px]">
                    {item.profiles?.username && item.profiles.username !== 'gizli' ? (
                      <Link
                        href={`/profile/${item.profiles.username}`}
                        className="flex items-center gap-2.5 min-w-0 hover:opacity-85 transition-opacity cursor-pointer group"
                      >
                        <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 border border-border/60 bg-accent/20">
                          {item.profiles?.avatar_url ? (
                            <img
                              src={item.profiles.avatar_url}
                              alt={item.profiles.username}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div
                              className="w-full h-full flex items-center justify-center font-black text-[10px]"
                              style={{
                                background: `linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))`,
                                color: 'var(--primary-foreground)',
                              }}
                            >
                              {initials}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 min-w-0">
                          <span className="text-[10px] text-muted-foreground flex-shrink-0 group-hover:text-foreground transition-colors">başlatan:</span>
                          <ProfileName 
                            profile={item.profiles} 
                            layout="inline" 
                            showHandle={true} 
                            nameClassName="text-xs font-semibold"
                          />
                        </div>
                      </Link>
                    ) : (
                      <div className="flex items-center gap-2.5 min-w-0 select-none">
                        <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 border border-border/60 bg-accent/20">
                          <div
                            className="w-full h-full flex items-center justify-center font-black text-[10px]"
                            style={{
                              background: `linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))`,
                              color: 'var(--primary-foreground)',
                            }}
                          >
                            {initials}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 min-w-0">
                          <span className="text-[10px] text-muted-foreground flex-shrink-0">başlatan:</span>
                          <span className="text-xs font-semibold text-foreground">Gizli Kullanıcı</span>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock size={11} />
                      <span>{formatDate(item.created_at)}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })
        )}
      </div>

      {/* Add suggestion Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !addPending && setShowAddModal(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden z-10"
            >
              <div className="p-5 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Lightbulb size={16} />
                  </div>
                  <span className="font-black text-sm text-foreground">Yeni Öneri Gönder</span>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  disabled={addPending}
                  className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleAddSubmit} className="p-5 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground" htmlFor="addTitle">Öneri Başlığı</label>
                  <input
                    id="addTitle"
                    type="text"
                    required
                    value={addTitle}
                    onChange={e => setAddTitle(e.target.value)}
                    placeholder="Kısaca ne öneriyorsunuz? Örn: Karanlık mod iyileştirmesi"
                    disabled={addPending}
                    maxLength={100}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-60"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground" htmlFor="addDesc">Öneri Açıklaması</label>
                  <textarea
                    id="addDesc"
                    required
                    rows={5}
                    value={addDescription}
                    onChange={e => setAddDescription(e.target.value)}
                    placeholder="Önerinizi detaylandırın. Hangi sorunu çözüyor? Havn'a ne katacak?"
                    disabled={addPending}
                    maxLength={2000}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none disabled:opacity-60"
                  />
                </div>

                {/* Privacy and Anonymity Options */}
                <div className="flex flex-col gap-2.5 bg-accent/10 border border-border/40 p-3 rounded-xl">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={addIsAnonymous}
                      onChange={e => setAddIsAnonymous(e.target.checked)}
                      disabled={addPending}
                      className="w-4.5 h-4.5 rounded border-border text-primary focus:ring-primary/20 accent-primary bg-background cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-foreground">İsmimi Gizli Tut (Anonim Öneri Gönder)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={addIsPrivate}
                      onChange={e => setAddIsPrivate(e.target.checked)}
                      disabled={addPending}
                      className="w-4.5 h-4.5 rounded border-border text-primary focus:ring-primary/20 accent-primary bg-background cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-foreground">Öneriyi Gizli Tut (Sadece Yöneticiler Görsün)</span>
                  </label>
                </div>

                {addError && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold">
                    <AlertCircle size={14} />
                    <span>{addError}</span>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    disabled={addPending}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold border border-border text-foreground hover:bg-accent transition-all cursor-pointer disabled:opacity-50"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    disabled={addPending}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold text-primary-foreground transition-all cursor-pointer disabled:opacity-75"
                    style={{
                      background: 'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))'
                    }}
                  >
                    {addPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    <span>Gönder</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Moderation / Admin edit status Modal */}
      <AnimatePresence>
        {moderatingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !modPending && setModeratingItem(null)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden z-10"
            >
              <div className="p-5 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <ShieldAlert size={16} />
                  </div>
                  <span className="font-black text-sm text-foreground">Öneri Durumunu Yönet</span>
                </div>
                <button
                  onClick={() => setModeratingItem(null)}
                  disabled={modPending}
                  className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleModerationSubmit} className="p-5 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Durum Seçin</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['open', 'in_progress', 'completed', 'closed'] as const).map(status => {
                      const cfg = getStatusConfig(status)
                      const isSelected = modStatus === status

                      return (
                        <button
                          key={status}
                          type="button"
                          onClick={() => setModStatus(status)}
                          className={cn(
                            "py-2.5 px-3 rounded-xl border text-[11px] font-bold text-center transition-all cursor-pointer select-none",
                            isSelected
                              ? "bg-primary/10 border-primary/30 text-primary shadow-sm"
                              : "bg-background hover:bg-accent border-border/80 text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {cfg.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Previous replies history in modal */}
                {((moderatingItem.admin_notes && moderatingItem.admin_notes.length > 0) || moderatingItem.admin_note) && (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1 bg-accent/10 border border-border/40 p-3 rounded-xl">
                    <label className="text-xs font-bold text-muted-foreground block mb-1.5 select-none">Önceki Yanıtlar</label>
                    <div className="space-y-2">
                      {moderatingItem.admin_notes && moderatingItem.admin_notes.length > 0 ? (
                        moderatingItem.admin_notes.map((note, index) => (
                          <div key={index} className="p-2.5 rounded-lg bg-background border border-border/60 text-xs">
                            <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                              <span className="font-semibold text-foreground text-[10px]">
                                {note.admin_first_name} {note.admin_last_name}
                              </span>
                              <div className="flex items-center gap-1.5 text-[8px] text-muted-foreground select-none">
                                <span className={cn(
                                  "px-1 py-0.2 rounded border uppercase font-black text-[7px]",
                                  getStatusConfig(note.status).classes
                                )}>
                                  {getStatusConfig(note.status).label}
                                </span>
                                <span>{formatDate(note.created_at)}</span>
                              </div>
                            </div>
                            <p className="text-muted-foreground text-[11px] whitespace-pre-wrap break-words leading-relaxed">{note.note}</p>
                          </div>
                        ))
                      ) : (
                        // Fallback to legacy single note
                        <div className="p-2.5 rounded-lg bg-background border border-border/60 text-xs">
                          <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                            <span className="font-semibold text-foreground text-[10px]">
                              {moderatingItem.adminProfile?.first_name || 'Yönetici'} {moderatingItem.adminProfile?.last_name || ''}
                            </span>
                            <div className="flex items-center gap-1.5 text-[8px] text-muted-foreground select-none">
                              <span className={cn(
                                "px-1 py-0.2 rounded border uppercase font-black text-[7px]",
                                getStatusConfig(moderatingItem.status).classes
                              )}>
                                {getStatusConfig(moderatingItem.status).label}
                              </span>
                              <span>{formatDate(moderatingItem.updated_at || moderatingItem.created_at)}</span>
                            </div>
                          </div>
                          <p className="text-muted-foreground text-[11px] whitespace-pre-wrap break-words leading-relaxed">{moderatingItem.admin_note}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
 
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground" htmlFor="adminNote">Yeni Yanıt (Açıklama)</label>
                  <textarea
                    id="adminNote"
                    rows={3}
                    value={modAdminNote}
                    onChange={e => setModAdminNote(e.target.value)}
                    placeholder="Bu durum değişikliği hakkında kısa bir açıklama yazın..."
                    disabled={modPending}
                    maxLength={500}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none disabled:opacity-60"
                  />
                </div>

                {modError && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold">
                    <AlertCircle size={14} />
                    <span>{modError}</span>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setModeratingItem(null)}
                    disabled={modPending}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold border border-border text-foreground hover:bg-accent transition-all cursor-pointer disabled:opacity-50"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    disabled={modPending}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold text-primary-foreground transition-all cursor-pointer disabled:opacity-75"
                    style={{
                      background: 'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))'
                    }}
                  >
                    {modPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    <span>Güncelle</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirm deletion dialog */}
      <ConfirmDialog
        open={confirmDeleteId !== null}
        onClose={() => {
          if (!deletePending) {
            setConfirmDeleteId(null)
            setDeleteError(null)
          }
        }}
        onConfirm={handleDeleteConfirm}
        title="Öneriyi Sil"
        description="Bu öneriyi kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz."
        confirmLabel="Kalıcı Olarak Sil"
        cancelLabel="Vazgeç"
        pending={deletePending}
        error={deleteError}
        variant="destructive"
      />
    </div>
  )
}
