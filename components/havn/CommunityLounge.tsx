'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Loader2, Sparkles, User, Palette } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { addLoungeNote, updateLoungeNotePosition, deleteLoungeNote } from '@/lib/actions/communities-premium'
import { cn } from '@/lib/utils'

interface Note {
  id: string
  community_id: string
  user_id: string
  content: string
  color: string
  x_pos: number
  y_pos: number
  created_at: string
  profiles?: {
    username: string
    avatar_url: string | null
  } | null
}

interface CommunityLoungeProps {
  communityId: string
  currentUser: {
    id: string
    username: string
    avatar_url: string | null
  } | null
  isMember: boolean
  isAdmin: boolean
}

const NOTE_COLORS = [
  { name: 'yellow', bg: 'bg-amber-100 dark:bg-amber-950/40 border-amber-300 dark:border-amber-900/50 text-amber-900 dark:text-amber-200', dot: 'bg-amber-400' },
  { name: 'blue', bg: 'bg-sky-100 dark:bg-sky-950/40 border-sky-300 dark:border-sky-900/50 text-sky-900 dark:text-sky-200', dot: 'bg-sky-400' },
  { name: 'pink', bg: 'bg-rose-100 dark:bg-rose-950/40 border-rose-300 dark:border-rose-900/50 text-rose-900 dark:text-rose-200', dot: 'bg-rose-400' },
  { name: 'green', bg: 'bg-emerald-100 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-900/50 text-emerald-900 dark:text-emerald-200', dot: 'bg-emerald-400' },
  { name: 'orange', bg: 'bg-orange-100 dark:bg-orange-950/40 border-orange-300 dark:border-orange-900/50 text-orange-900 dark:text-orange-200', dot: 'bg-orange-400' }
]

export function CommunityLounge({ communityId, currentUser, isMember, isAdmin }: CommunityLoungeProps) {
  const [notes, setNotes] = useState<Note[]>([])
  const [content, setContent] = useState('')
  const [color, setColor] = useState('yellow')
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const canvasRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Fetch initial notes
  useEffect(() => {
    async function fetchNotes() {
      try {
        const { data, error } = await supabase
          .from('community_lounge_notes')
          .select('*, profiles:profiles(username, avatar_url)')
          .eq('community_id', communityId)
          .order('created_at', { ascending: true })

        if (!error && data) {
          setNotes(data as any[])
        }
      } catch (err) {
        console.error('Failed to fetch notes:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchNotes()

    // Subscribe to Realtime changes
    const channelToken = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    const channel = supabase.channel(`lounge_notes_${communityId}_${channelToken}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'community_lounge_notes',
          filter: `community_id=eq.${communityId}`
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            // Fetch profile for newly inserted note
            const { data: profile } = await supabase
              .from('profiles')
              .select('username, avatar_url')
              .eq('id', payload.new.user_id)
              .single()

            const newNote = {
              ...payload.new,
              profiles: profile
            } as Note

            setNotes(prev => {
              if (prev.some(n => n.id === newNote.id)) return prev
              return [...prev, newNote]
            })
          } else if (payload.eventType === 'UPDATE') {
            setNotes(prev => prev.map(n => {
              if (n.id === payload.new.id) {
                return { ...n, ...payload.new }
              }
              return n
            }))
          } else if (payload.eventType === 'DELETE') {
            setNotes(prev => prev.filter(n => n.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [communityId])

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return

    startTransition(async () => {
      const res = await addLoungeNote(communityId, content.trim(), color)
      if (!res.error) {
        setContent('')
      }
    })
  }

  const handleDragEnd = async (noteId: string, info: any) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()

    // Calculate position percentage relative to canvas container size
    const x = Math.min(Math.max(Math.round(((info.point.x - rect.left) / rect.width) * 100), 0), 80)
    const y = Math.min(Math.max(Math.round(((info.point.y - rect.top) / rect.height) * 100), 0), 82)

    // Update local state instantly for responsiveness
    setNotes(prev => prev.map(n => {
      if (n.id === noteId) {
        return { ...n, x_pos: x, y_pos: y }
      }
      return n
    }))

    // Save to database
    await updateLoungeNotePosition(noteId, x, y)
  }

  const handleDelete = async (noteId: string) => {
    // Update local state instantly
    setNotes(prev => prev.filter(n => n.id !== noteId))
    await deleteLoungeNote(noteId)
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Introduction Header */}
      <div className="flex items-center justify-between border-b border-border/40 pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <Palette size={16} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">Canlı Etkileşim Panosu</h2>
            <p className="text-[10px] text-muted-foreground">Fikirlerinizi yapıştırın ve sürükleyerek düzenleyin. Her şey gerçek zamanlı güncellenir!</p>
          </div>
        </div>
        {isMember && currentUser && (
          <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest bg-emerald-500/5 px-2 py-0.5 rounded-full border border-emerald-500/10 flex items-center gap-1">
            <span className="w-1 h-1 bg-emerald-500 rounded-full animate-ping" />
            Canlı Bağlantı Aktif
          </span>
        )}
      </div>

      {/* Note submission bar */}
      {isMember && currentUser ? (
        <form onSubmit={handleAddNote} className="flex gap-2 bg-card border border-border p-2.5 rounded-2xl shadow-sm flex-wrap sm:flex-nowrap items-center">
          <input
            type="text"
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Panoya bir fikir yazın... (+5 XP)"
            maxLength={140}
            className="flex-1 min-w-[200px] bg-background border-0 outline-none text-xs text-foreground placeholder:text-muted-foreground px-3 py-2 rounded-xl focus:ring-1 focus:ring-primary/20 transition-all"
          />

          {/* Color Selector */}
          <div className="flex items-center gap-1.5 px-2 flex-shrink-0">
            {NOTE_COLORS.map(c => (
              <button
                key={c.name}
                type="button"
                onClick={() => setColor(c.name)}
                className={cn(
                  "w-5 h-5 rounded-full cursor-pointer flex items-center justify-center border border-border/40 transition-all hover:scale-110",
                  color === c.name ? "ring-2 ring-primary scale-110" : ""
                )}
                style={{
                  background: c.name === 'yellow' ? '#fef08a' :
                              c.name === 'blue' ? '#bae6fd' :
                              c.name === 'pink' ? '#fecdd3' :
                              c.name === 'green' ? '#a7f3d0' : '#fed7aa'
                }}
              />
            ))}
          </div>

          <motion.button
            type="submit"
            disabled={isPending || !content.trim()}
            whileTap={{ scale: 0.96 }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm flex-shrink-0 cursor-pointer disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))' }}
          >
            {isPending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
            Ekle
          </motion.button>
        </form>
      ) : (
        <div className="bg-muted/30 border border-border/50 rounded-2xl p-3 text-center text-xs text-muted-foreground font-medium">
          Panoya not bırakmak ve düzenlemek için bu topluluğa üye olmalısınız.
        </div>
      )}

      {/* Main Canvas Workspace */}
      <div
        ref={canvasRef}
        className="relative w-full h-[500px] border border-border/80 rounded-3xl bg-accent/5 dark:bg-card/20 overflow-hidden shadow-inner flex items-center justify-center select-none"
        style={{
          backgroundImage: 'radial-gradient(var(--border) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      >
        {loading ? (
          <div className="flex flex-col items-center gap-2 text-muted-foreground animate-pulse">
            <Loader2 size={24} className="animate-spin text-primary" />
            <span className="text-xs font-bold">Lobi yükleniyor...</span>
          </div>
        ) : notes.length === 0 ? (
          <div className="flex flex-col items-center gap-2 max-w-sm text-center text-muted-foreground p-6">
            <Sparkles size={32} className="opacity-30" />
            <h3 className="text-xs font-bold text-foreground">Burası Çok Boş Görünüyor</h3>
            <p className="text-[10px] leading-relaxed">
              Topluluk panosu henüz temiz. Yukarıdaki kutudan bir fikir yazarak ilk yapışkan notu yapıştırın!
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {notes.map(note => {
              const colorInfo = NOTE_COLORS.find(c => c.name === note.color) || NOTE_COLORS[0]
              const isOwner = currentUser?.id === note.user_id
              const canDelete = isOwner || isAdmin

              return (
                <motion.div
                  key={note.id}
                  drag={isMember && currentUser ? true : false}
                  dragConstraints={canvasRef}
                  dragElastic={0.05}
                  dragMomentum={false}
                  onDragEnd={(e, info) => handleDragEnd(note.id, info)}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  whileDrag={{ scale: 1.05, rotate: 2, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)' }}
                  className={cn(
                    "absolute w-36 sm:w-40 p-3 rounded-2xl border shadow-md flex flex-col gap-2 select-none",
                    isMember && currentUser ? "cursor-grab active:cursor-grabbing" : "cursor-default",
                    colorInfo.bg
                  )}
                  style={{
                    left: `${note.x_pos}%`,
                    top: `${note.y_pos}%`,
                  }}
                >
                  {/* Note header: creator details & delete button */}
                  <div className="flex items-center justify-between border-b border-black/5 pb-1">
                    <span className="text-[8px] font-bold opacity-60 truncate">
                      @{note.profiles?.username || 'anonim'}
                    </span>
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(note.id)}
                        className="p-0.5 rounded hover:bg-black/5 text-muted-foreground hover:text-destructive cursor-pointer transition-colors"
                        title="Notu Sil"
                      >
                        <Trash2 size={10} />
                      </button>
                    )}
                  </div>

                  {/* Note Content */}
                  <p className="text-[11px] leading-normal font-medium tracking-tight whitespace-pre-wrap break-words min-h-[48px] select-none pointer-events-none">
                    {note.content}
                  </p>

                  {/* Note bottom indicator */}
                  <div className="flex items-center justify-between text-[7px] font-black opacity-40 uppercase tracking-wider select-none mt-auto pointer-events-none">
                    <div className="flex items-center gap-1">
                      <span className={cn("w-1 h-1 rounded-full", colorInfo.dot)} />
                      <span>{note.color}</span>
                    </div>
                    <span>{new Date(note.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
