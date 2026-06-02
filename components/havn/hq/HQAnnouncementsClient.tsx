'use client'

import { useState, useTransition, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Megaphone, Trash2, Loader2, Sparkles, Volume2, Info, AlertTriangle, Send } from 'lucide-react'
import { createAnnouncement, deleteAnnouncement } from '@/lib/actions/announcements'
import { FormattedMessage } from '@/components/havn/FormattedMessage'

interface Announcement {
  id: string
  content: string | null
  created_at: string
  user_id: string
  profiles: {
    username: string
    first_name: string | null
    last_name: string | null
    avatar_url: string | null
  } | null
  expires_at?: string | null
  is_expired?: boolean
}

interface HQAnnouncementsClientProps {
  initialAnnouncements: Announcement[]
}

export function HQAnnouncementsClient({ initialAnnouncements }: HQAnnouncementsClientProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>(initialAnnouncements)
  const [content, setContent] = useState('')
  const [duration, setDuration] = useState('forever')
  const [isPending, startTransition] = useTransition()
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date())
    }, 10000)
    return () => clearInterval(timer)
  }, [])

  const insertFormatText = (formatType: 'bold' | 'italic' | 'tag') => {
    const textarea = document.getElementById('content') as HTMLTextAreaElement
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const currentText = textarea.value

    let insertText = ''
    let cursorOffset = 0
    let placeholderLen = 0

    if (formatType === 'bold') {
      insertText = '**kalın metin**'
      cursorOffset = 2
      placeholderLen = 11
    } else if (formatType === 'italic') {
      insertText = '*italik metin*'
      cursorOffset = 1
      placeholderLen = 12
    } else if (formatType === 'tag') {
      insertText = '#duyuru'
      cursorOffset = 7
      placeholderLen = 0
    }

    const newText = currentText.substring(0, start) + insertText + currentText.substring(end)
    setContent(newText)

    setTimeout(() => {
      textarea.focus()
      const newCursorPos = start + cursorOffset
      if (formatType === 'tag') {
        textarea.setSelectionRange(newCursorPos, newCursorPos)
      } else {
        textarea.setSelectionRange(start + cursorOffset, start + cursorOffset + placeholderLen)
      }
    }, 0)
  }

  const getRemainingTimeText = (expiresAt: string | null | undefined) => {
    if (!expiresAt) return 'Süresiz'
    const expiry = new Date(expiresAt)
    const diffMs = expiry.getTime() - now.getTime()
    if (diffMs <= 0) return 'Süresi Doldu'

    const diffMins = Math.floor(diffMs / (60 * 1000))
    const diffHours = Math.floor(diffMs / (60 * 60 * 1000))
    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000))

    if (diffDays > 0) {
      const hoursPart = diffHours % 24
      return `${diffDays} gün ${hoursPart} saat kaldı`
    }
    if (diffHours > 0) {
      const minsPart = diffMins % 60
      return `${diffHours} saat ${minsPart} dakika kaldı`
    }
    return `${diffMins} dakika kaldı`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return

    setActionError(null)
    setActionSuccess(null)

    startTransition(async () => {
      const res = await createAnnouncement(content, duration)
      if (res.error) {
        setActionError(res.error)
      } else {
        setActionSuccess('Resmi duyuru başarıyla yayınlandı.')
        setContent('')
        setDuration('forever')
        if (res.post) {
          const newAnn = {
            ...res.post,
            profiles: {
              username: 'havn',
              first_name: 'Havn',
              last_name: '',
              avatar_url: null
            }
          } as Announcement
          setAnnouncements(prev => {
            const updated = prev.map(ann => ({ ...ann, is_expired: true }))
            return [newAnn, ...updated]
          })
        }
      }
    })
  }

  const handleDelete = async (id: string) => {
    const confirmed = confirm('Bu duyuruyu silmek istediğinize emin misiniz?')
    if (!confirmed) return

    setActionError(null)
    setActionSuccess(null)

    startTransition(async () => {
      const res = await deleteAnnouncement(id)
      if (res.error) {
        setActionError(res.error)
      } else {
        setActionSuccess('Duyuru başarıyla silindi.')
        setAnnouncements(prev => prev.filter(ann => ann.id !== id))
      }
    })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-8">
      {/* Form / Left column */}
      <div className="space-y-6">
        <div className="rounded-2xl border border-white/[0.06] bg-[#090912]/80 backdrop-blur-md p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-white/5">
            <Volume2 size={16} className="text-violet-400" />
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-300">Yeni Duyuru Gönder</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="content" className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                Duyuru İçeriği
              </label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Duyuru metnini buraya yazın..."
                className="w-full h-32 px-4 py-3 rounded-xl border border-white/[0.06] bg-white/[0.02] text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 transition-all resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="duration" className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                Duyuru Süresi
              </label>
              <select
                id="duration"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] text-xs text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 transition-all cursor-pointer"
              >
                <option value="forever" className="bg-[#090912] text-slate-300">Süresiz (Forever)</option>
                <option value="1h" className="bg-[#090912] text-slate-300">1 Saat</option>
                <option value="12h" className="bg-[#090912] text-slate-300">12 Saat</option>
                <option value="1d" className="bg-[#090912] text-slate-300">1 Gün</option>
                <option value="1w" className="bg-[#090912] text-slate-300">1 Hafta</option>
                <option value="1m" className="bg-[#090912] text-slate-300">1 Ay</option>
              </select>
            </div>

            {/* Error / Success feedback */}
            <AnimatePresence mode="wait">
              {actionError && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="p-3 rounded-xl text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-2"
                >
                  <AlertTriangle size={14} className="flex-shrink-0" />
                  <span>{actionError}</span>
                </motion.div>
              )}
              {actionSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="p-3 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-2"
                >
                  <Sparkles size={14} className="flex-shrink-0" />
                  <span>{actionSuccess}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={isPending || !content.trim()}
              className="w-full h-11 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-violet-800/40 text-white disabled:text-white/40 font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer border-0 shadow-lg shadow-violet-600/15"
            >
              {isPending ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Yayınlanıyor...</span>
                </>
              ) : (
                <>
                  <Send size={14} />
                  <span>Yayınla (On Behalf of @havn)</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Formatting Info Box */}
        <div className="rounded-2xl border border-white/[0.04] bg-[#090912]/40 p-5 space-y-3">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold">
            <Info size={14} className="text-violet-400" />
            <span>Format İpuçları</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 font-mono">
            <button
              type="button"
              onClick={() => insertFormatText('bold')}
              className="p-2 rounded bg-white/[0.01] border border-white/[0.02] hover:bg-white/[0.04] hover:border-violet-500/20 active:scale-[0.98] transition-all text-left cursor-pointer group border-none outline-none"
              title="Mesaja kalın metin ekle"
            >
              <span className="text-slate-400 font-bold group-hover:text-violet-400 transition-colors">**Kalın Yazı**</span>
            </button>
            <button
              type="button"
              onClick={() => insertFormatText('italic')}
              className="p-2 rounded bg-white/[0.01] border border-white/[0.02] hover:bg-white/[0.04] hover:border-violet-500/20 active:scale-[0.98] transition-all text-left cursor-pointer group border-none outline-none"
              title="Mesaja italik metin ekle"
            >
              <span className="text-slate-400 italic group-hover:text-violet-400 transition-colors">*İtalik Yazı*</span>
            </button>
            <button
              type="button"
              onClick={() => insertFormatText('tag')}
              className="p-2 rounded bg-white/[0.01] border border-white/[0.02] col-span-2 hover:bg-white/[0.04] hover:border-violet-500/20 active:scale-[0.98] transition-all text-center cursor-pointer group border-none outline-none"
              title="Mesaja #duyuru etiketi ekle"
            >
              <span className="text-slate-400 group-hover:text-violet-400 transition-colors">#duyuru (Etiket)</span>
            </button>
          </div>
          <p className="text-[10px] text-slate-500 leading-relaxed">
            Not: Gönderilen duyurular anasayfa ve duyuru akışında anında güncellenir.
          </p>
        </div>
      </div>

      {/* History / Right column */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">
            Duyuru Geçmişi ({announcements.length})
          </h3>
        </div>

        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
          {announcements.map((ann) => {
            const authorName = ann.profiles
              ? `${ann.profiles.first_name || ''} ${ann.profiles.last_name || ''}`.trim() || `@${ann.profiles.username}`
              : 'Havn Official'
            const authorUsername = ann.profiles?.username || 'havn'
            
            const isExpired = ann.expires_at ? new Date(ann.expires_at) <= now : !!ann.is_expired
            const remainingText = getRemainingTimeText(ann.expires_at)
            
            return (
              <div
                key={ann.id}
                className="p-4 rounded-2xl border border-white/[0.05] bg-[#090912]/60 hover:bg-[#090912]/80 hover:border-violet-500/10 transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center text-xs font-black text-white border border-white/10 shadow-inner">
                      {ann.profiles?.avatar_url ? (
                        <img src={ann.profiles.avatar_url} alt="" className="w-full h-full object-cover rounded-xl" />
                      ) : (
                        'H'
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white leading-tight flex items-center gap-1 flex-wrap">
                        <span>{authorName}</span>
                        <span className="text-[8px] bg-violet-500/10 text-violet-400 border border-violet-500/20 px-1 py-0.2 rounded font-black uppercase">
                          Sistem
                        </span>
                        {isExpired ? (
                          <span className="text-[8px] bg-rose-500/10 text-rose-400 border border-rose-500/20 px-1 py-0.2 rounded font-black uppercase">
                            Süresi Doldu
                          </span>
                        ) : (
                          <span className="text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1 py-0.2 rounded font-black uppercase">
                            Aktif ({remainingText})
                          </span>
                        )}
                      </p>
                      <p className="text-[9px] text-slate-500 font-mono">
                        @{authorUsername} • {new Date(ann.created_at).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(ann.id)}
                    disabled={isPending}
                    className="p-1.5 rounded-lg border border-white/5 bg-white/[0.02] text-slate-500 hover:text-rose-400 hover:border-rose-500/20 transition-all cursor-pointer"
                    title="Duyuruyu Sil"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>

                <div className="text-xs text-slate-300 leading-relaxed break-words bg-white/[0.01] p-3 rounded-xl border border-white/[0.02]">
                  {ann.content ? (
                    <FormattedMessage text={ann.content} />
                  ) : (
                    <span className="text-slate-600 italic">İçerik yok</span>
                  )}
                </div>
              </div>
            )
          })}

          {announcements.length === 0 && (
            <div className="text-center py-12 rounded-2xl border border-dashed border-white/5 bg-[#090912]/20">
              <Megaphone size={24} className="mx-auto mb-2 text-slate-600" />
              <p className="text-xs font-bold text-slate-500">Henüz yayınlanmış resmi duyuru bulunmuyor.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
