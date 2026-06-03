'use client'

import { useState, useEffect, useTransition, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Trash2,
  Check,
  Loader2,
  Sparkles,
  Activity,
  Plus,
  RefreshCw,
  X,
  Award,
  AlertTriangle,
  Search,
  ChevronRight,
  MessageSquare,
  FileText
} from 'lucide-react'
import { getRankInfo } from '@/lib/gamification'
import { updateUserRole, getHQUsers } from '@/lib/actions/hq-admin'
import { getTeamMembers, getHQModLogs, getHQNotes } from '@/lib/actions/hq-chat'

interface TeamMember {
  id: string
  username: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  role: string | null
  last_seen_at: string | null
  show_status: boolean | null
  is_verified: boolean | null
  is_gold: boolean | null
  xp: number | null
  bio: string | null
  warns: number | null
  country: string | null
  city: string | null
}

const ROLE_DETAILS: Record<string, { bg: string; text: string; border: string; label: string; icon: any }> = {
  founder: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/20',
    label: 'Kurucu',
    icon: ShieldAlert
  },
  admin: {
    bg: 'bg-rose-500/10',
    text: 'text-rose-400',
    border: 'border-rose-500/20',
    label: 'Yönetici',
    icon: ShieldCheck
  },
  moderator: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/20',
    label: 'Moderatör',
    icon: Shield
  }
}

export function HQTeamManagement({ currentUserId, currentUserRole }: { currentUserId: string; currentUserRole: string }) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [notes, setNotes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Promotion modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedRole, setSelectedRole] = useState<'admin' | 'moderator'>('moderator')
  const [promotingUserId, setPromotingUserId] = useState<string | null>(null)
  
  const [isPending, startTransition] = useTransition()

  // Fetch initial data
  const loadData = async () => {
    setLoading(true)
    try {
      const [membersData, logsData, notesData] = await Promise.all([
        getTeamMembers(),
        getHQModLogs(),
        getHQNotes()
      ])
      setTeamMembers(membersData as TeamMember[])
      setLogs(logsData)
      setNotes(notesData)
    } catch (err) {
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Debounced search for adding new user
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    setSearching(true)
    const timer = setTimeout(async () => {
      try {
        const res = await getHQUsers({ search: searchQuery, pageSize: 8 })
        // Filter out existing team members
        const filtered = (res.users || []).filter(
          (u: any) => !['founder', 'admin', 'moderator'].includes(u.role || '')
        )
        setSearchResults(filtered)
      } catch (err) {
      } finally {
        setSearching(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  const handlePromote = async (userId: string, username: string, role: string) => {
    setPromotingUserId(userId)
    setActionMsg(null)
    
    startTransition(async () => {
      const res = await updateUserRole(userId, role)
      if (res.error) {
        setActionMsg({ type: 'error', text: `Yetkilendirme hatası: ${res.error}` })
      } else {
        setActionMsg({ type: 'success', text: `@${username} başarıyla yetkilendirildi.` })
        setShowAddModal(false)
        setSearchQuery('')
        setSearchResults([])
        await loadData()
      }
      setPromotingUserId(null)
      setTimeout(() => setActionMsg(null), 4000)
    })
  }

  const handleDemote = async (userId: string, username: string) => {
    if (!confirm(`@${username} kullanıcısının tüm yetkilerini alıp ekip dışı bırakmak istediğinize emin misiniz?`)) return
    
    setActionMsg(null)
    startTransition(async () => {
      const res = await updateUserRole(userId, 'member')
      if (res.error) {
        setActionMsg({ type: 'error', text: `Hata: ${res.error}` })
      } else {
        setActionMsg({ type: 'success', text: `@${username} yetkileri alınarak üye yapıldı.` })
        await loadData()
      }
      setTimeout(() => setActionMsg(null), 4000)
    })
  }

  const getOnlineStatus = (member: TeamMember) => {
    if (member.show_status === false || !member.last_seen_at) {
      return { label: 'Çevrimdışı', color: 'bg-slate-500/85' }
    }
    const lastSeen = new Date(member.last_seen_at)
    const now = new Date()
    const diffMins = Math.floor((now.getTime() - lastSeen.getTime()) / 60000)

    if (diffMins < 3) {
      return { label: 'Çevrimiçi', color: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' }
    } else if (diffMins < 10) {
      return { label: 'Boşta', color: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' }
    }
    return { label: 'Çevrimdışı', color: 'bg-slate-500/85' }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-xs text-muted-foreground">Ekip verileri yükleniyor...</p>
      </div>
    )
  }

  // Sort team members: founder -> admin -> moderator
  const sortedMembers = [...teamMembers].sort((a, b) => {
    const priority = (role: string | null) => {
      if (role === 'founder') return 3
      if (role === 'admin') return 2
      if (role === 'moderator') return 1
      return 0
    }
    return priority(b.role) - priority(a.role)
  })

  return (
    <div className="w-full p-6 md:p-8 space-y-6 md:space-y-8 select-none text-slate-200">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-white/5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1 text-slate-400 flex items-center gap-1.5">
            <span>Davranış Kontrol Paneli</span>
            <span>&gt;</span>
            <span className="text-violet-400 font-extrabold">Ekip Yönetimi</span>
          </p>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">Ekip Yönetimi</h1>
          <p className="text-xs text-slate-400 mt-1">
            Platform yöneticileri ve moderatörlerin rollerini ve yetkili işlemlerini denetleyin.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="p-2.5 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.06] transition-all cursor-pointer text-slate-350 hover:text-white"
            title="Yenile"
          >
            <RefreshCw size={13} />
          </button>
          
          {['founder', 'admin'].includes(currentUserRole) && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-primary hover:bg-primary/95 text-white transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-primary/10"
            >
              <Plus size={14} />
              <span>Yeni Yetkili Ekle</span>
            </button>
          )}
        </div>
      </div>

      {/* Alert toast */}
      <AnimatePresence>
        {actionMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-xl text-xs font-bold border flex items-center gap-2 shadow-lg ${
              actionMsg.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/25 text-rose-400'
            }`}
          >
            {actionMsg.type === 'success' ? <Check size={14} /> : <AlertTriangle size={14} />}
            <span>{actionMsg.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Statistics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl p-5 bg-card/45 border border-white/[0.04] flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
            <Users size={20} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Toplam Yetkili</span>
            <h3 className="text-2xl font-black text-white mt-0.5">{teamMembers.length}</h3>
          </div>
        </div>

        <div className="rounded-2xl p-5 bg-card/45 border border-white/[0.04] flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Activity size={20} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Çevrimiçi Yetkili</span>
            <h3 className="text-2xl font-black text-white mt-0.5">
              {teamMembers.filter(m => getOnlineStatus(m).label === 'Çevrimiçi').length}
            </h3>
          </div>
        </div>

        <div className="rounded-2xl p-5 bg-card/45 border border-white/[0.04] flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
            <ShieldCheck size={20} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Toplam Mod Eylemi</span>
            <h3 className="text-2xl font-black text-white mt-0.5">{logs.length}</h3>
          </div>
        </div>
      </div>

      {/* Team list */}
      <div className="space-y-4">
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 select-none">
          <Shield size={14} className="text-violet-400" />
          <span>Platform Yetkili Kadrosu</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sortedMembers.map((member) => {
            const role = member.role || 'member'
            const roleConf = ROLE_DETAILS[role] || {
              bg: 'bg-white/5',
              text: 'text-slate-400',
              border: 'border-white/5',
              label: 'Üye',
              icon: Users
            }
            const Icon = roleConf.icon
            const status = getOnlineStatus(member)
            const initials = [member.first_name?.[0], member.last_name?.[0]].filter(Boolean).join('').toUpperCase() || member.username.slice(0, 2).toUpperCase()
            const lvl = getRankInfo(member.xp ?? 0).level

            // Calculate stats for this user
            const actionsCount = logs.filter((l: any) => l.actor?.id === member.id).length
            const notesCount = notes.filter((n: any) => n.created_by?.id === member.id).length

            return (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-5 rounded-2xl border bg-card/35 flex flex-col justify-between gap-4 transition-all duration-300 ${
                  role === 'founder'
                    ? 'border-amber-500/25 bg-amber-950/5 hover:border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.03)]'
                    : 'border-white/[0.04] hover:border-white/10'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    {/* Avatar with Status Dot */}
                    <div className="relative">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-black text-white bg-gradient-to-br from-violet-600 to-indigo-600 overflow-hidden shadow-inner border border-white/5">
                        {member.avatar_url ? (
                          <img src={member.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : initials}
                      </div>
                      <span
                        className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[#080810] ${status.color}`}
                        title={status.label}
                      />
                    </div>

                    {/* Member Name */}
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-sm font-black text-white">
                          {member.first_name || member.last_name
                            ? `${member.first_name || ''} ${member.last_name || ''}`.trim()
                            : member.username}
                        </h4>
                        <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/5 text-slate-400 text-[8px] font-mono select-none" title={`Seviye ${lvl}`}>
                          Lv.{lvl}
                        </span>
                        {member.is_verified && <span className="text-blue-400 text-xs" title="Mavi Tik">✓</span>}
                        {member.is_gold && <span className="text-amber-400 text-xs" title="Sarı Tik">★</span>}
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">@{member.username}</p>
                    </div>
                  </div>

                  {/* Role Badge */}
                  <div className={`px-2.5 py-1 rounded-xl border flex items-center gap-1 text-[9px] font-black uppercase tracking-wider ${roleConf.bg} ${roleConf.text} ${roleConf.border}`}>
                    <Icon size={10} />
                    <span>{roleConf.label}</span>
                  </div>
                </div>

                {/* Bio */}
                {member.bio && (
                  <p className="text-xs text-slate-400 leading-relaxed font-medium bg-white/[0.01] p-3 rounded-xl border border-white/[0.02]">
                    {member.bio.split('\u200B')[0]}
                  </p>
                )}

                {/* Team performance counts */}
                <div className="grid grid-cols-2 gap-3.5 pt-3.5 border-t border-white/5">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-white/5 border border-white/5 text-slate-400">
                      <Shield size={12} />
                    </div>
                    <div>
                      <p className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">Moderatör Eylemi</p>
                      <p className="text-xs font-black text-white font-mono mt-0.5">{actionsCount} işlem</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-white/5 border border-white/5 text-slate-400">
                      <FileText size={12} />
                    </div>
                    <div>
                      <p className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">Ekip Notu</p>
                      <p className="text-xs font-black text-white font-mono mt-0.5">{notesCount} not</p>
                    </div>
                  </div>
                </div>

                {/* Action Row */}
                {['founder', 'admin'].includes(currentUserRole) && member.role !== 'founder' && member.id !== currentUserId && (
                  <div className="flex justify-end gap-2 pt-1">
                    {/* Role toggler */}
                    {role === 'moderator' && (
                      <button
                        onClick={() => handlePromote(member.id, member.username, 'admin')}
                        className="px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/25 transition-all cursor-pointer"
                      >
                        Yönetici Yap
                      </button>
                    )}
                    {role === 'admin' && (
                      <button
                        onClick={() => handlePromote(member.id, member.username, 'moderator')}
                        className="px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/25 transition-all cursor-pointer"
                      >
                        Moderatör Yap
                      </button>
                    )}
                    <button
                      onClick={() => handleDemote(member.id, member.username)}
                      className="px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase bg-rose-950/20 hover:bg-rose-950/40 text-rose-500 border border-rose-500/10 hover:border-rose-500/20 transition-all cursor-pointer flex items-center gap-1"
                    >
                      <Trash2 size={10} />
                      <span>Yetkileri Al</span>
                    </button>
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Promotion Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md p-6 rounded-2xl border border-white/10 bg-[#0c0c16]/95 backdrop-blur-md shadow-2xl relative flex flex-col max-h-[85vh]"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3.5 border-b border-white/5 select-none">
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <UserCheck className="text-primary" size={16} />
                  <span>Yeni Yetkili Ekle</span>
                </h3>
                <button
                  onClick={() => {
                    setShowAddModal(false)
                    setSearchQuery('')
                    setSearchResults([])
                  }}
                  className="p-1 rounded bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Form Input */}
              <div className="mt-4 space-y-4">
                <div className="space-y-1 select-none">
                  <label className="text-[9px] font-black uppercase text-slate-500">Rol Ata</label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setSelectedRole('moderator')}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        selectedRole === 'moderator'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-white/5 hover:bg-white/10 text-slate-400 border-white/5'
                      }`}
                    >
                      Moderatör
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedRole('admin')}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        selectedRole === 'admin'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          : 'bg-white/5 hover:bg-white/10 text-slate-400 border-white/5'
                      }`}
                    >
                      Yönetici
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-500 select-none">Kullanıcı Ara</label>
                  <div className="flex items-center gap-2 rounded-xl px-3.5 py-2.5 bg-[#0e0e1b] border border-white/5 focus-within:border-primary/45 mt-1 transition-colors">
                    <Search size={13} className="text-slate-400 flex-shrink-0" />
                    <input
                      type="text"
                      required
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Kullanıcı adı ara... (Örn: @melih)"
                      className="flex-1 bg-transparent text-xs text-white outline-none placeholder:text-slate-600"
                    />
                    {searching && <Loader2 size={11} className="animate-spin text-primary" />}
                  </div>
                </div>
              </div>

              {/* Search Results */}
              <div className="flex-1 overflow-y-auto mt-4 pr-1 divide-y divide-white/5 max-h-[300px]">
                {searchResults.map((user) => (
                  <div key={user.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black text-white bg-gradient-to-br from-indigo-500 to-purple-600 overflow-hidden border border-white/5 flex-shrink-0">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          user.username.slice(0, 2).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">{user.first_name || user.username} {user.last_name || ''}</p>
                        <p className="text-[9px] text-slate-500 font-mono mt-0.5">@{user.username}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={promotingUserId !== null}
                      onClick={() => handlePromote(user.id, user.username, selectedRole)}
                      className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase bg-primary hover:bg-primary/95 text-white transition-all cursor-pointer flex items-center gap-1 disabled:opacity-50"
                    >
                      {promotingUserId === user.id ? (
                        <Loader2 size={10} className="animate-spin" />
                      ) : (
                        <Plus size={10} />
                      )}
                      <span>Yetki Ver</span>
                    </button>
                  </div>
                ))}

                {searchQuery.trim() !== '' && searchResults.length === 0 && !searching && (
                  <div className="text-center py-8 text-xs text-slate-500 font-bold select-none">
                    Eşleşen üye bulunamadı veya kullanıcı zaten yetkili.
                  </div>
                )}
                
                {searchQuery.trim() === '' && (
                  <div className="text-center py-8 text-xs text-slate-500 font-bold select-none">
                    Kullanıcı adı yazarak aramaya başlayın.
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
