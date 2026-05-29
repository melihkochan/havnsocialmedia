'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  getHQMessages,
  sendHQMessage,
  getTeamMembers,
  getHQNotes,
  addHQNote,
  updateHQNoteStatus,
  deleteHQNote,
  getHQModLogs
} from '@/lib/actions/hq-chat'
import {
  Send,
  Lock,
  Loader2,
  MessageSquare,
  Shield,
  ShieldAlert,
  Check,
  Star,
  Settings,
  X,
  AlertTriangle,
  Compass,
  Award,
  MapPin,
  ListTodo,
  Plus,
  Trash2,
  ClipboardList,
  CheckSquare,
  CheckCircle2,
  RefreshCw,
  Layers,
  Activity,
  User
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  updateUserRole,
  toggleProfileVerification,
  updateUserProfileDetails,
  awardUserXP
} from '@/lib/actions/hq-admin'
import { getRankInfo } from '@/lib/gamification'
import { SearchableSelect } from '@/components/havn/SearchableSelect'
import { getCountriesAction, getCitiesAction } from '@/lib/actions/location'

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

  // Channels state
  const [activeChannel, setActiveChannel] = useState<'hq-sohbet' | 'notlar' | 'mod-logs'>('hq-sohbet')

  // Notes state
  const [notes, setNotes] = useState<any[]>([])
  const [loadingNotes, setLoadingNotes] = useState(false)
  const [newNoteTitle, setNewNoteTitle] = useState('')
  const [newNoteContent, setNewNoteContent] = useState('')
  const [newNoteType, setNewNoteType] = useState<'note' | 'announcement'>('note')
  const [newNoteAssigned, setNewNoteAssigned] = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const [showAddNoteForm, setShowAddNoteForm] = useState(false)

  // Mod Logs state
  const [modLogs, setModLogs] = useState<any[]>([])
  const [loadingLogs, setLoadingLogs] = useState(false)

  // Management card state
  const [mgmtUser, setMgmtUser] = useState<any | null>(null)
  const [mgmtFirstName, setMgmtFirstName] = useState('')
  const [mgmtLastName, setMgmtLastName] = useState('')
  const [mgmtBio, setMgmtBio] = useState('')
  const [mgmtCountry, setMgmtCountry] = useState('')
  const [mgmtCity, setMgmtCity] = useState('')
  const [countriesList, setCountriesList] = useState<{ value: string; label: string; image: string }[]>([])
  const [citiesList, setCitiesList] = useState<{ value: string; label: string }[]>([])
  const [loadingGeo, setLoadingGeo] = useState(false)
  const isFirstLoadMgmt = useRef(true)

  useEffect(() => {
    async function loadCountries() {
      try {
        const list = await getCountriesAction()
        setCountriesList(list.map(c => ({
          value: c.code,
          label: c.name,
          image: c.flag
        })))
      } catch (err) {
        console.error('Failed to load countries:', err)
      }
    }
    loadCountries()
  }, [])

  useEffect(() => {
    if (!mgmtCountry) {
      setCitiesList([])
      return
    }
    async function loadCities() {
      setLoadingGeo(true)
      try {
        const list = await getCitiesAction(mgmtCountry)
        const formatted = list.map(city => ({ value: city, label: city }))
        setCitiesList(formatted)
        
        if (!isFirstLoadMgmt.current) {
          if (formatted.length > 0) {
            setMgmtCity(formatted[0].value)
          } else {
            setMgmtCity('')
          }
        } else {
          isFirstLoadMgmt.current = false
        }
      } catch (err) {
        console.error('Failed to load cities:', err)
      } finally {
        setLoadingGeo(false)
      }
    }
    loadCities()
  }, [mgmtCountry])

  const [xpRewardAmount, setXpRewardAmount] = useState(100)
  const [isMgmtPending, startMgmtTransition] = useTransition()
  const [mgmtMsg, setMgmtMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const openMgmtCard = (member: any) => {
    isFirstLoadMgmt.current = true
    setMgmtUser(member)
    setMgmtFirstName(member.first_name || '')
    setMgmtLastName(member.last_name || '')
    const parts = (member.bio || '').split('\u200B')
    setMgmtBio(parts[0] || '')
    setMgmtCountry(member.country || '')
    setMgmtCity(member.city || '')
    setMgmtMsg(null)
  }

  const handleMgmtCountryChange = (countryCode: string) => {
    isFirstLoadMgmt.current = false
    setMgmtCountry(countryCode)
    setMgmtCity('')
  }

  const handleSaveDetails = async () => {
    if (!mgmtUser) return
    setMgmtMsg(null)
    startMgmtTransition(async () => {
      const res = await updateUserProfileDetails(
        mgmtUser.id,
        mgmtFirstName,
        mgmtLastName,
        mgmtBio,
        mgmtCountry,
        mgmtCity
      )
      if (res.error) {
        setMgmtMsg({ type: 'error', text: `Hata: ${res.error}` })
      } else {
        setMgmtMsg({ type: 'success', text: 'Kullanıcı bilgileri güncellendi.' })
        setTeamMembers(prev => prev.map(m => m.id === mgmtUser.id ? {
          ...m,
          first_name: mgmtFirstName.trim() || null,
          last_name: mgmtLastName.trim() || null,
          bio: mgmtBio.trim() ? `${mgmtBio.trim()}\u200B${m.bio?.split('\u200B')[1] || ''}` : null,
          country: mgmtCountry.trim() || null,
          city: mgmtCity.trim() || null
        } : m))
      }
    })
  }

  const handleToggleVerify = async (field: 'verified' | 'gold') => {
    if (!mgmtUser) return
    setMgmtMsg(null)
    startMgmtTransition(async () => {
      const res = await toggleProfileVerification(mgmtUser.id, field)
      if (res.error) {
        setMgmtMsg({ type: 'error', text: `Hata: ${res.error}` })
      } else {
        setTeamMembers(prev => prev.map(m => m.id === mgmtUser.id ? {
          ...m,
          is_verified: field === 'verified' ? !m.is_verified : m.is_verified,
          is_gold: field === 'gold' ? !m.is_gold : m.is_gold,
        } : m))
        setMgmtUser((prev: any) => prev ? {
          ...prev,
          is_verified: field === 'verified' ? !prev.is_verified : prev.is_verified,
          is_gold: field === 'gold' ? !prev.is_gold : prev.is_gold,
        } : null)
        setMgmtMsg({ type: 'success', text: `${field === 'verified' ? 'Mavi Tik' : 'Sarı Tik'} durumu değiştirildi.` })
      }
    })
  }

  const handleAwardXP = async () => {
    if (!mgmtUser) return
    setMgmtMsg(null)
    startMgmtTransition(async () => {
      const res = await awardUserXP(mgmtUser.id, xpRewardAmount)
      if (res.error) {
        setMgmtMsg({ type: 'error', text: `Hata: ${res.error}` })
      } else {
        setTeamMembers(prev => prev.map(m => m.id === mgmtUser.id ? {
          ...m,
          xp: (m.xp ?? 0) + xpRewardAmount
        } : m))
        setMgmtUser((prev: any) => prev ? {
          ...prev,
          xp: (prev.xp ?? 0) + xpRewardAmount
        } : null)
        setMgmtMsg({ type: 'success', text: `+${xpRewardAmount} XP başarıyla gönderildi.` })
      }
    })
  }

  const currentUserProfile = teamMembers.find(m => m.id === currentUserId)
  const currentUserRole = currentUserProfile?.role ?? 'member'

  // Load team list
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

  // Load chat messages
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

  // Channels specific loading trigger
  const handleLoadNotes = async () => {
    setLoadingNotes(true)
    try {
      const data = await getHQNotes()
      setNotes(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingNotes(false)
    }
  }

  const handleLoadLogs = async () => {
    setLoadingLogs(true)
    try {
      const data = await getHQModLogs()
      setModLogs(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingLogs(false)
    }
  }

  useEffect(() => {
    if (activeChannel === 'notlar') {
      handleLoadNotes()
    } else if (activeChannel === 'mod-logs') {
      handleLoadLogs()
    }
  }, [activeChannel])

  // Real-time chat integration
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('hq-chat-room')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'hq_messages' },
        async (payload) => {
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

  // Staff notes board handlers
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newNoteTitle.trim() || !newNoteContent.trim() || addingNote) return
    setAddingNote(true)
    const res = await addHQNote(newNoteTitle, newNoteContent, newNoteType, newNoteAssigned)
    if (res.error) {
      alert(`Hata: ${res.error}`)
    } else {
      setNewNoteTitle('')
      setNewNoteContent('')
      setNewNoteAssigned('')
      setShowAddNoteForm(false)
      await handleLoadNotes()
    }
    setAddingNote(false)
  }

  const handleUpdateNoteStatus = async (noteId: string, newStatus: 'todo' | 'inprogress' | 'completed') => {
    const res = await updateHQNoteStatus(noteId, newStatus)
    if (res.error) {
      alert(`Hata: ${res.error}`)
    } else {
      await handleLoadNotes()
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Bu notu silmek istediğinize emin misiniz?')) return
    const res = await deleteHQNote(noteId)
    if (res.error) {
      alert(`Hata: ${res.error}`)
    } else {
      await handleLoadNotes()
    }
  }

  // Render notes Kanban column helper
  const renderNotesColumn = (statusKey: 'todo' | 'inprogress' | 'completed', title: string, badgeBg: string, badgeText: string) => {
    const filtered = notes.filter((n: any) => n.status === statusKey)
    return (
      <div className="flex-1 flex flex-col h-full min-h-0 bg-white/[0.01] border border-white/[0.03] rounded-2xl p-3">
        <div className="flex items-center justify-between pb-2 mb-3 border-b border-white/5 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${badgeBg} ${badgeText}`}>
              {title}
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">({filtered.length})</span>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-3 pr-0.5 custom-scrollbar min-h-0">
          {filtered.map((note: any) => (
            <div key={note.id} className="p-3.5 rounded-xl border border-white/5 bg-[#0e0e1a]/40 hover:bg-[#0e0e1a]/75 hover:border-white/10 transition-all flex flex-col gap-2 relative group">
              <div className="flex items-center justify-between">
                <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                  note.type === 'announcement'
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                }`}>
                  {note.type === 'announcement' ? 'Duyuru' : 'Not'}
                </span>
                
                <button
                  onClick={() => handleDeleteNote(note.id)}
                  className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-rose-500/10 transition-all cursor-pointer"
                  title="Sil"
                >
                  <Trash2 size={11} />
                </button>
              </div>
              
              <div>
                <h4 className="text-xs font-bold text-white leading-snug">{note.title}</h4>
                <p className="text-[10px] text-slate-400 mt-1 leading-relaxed whitespace-pre-wrap">{note.content}</p>
              </div>

              <div className="mt-1 pt-2 border-t border-white/[0.03] flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[8px] text-slate-500 font-mono">
                  <span>Ekleme: {note.created_by?.name || 'Yetkili'}</span>
                  <span>{new Date(note.created_at).toLocaleDateString('tr-TR')}</span>
                </div>
                {note.assigned_to && (
                  <div className="text-[8px] text-purple-400 font-mono">
                    Sorumlu: @{note.assigned_to}
                  </div>
                )}
              </div>

              <div className="mt-2 flex gap-1 pt-1.5 border-t border-white/[0.03]">
                {statusKey === 'todo' && (
                  <button
                    onClick={() => handleUpdateNoteStatus(note.id, 'inprogress')}
                    className="flex-1 py-1 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/10 hover:border-blue-500/20 text-[8px] font-black uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Başlat
                  </button>
                )}
                {statusKey === 'inprogress' && (
                  <>
                    <button
                      onClick={() => handleUpdateNoteStatus(note.id, 'todo')}
                      className="flex-1 py-1 rounded bg-slate-500/10 hover:bg-slate-500/20 text-slate-400 border border-slate-500/10 hover:border-slate-500/20 text-[8px] font-black uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Geri Al
                    </button>
                    <button
                      onClick={() => handleUpdateNoteStatus(note.id, 'completed')}
                      className="flex-1 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/10 hover:border-emerald-500/20 text-[8px] font-black uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Tamamla
                    </button>
                  </>
                )}
                {statusKey === 'completed' && (
                  <button
                    onClick={() => handleUpdateNoteStatus(note.id, 'inprogress')}
                    className="flex-1 py-1 rounded bg-slate-500/10 hover:bg-slate-500/20 text-slate-400 border border-slate-500/10 hover:border-slate-500/20 text-[8px] font-black uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Yeniden Aç
                  </button>
                )}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-center text-slate-600 border border-dashed border-white/5 rounded-xl">
              <ClipboardList size={16} className="text-slate-700/60 mb-1" />
              <span className="text-[9px] font-bold">Öğe Yok</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Render logs layout helper
  const renderModLogsView = () => {
    const getActionStyles = (action: string) => {
      switch (action) {
        case 'role_change': return { icon: Shield, bg: 'bg-purple-500/15 text-purple-400 border-purple-500/25', label: 'Rol Değişimi' }
        case 'user_warn': return { icon: AlertTriangle, bg: 'bg-amber-500/15 text-amber-400 border-amber-500/25', label: 'Uyarı' }
        case 'verification_toggle': return { icon: Star, bg: 'bg-blue-500/15 text-blue-400 border-blue-500/25', label: 'Rozet' }
        case 'xp_award': return { icon: Award, bg: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/25', label: 'XP Ödülü' }
        case 'community_approve': return { icon: CheckCircle2, bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25', label: 'Topluluk Onay' }
        case 'community_reject': return { icon: Trash2, bg: 'bg-rose-500/15 text-rose-400 border-rose-500/25', label: 'Topluluk Red' }
        case 'warn_reset': return { icon: CheckSquare, bg: 'bg-teal-500/15 text-teal-400 border-teal-500/25', label: 'Uyarı Sıfırlama' }
        case 'note_add': return { icon: Plus, bg: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/25', label: 'Not Ekleme' }
        case 'note_status': return { icon: ListTodo, bg: 'bg-slate-500/15 text-slate-400 border-slate-500/25', label: 'Not Güncelleme' }
        case 'note_delete': return { icon: Trash2, bg: 'bg-rose-500/15 text-rose-400 border-rose-500/25', label: 'Not Silme' }
        default: return { icon: Activity, bg: 'bg-slate-500/15 text-slate-400 border-slate-500/25', label: 'Sistem Olayı' }
      }
    }

    return (
      <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar min-h-0">
        <div className="flex items-center justify-between pb-3 border-b border-white/5 flex-shrink-0">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Denetim Günlükleri Timelıne</h4>
          <button
            onClick={handleLoadLogs}
            disabled={loadingLogs}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer disabled:opacity-50"
          >
            {loadingLogs ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          </button>
        </div>

        {loadingLogs ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
            <p className="text-[10px] text-muted-foreground">Günlükler yükleniyor...</p>
          </div>
        ) : modLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-2">
            <Shield size={20} className="text-slate-600" />
            <p className="text-xs text-muted-foreground font-semibold">Kayıt Bulunmamaktadır</p>
            <p className="text-[10px] text-muted-foreground/60 max-w-xs">Yönetim ve moderasyon panellerinden yapılan işlemler burada listelenir.</p>
          </div>
        ) : (
          <div className="relative border-l border-white/5 pl-4 ml-2 space-y-6">
            {modLogs.map((log: any) => {
              const styles = getActionStyles(log.action)
              const IconComponent = styles.icon
              return (
                <div key={log.id} className="relative group">
                  <div className={`absolute -left-[25px] top-0.5 p-1 rounded-full border ${styles.bg} z-10 flex items-center justify-center w-5 h-5`}>
                    <IconComponent size={10} />
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-white">{log.actor?.name || 'Sistem'}</span>
                      <span className="text-[9px] text-slate-400">({log.actor?.role === 'founder' ? 'Kurucu' : log.actor?.role === 'admin' ? 'Yönetici' : 'Moderatör'})</span>
                      <span className="text-[9px] text-slate-600 font-mono">{new Date(log.timestamp).toLocaleString('tr-TR')}</span>
                    </div>
                    
                    <div className="p-3 rounded-xl border border-white/[0.03] bg-white/[0.01] text-xs leading-relaxed text-slate-300">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${styles.bg}`}>
                          {styles.label}
                        </span>
                        {log.target && (
                          <span className="text-[10px] text-purple-400 font-mono">
                            Hedef: {log.target}
                          </span>
                        )}
                      </div>
                      <div>{log.details}</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
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
      {/* Column 1: Channels List */}
      <div className="w-52 border-r border-border/60 bg-muted/15 flex flex-col h-full flex-shrink-0 select-none">
        <div className="p-3.5 border-b border-border/60 bg-muted/20">
          <h3 className="text-[10px] font-black text-foreground uppercase tracking-wider">KONTROL ODALARI</h3>
          <p className="text-[9px] text-muted-foreground mt-0.5">Dahili İletişim Kanalları</p>
        </div>
        <div className="p-2.5 space-y-1">
          <button
            onClick={() => setActiveChannel('hq-sohbet')}
            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-1.5 transition-all cursor-pointer ${
              activeChannel === 'hq-sohbet'
                ? 'bg-primary/10 text-primary border border-primary/20'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.03] border border-transparent'
            }`}
          >
            <span>#</span>
            <span>hq-sohbet</span>
          </button>
          <button
            onClick={() => setActiveChannel('notlar')}
            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-1.5 transition-all cursor-pointer ${
              activeChannel === 'notlar'
                ? 'bg-primary/10 text-primary border border-primary/20'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.03] border border-transparent'
            }`}
          >
            <span>#</span>
            <span>notlar & duyurular</span>
          </button>
          <button
            onClick={() => setActiveChannel('mod-logs')}
            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-1.5 transition-all cursor-pointer ${
              activeChannel === 'mod-logs'
                ? 'bg-primary/10 text-primary border border-primary/20'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.03] border border-transparent'
            }`}
          >
            <span>#</span>
            <span>mod-logs</span>
          </button>
        </div>
      </div>

      {/* Column 2: Team Members Sidebar */}
      <div className="w-60 border-r border-border/40 bg-muted/10 flex flex-col h-full flex-shrink-0 select-none">
        <div className="p-3.5 border-b border-border/40 bg-muted/15">
          <h3 className="text-[10px] font-black text-foreground uppercase tracking-wider">YETKİLİ KULLANICILAR</h3>
          <p className="text-[9px] text-muted-foreground mt-0.5">Platform Yetkilileri</p>
        </div>
        <div className="flex-1 p-2.5 space-y-1.5 overflow-y-auto custom-scrollbar">
          {teamMembers
            .slice()
            .sort((a, b) => {
              const rolePriority = (r: string | null) => {
                if (r === 'founder') return 3
                if (r === 'admin') return 2
                if (r === 'moderator') return 1
                return 0
              }
              const pA = rolePriority(a.role)
              const pB = rolePriority(b.role)
              if (pA !== pB) return pB - pA
              return (a.username || '').localeCompare(b.username || '')
            })
            .map((member) => {
              const status = getTeamMemberStatus(member.last_seen_at, member.show_status)
              const statusColors = {
                online: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]',
                idle: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]',
                offline: 'bg-slate-500/80'
              }
              const statusLabel = {
                online: 'Çevrimiçi',
                idle: 'Boşta',
                offline: 'Çevrimdışı'
              }
              
              const displayName = `${member.first_name || ''} ${member.last_name || ''}`.trim() || `@${member.username}`
              const roleLabel = member.role === 'founder' ? 'Kurucu' : member.role === 'admin' ? 'Yönetici' : member.role === 'moderator' ? 'Moderatör' : 'Üye'
              const roleColor = member.role === 'founder' ? 'text-amber-500' : member.role === 'admin' ? 'text-rose-400' : member.role === 'moderator' ? 'text-emerald-400' : 'text-slate-400'
              const initials = [member.first_name?.[0], member.last_name?.[0]].filter(Boolean).join('').toUpperCase() || member.username.slice(0, 2).toUpperCase()
              const lvl = getRankInfo(member.xp ?? 0).level

              return (
                <div key={member.id} className="flex items-center gap-2 p-2 rounded-xl bg-white/[0.01] border border-white/[0.02] hover:bg-white/[0.04] transition-all">
                  {/* Avatar with Status Dot */}
                  <div className="relative flex-shrink-0">
                    <div className="w-7 h-7 rounded-xl flex items-center justify-center text-[9px] font-black text-white overflow-hidden shadow-inner bg-gradient-to-br from-indigo-500 to-purple-600">
                      {member.avatar_url ? (
                        <img src={member.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : initials}
                    </div>
                    <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border-[1.5px] border-[#090912] ${statusColors[status]}`} title={statusLabel[status]} />
                  </div>
                  
                  {/* User Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] font-bold text-white truncate block max-w-[80px]" title={displayName}>
                        {displayName}
                      </span>
                      <span className="px-1 py-0.5 rounded bg-white/5 border border-white/5 text-slate-400 text-[7px] font-mono select-none" title={`Seviye ${lvl}`}>
                        Lv.{lvl}
                      </span>
                    </div>
                    <span className={`text-[8px] font-bold block uppercase tracking-wider ${roleColor}`}>
                      {roleLabel}
                    </span>
                  </div>
                  
                  {/* Yönet Button */}
                  {['founder', 'admin'].includes(currentUserRole) && member.role !== 'founder' && (
                    <button
                      onClick={() => openMgmtCard(member)}
                      className="px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-wider bg-purple-500/10 hover:bg-purple-500/25 text-purple-400 border border-purple-500/20 hover:border-purple-500/30 transition-all cursor-pointer flex-shrink-0"
                    >
                      Yönet
                    </button>
                  )}
                </div>
              )
            })}
        </div>
      </div>

      {/* Column 3: Active Workspace Pane */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-[#07070f]/30">
        
        {/* Render HQ sohbet chat workspace */}
        {activeChannel === 'hq-sohbet' && (
          <>
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
            <div className="flex-1 overflow-y-auto p-5 space-y-5 min-h-0 custom-scrollbar">
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
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black text-white flex-shrink-0 overflow-hidden shadow-md"
                      style={{ background: isOwn ? 'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))' : 'linear-gradient(135deg, #4f46e5, #3b82f6)' }}
                    >
                      {msg.user?.avatar_url ? (
                        <img src={msg.user.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : initials}
                    </div>

                    <div className="space-y-1 min-w-[120px]">
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
          </>
        )}

        {/* Render HQ Notes/Tasks Kanban board */}
        {activeChannel === 'notlar' && (
          <div className="flex-1 flex flex-col h-full min-h-0">
            {/* Top Banner */}
            <div className="p-4 border-b border-border/60 bg-muted/20 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 text-primary">
                  <ListTodo size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-foreground">Ekip Notları & Görevler</h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Yapılacak işler, bakılacak notlar ve hedefler panosu.</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddNoteForm(!showAddNoteForm)}
                className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-primary hover:bg-primary/95 text-white transition-all cursor-pointer flex items-center gap-1 shadow-md shadow-primary/10"
              >
                <Plus size={12} />
                <span>{showAddNoteForm ? 'Vazgeç' : 'Yeni Not Ekle'}</span>
              </button>
            </div>

            {/* Add Note Form Container */}
            <AnimatePresence>
              {showAddNoteForm && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-4 border-b border-border/60 bg-muted/15 flex-shrink-0"
                >
                  <form onSubmit={handleAddNote} className="space-y-3 max-w-xl">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Not Başlığı</label>
                        <input
                          type="text"
                          required
                          value={newNoteTitle}
                          onChange={(e) => setNewNoteTitle(e.target.value)}
                          placeholder="Örn: 2X XP Aktifleştirme"
                          className="w-full px-3 py-2 rounded-xl border border-border bg-background/55 text-xs text-foreground outline-none focus:border-primary transition-all"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Kategori</label>
                          <select
                            value={newNoteType}
                            onChange={(e) => setNewNoteType(e.target.value as any)}
                            className="w-full px-3 py-2 rounded-xl border border-border bg-background/55 text-xs text-foreground outline-none focus:border-primary transition-all"
                          >
                            <option value="note">Not</option>
                            <option value="announcement">Duyuru</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Sorumlu (@)</label>
                          <input
                            type="text"
                            value={newNoteAssigned}
                            onChange={(e) => setNewNoteAssigned(e.target.value)}
                            placeholder="Kullanıcı adı"
                            className="w-full px-3 py-2 rounded-xl border border-border bg-background/55 text-xs text-foreground outline-none focus:border-primary transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Detaylar / İçerik</label>
                      <textarea
                        required
                        rows={2}
                        value={newNoteContent}
                        onChange={(e) => setNewNoteContent(e.target.value)}
                        placeholder="Yapılacak işin açıklaması veya duyuru detayları..."
                        className="w-full px-3 py-2 rounded-xl border border-border bg-background/55 text-xs text-foreground outline-none focus:border-primary transition-all resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={addingNote}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-primary text-white hover:opacity-90 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {addingNote ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                      <span>Notu Panoya Ekle</span>
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Kanban Columns Grid */}
            {loadingNotes ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-xs text-muted-foreground">Panodaki notlar yükleniyor...</p>
              </div>
            ) : (
              <div className="flex-1 flex gap-4 p-4 min-h-0 overflow-hidden select-none">
                {renderNotesColumn('todo', 'Yapılacak', 'bg-blue-500/10 border border-blue-500/20', 'text-blue-400')}
                {renderNotesColumn('inprogress', 'Yapılıyor', 'bg-amber-500/10 border border-amber-500/20', 'text-amber-400')}
                {renderNotesColumn('completed', 'Tamamlandı', 'bg-emerald-500/10 border border-emerald-500/20', 'text-emerald-400')}
              </div>
            )}
          </div>
        )}

        {/* Render HQ Audit / Mod Logs timeline */}
        {activeChannel === 'mod-logs' && (
          <div className="flex-1 flex flex-col h-full min-h-0">
            {/* Top Banner */}
            <div className="p-4 border-b border-border/60 bg-muted/20 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 text-primary">
                  <Shield size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-foreground">Denetim Günlükleri (Mod Logs)</h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Yöneticiler ve moderatörler tarafından gerçekleştirilen tüm işlemlerin kayıtları.</p>
                </div>
              </div>
            </div>

            {/* Mod logs list */}
            {renderModLogsView()}
          </div>
        )}
      </div>

      {/* YÖNETİM KARTI Modalı */}
      <AnimatePresence>
        {mgmtUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md p-6 rounded-2xl border border-white/10 bg-[#0c0c16]/95 backdrop-blur-md shadow-2xl relative"
            >
              {/* Close button */}
              <button
                onClick={() => setMgmtUser(null)}
                className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>

              {/* Title / Header */}
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-5 select-none">
                <Settings size={12} />
                <span>YÖNETİM KARTI</span>
              </h3>

              {/* User overview section */}
              <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02] flex items-center gap-3.5 mb-5">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-black text-white flex-shrink-0 relative overflow-hidden"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
                >
                  {mgmtUser.avatar_url ? (
                    <img src={mgmtUser.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    [mgmtUser.first_name?.[0], mgmtUser.last_name?.[0]].filter(Boolean).join('').toUpperCase() || mgmtUser.username.slice(0, 2).toUpperCase()
                  )}
                </div>
                
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="text-sm font-black text-white truncate">{mgmtUser.first_name || mgmtUser.username} {mgmtUser.last_name || ''}</h4>
                    {mgmtUser.is_verified && <span className="text-blue-400" title="Doğrulanmış">✓</span>}
                    {mgmtUser.is_gold && <span className="text-amber-400" title="İş Ortağı">★</span>}
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[8px] font-black uppercase tracking-wider select-none">
                      AKTİF
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">@{mgmtUser.username} • Seviye {getRankInfo(mgmtUser.xp ?? 0).level} ({mgmtUser.xp ?? 0} XP)</p>
                </div>
              </div>

              {/* Msg display */}
              {mgmtMsg && (
                <div className={`p-3 rounded-xl text-xs font-bold border mb-4 flex items-center gap-1.5 ${
                  mgmtMsg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                }`}>
                  {mgmtMsg.type === 'success' ? <Check size={14} /> : <AlertTriangle size={14} />}
                  <span>{mgmtMsg.text}</span>
                </div>
              )}

              {/* Form container */}
              <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
                {/* DETAY BİLGİLERİ GÜNCELLE */}
                <div className="space-y-3">
                  <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-white/5 pb-1">Detay Bilgileri Güncelle</h5>
                  
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">İsim</label>
                      <input
                        type="text"
                        value={mgmtFirstName}
                        onChange={(e) => setMgmtFirstName(e.target.value)}
                        placeholder="Melih"
                        className="w-full p-2.5 rounded-xl border border-white/5 bg-background/55 text-xs text-foreground outline-none focus:border-primary/40 transition-all placeholder:text-slate-700"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Soyisim</label>
                      <input
                        type="text"
                        value={mgmtLastName}
                        onChange={(e) => setMgmtLastName(e.target.value)}
                        placeholder="Koçhan"
                        className="w-full p-2.5 rounded-xl border border-white/5 bg-background/55 text-xs text-foreground outline-none focus:border-primary/40 transition-all placeholder:text-slate-700"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Ülke</label>
                      <SearchableSelect
                        value={mgmtCountry}
                        onChange={handleMgmtCountryChange}
                        options={countriesList}
                        placeholder="Ülke Seçin"
                        selectClassName="p-2.5 bg-[#0e0e1b]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Şehir</label>
                      <SearchableSelect
                        value={mgmtCity}
                        onChange={setMgmtCity}
                        options={citiesList}
                        placeholder={loadingGeo ? "Yükleniyor..." : "Şehir Seçin"}
                        disabled={!mgmtCountry || loadingGeo}
                        selectClassName="p-2.5 bg-[#0e0e1b]"
                      />
                    </div>
                  </div>


                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Biyografi</label>
                    <textarea
                      value={mgmtBio}
                      onChange={(e) => setMgmtBio(e.target.value)}
                      placeholder="Kendinizi tanıtın..."
                      rows={2}
                      className="w-full p-2.5 rounded-xl border border-white/5 bg-background/55 text-xs text-foreground outline-none focus:border-primary/40 transition-all resize-none placeholder:text-slate-700"
                    />
                  </div>

                </div>

                {/* HIZLI YETKİLENDİRME */}
                <div className="space-y-3 pt-2">
                  <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-white/5 pb-1">Hızlı Yetkilendirme</h5>
                  
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      onClick={() => handleToggleVerify('verified')}
                      disabled={isMgmtPending}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        mgmtUser.is_verified
                          ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                          : 'bg-white/5 hover:bg-blue-500/10 text-slate-400 border-white/5 hover:border-blue-500/20'
                      }`}
                    >
                      <Check size={12} />
                      <span>Mavi Tik</span>
                    </button>
                    <button
                      onClick={() => handleToggleVerify('gold')}
                      disabled={isMgmtPending}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        mgmtUser.is_gold
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          : 'bg-white/5 hover:bg-amber-500/10 text-slate-400 border-white/5 hover:border-amber-500/20'
                      }`}
                    >
                      <Star size={12} className={mgmtUser.is_gold ? "fill-amber-400" : ""} />
                      <span>Sarı Tik (Sistem)</span>
                    </button>
                  </div>
                </div>

                {/* HAVN ONUR ÖDÜLÜ */}
                <div className="space-y-3 pt-2">
                  <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-white/5 pb-1">HAVN Onur Ödülü (XP Gönder)</h5>
                  
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    Katkılarından dolayı üyeye anlık deneyim puanı (XP) atayın. Bu eylem seviyelerini yükseltir!
                  </p>

                  <div className="flex gap-2">
                    <select
                      value={xpRewardAmount}
                      onChange={(e) => setXpRewardAmount(Number(e.target.value))}
                      className="flex-1 p-2.5 rounded-xl border border-white/5 bg-background/55 text-xs text-foreground outline-none focus:border-primary/40 transition-all"
                    >
                      <option value={100}>+100 XP (Standart Ödül)</option>
                      <option value={250}>+250 XP (Önemli Katkı)</option>
                      <option value={500}>+500 XP (Büyük Emek)</option>
                      <option value={1000}>+1000 XP (Süper Sinerji Ödülü)</option>
                    </select>

                    <button
                      onClick={handleAwardXP}
                      disabled={isMgmtPending}
                      className="px-4 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:opacity-90 transition-all cursor-pointer flex items-center gap-1"
                    >
                      {isMgmtPending ? <Loader2 size={12} className="animate-spin" /> : <Award size={12} />}
                      <span>Ödüllendir</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="w-full h-px bg-white/5 my-4" />

              {/* Centered Save changes button at the bottom */}
              <div className="flex justify-center">
                <button
                  onClick={handleSaveDetails}
                  disabled={isMgmtPending}
                  className="w-full max-w-[240px] py-2.5 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-primary/10"
                >
                  {isMgmtPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                  <span>Değişiklikleri Kaydet</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
