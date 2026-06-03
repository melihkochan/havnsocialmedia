'use client'

import { useState, useTransition, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Shield, X, AlertTriangle, Check, Star, Award, Search, 
  RefreshCw, Info, Settings, ShieldAlert, ShieldOff, Trash2, Loader2
} from 'lucide-react'
import { getCountryName } from '@/lib/countries'
import { getRankInfo } from '@/lib/gamification'
import { 
  updateUserRole, warnUser, deleteUserProfile, toggleProfileVerification, 
  resetUserWarns, updateUserProfileDetails, awardUserXP 
} from '@/lib/actions/hq-admin'
import { closeSupportTicketByAdmin, replyToSupportTicket } from '@/lib/actions/support'
import { SearchableSelect } from '@/components/havn/SearchableSelect'
import { getCountriesAction, getCitiesAction } from '@/lib/actions/location'
import { getHQModLogs } from '@/lib/actions/hq-chat'
import { muteUserAction } from '@/lib/actions/hq-admin'
import { getProfile } from '@/lib/actions/profile'

interface SupportTicket {
  id: string
  user_id: string
  subject: string
  message: string
  status: 'open' | 'replied' | 'closed'
  created_at: string
  admin_reply: string | null
  replied_by: string | null
  profiles: {
    id: string
    username: string
    first_name: string | null
    last_name: string | null
    avatar_url: string | null
    bio: string | null
    country: string | null
    city: string | null
    is_verified?: boolean
    is_gold?: boolean
    xp?: number
    role?: string | null
    warns?: number | null
    postCount?: number
  } | null
}

interface HQModerationClientProps {
  initialTickets: SupportTicket[]
  initialLogs: any[]
  currentUserRole: string
}

export default function HQModerationClient({
  initialTickets,
  initialLogs,
  currentUserRole
}: HQModerationClientProps) {
  const [tickets, setTickets] = useState<SupportTicket[]>(initialTickets)
  const [logs, setLogs] = useState<any[]>(initialLogs)
  
  // View mode switcher: reports or logs
  const [activeView, setActiveView] = useState<'reports' | 'logs'>('reports')
  
  // Filtering & Search
  const [activeTab, setActiveTab] = useState<'all' | 'open' | 'replied' | 'closed'>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | 'post' | 'comment' | 'profile'>('all')

  // Logs filtering & search
  const [logSearchQuery, setLogSearchQuery] = useState('')
  const [logActionFilter, setLogActionFilter] = useState<'all' | string>('all')
  const [isRefreshingLogs, setIsRefreshingLogs] = useState(false)

  const reloadLogs = async () => {
    setIsRefreshingLogs(true)
    try {
      const updatedLogs = await getHQModLogs()
      setLogs(updatedLogs)
    } catch (e) {
    } finally {
      setIsRefreshingLogs(false)
    }
  }

  const handleViewUserProfile = async (username: string) => {
    const cleanUsername = username.startsWith('@') ? username.slice(1) : username
    startMgmtTransition(async () => {
      try {
        const profile = await getProfile(cleanUsername)
        if (profile) {
          openUserDrawer(profile)
        } else {
          setActionMsg(`Kullanıcı @${cleanUsername} bulunamadı.`)
          setTimeout(() => setActionMsg(null), 3000)
        }
      } catch (err) {
        setActionMsg('Kullanıcı detayı yüklenirken hata oluştu.')
        setTimeout(() => setActionMsg(null), 3000)
      }
    })
  }

  // Filtered logs memo
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Action filter
      if (logActionFilter !== 'all' && log.action !== logActionFilter) return false
      
      // Search query (matches actor name/username, target, or details)
      if (logSearchQuery.trim()) {
        const query = logSearchQuery.toLowerCase()
        const actorName = (log.actor?.name || '').toLowerCase()
        const actorUsername = (log.actor?.username || '').toLowerCase()
        const target = (log.target || '').toLowerCase()
        const details = (log.details || '').toLowerCase()
        
        return (
          actorName.includes(query) ||
          actorUsername.includes(query) ||
          target.includes(query) ||
          details.includes(query)
        )
      }
      
      return true
    })
  }, [logs, logActionFilter, logSearchQuery])
  
  // Drawer state
  const [selectedUser, setSelectedUser] = useState<any | null>(null)
  
  // Drawer form states
  const [mgmtFirstName, setMgmtFirstName] = useState('')
  const [mgmtLastName, setMgmtLastName] = useState('')
  const [mgmtBio, setMgmtBio] = useState('')
  const [mgmtCountry, setMgmtCountry] = useState('')
  const [mgmtCity, setMgmtCity] = useState('')
  const [countriesList, setCountriesList] = useState<{ value: string; label: string; image: string }[]>([])
  const [citiesList, setCitiesList] = useState<{ value: string; label: string }[]>([])
  const [loadingGeo, setLoadingGeo] = useState(false)
  const [xpRewardAmount, setXpRewardAmount] = useState(100)
  const [isMgmtPending, startMgmtTransition] = useTransition()
  const [mgmtMsg, setMgmtMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [actionMsg, setActionMsg] = useState<string | null>(null)

  // Sub-modals inside drawer
  const [showWarnModal, setShowWarnModal] = useState(false)
  const [warnReason, setWarnReason] = useState('')
  const [isWarningPending, startWarnTransition] = useTransition()

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeletePending, startDeleteTransition] = useTransition()
  const [isTicketPending, startTicketTransition] = useTransition()

  // Load locations
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
        setCitiesList(list.map(city => ({ value: city, label: city })))
      } catch (err) {
      } finally {
        setLoadingGeo(false)
      }
    }
    loadCities()
  }, [mgmtCountry])

  // Helpers to format ticket data for list representation
  const processedTickets = useMemo(() => {
    return tickets.map((t) => {
      const subjLower = t.subject.toLowerCase()
      
      // Determine Type (POST, YORUM, PROFİL)
      let type: 'POST' | 'YORUM' | 'PROFİL' = 'POST'
      if (subjLower.includes('profil') || subjLower.includes('hesap') || subjLower.includes('üye')) {
        type = 'PROFİL'
      } else if (subjLower.includes('yorum') || subjLower.includes('cevap') || subjLower.includes('hakaret')) {
        type = 'YORUM'
      }

      // Determine Priority (DÜŞÜK, ORTA, YÜKSEK)
      let priority: 'DÜŞÜK' | 'ORTA' | 'YÜKSEK' = 'ORTA'
      if (subjLower.includes('nsfw') || subjLower.includes('taciz') || subjLower.includes('sahte') || t.status === 'open') {
        priority = 'YÜKSEK'
      } else if (subjLower.includes('bilgi') || subjLower.includes('spam')) {
        priority = 'ORTA'
      } else {
        priority = 'DÜŞÜK'
      }

      return {
        ...t,
        type,
        priority
      }
    })
  }, [tickets])

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    return processedTickets.filter((t) => {
      // Tab filter
      if (activeTab === 'open' && t.status !== 'open') return false
      if (activeTab === 'replied' && t.status !== 'replied') return false
      if (activeTab === 'closed' && t.status !== 'closed') return false
      
      // Type dropdown filter
      if (typeFilter === 'post' && t.type !== 'POST') return false
      if (typeFilter === 'comment' && t.type !== 'YORUM') return false
      if (typeFilter === 'profile' && t.type !== 'PROFİL') return false
      
      return true
    })
  }, [processedTickets, activeTab, typeFilter])

  // Open User Drawer
  const openUserDrawer = (u: any) => {
    setSelectedUser(u)
    setMgmtFirstName(u.first_name || '')
    setMgmtLastName(u.last_name || '')
    const parts = (u.bio || '').split('\u200B')
    setMgmtBio(parts[0] || '')
    setMgmtCountry(u.country || '')
    setMgmtCity(u.city || '')
    setMgmtMsg(null)
  }

  // Save drawer details
  const handleSaveDetails = async () => {
    if (!selectedUser) return
    setMgmtMsg(null)
    startMgmtTransition(async () => {
      const res = await updateUserProfileDetails(
        selectedUser.id,
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
        // Update user inside selectedUser
        setSelectedUser((prev: any) => prev ? {
          ...prev,
          first_name: mgmtFirstName.trim() || null,
          last_name: mgmtLastName.trim() || null,
          country: mgmtCountry.trim() || null,
          city: mgmtCity.trim() || null,
          bio: mgmtBio.trim() ? `${mgmtBio.trim()}\u200B${prev.bio?.split('\u200B')[1] || ''}` : null
        } : null)
      }
    })
  }

  // Verification Toggle
  const handleToggleVerify = async (field: 'verified' | 'gold') => {
    if (!selectedUser) return
    setMgmtMsg(null)
    startMgmtTransition(async () => {
      const res = await toggleProfileVerification(selectedUser.id, field)
      if (res.error) {
        setMgmtMsg({ type: 'error', text: `Hata: ${res.error}` })
      } else {
        setSelectedUser((prev: any) => prev ? {
          ...prev,
          is_verified: field === 'verified' ? !prev.is_verified : prev.is_verified,
          is_gold: field === 'gold' ? !prev.is_gold : prev.is_gold,
        } : null)
        setMgmtMsg({ type: 'success', text: `${field === 'verified' ? 'Mavi Tik' : 'Sarı Tik'} güncellendi.` })
        reloadLogs()
      }
    })
  }

  // Award XP
  const handleAwardXP = async () => {
    if (!selectedUser) return
    setMgmtMsg(null)
    startMgmtTransition(async () => {
      const res = await awardUserXP(selectedUser.id, xpRewardAmount)
      if (res.error) {
        setMgmtMsg({ type: 'error', text: `Hata: ${res.error}` })
      } else {
        setSelectedUser((prev: any) => prev ? {
          ...prev,
          xp: (prev.xp ?? 0) + xpRewardAmount
        } : null)
        setMgmtMsg({ type: 'success', text: `+${xpRewardAmount} XP gönderildi.` })
        reloadLogs()
      }
    })
  }

  // Warn User
  const handleWarnUser = async () => {
    if (!selectedUser || !warnReason.trim()) return
    startWarnTransition(async () => {
      const res = await warnUser(selectedUser.id, warnReason.trim())
      if (res.error) {
        setMgmtMsg({ type: 'error', text: `Hata: ${res.error}` })
      } else {
        setSelectedUser((prev: any) => prev ? { ...prev, warns: (prev.warns ?? 0) + 1 } : null)
        setMgmtMsg({ type: 'success', text: `@${selectedUser.username} başarıyla uyarıldı.` })
        setShowWarnModal(false)
        setWarnReason('')
        reloadLogs()
      }
    })
  }

  // Mute User
  const handleMuteUser = async () => {
    if (!selectedUser) return
    setMgmtMsg(null)
    startMgmtTransition(async () => {
      const res = await muteUserAction(selectedUser.id, 24)
      if (res.error) {
        setMgmtMsg({ type: 'error', text: `Hata: ${res.error}` })
      } else {
        setMgmtMsg({ type: 'success', text: `@${selectedUser.username} 24 saatliğine susturuldu.` })
        reloadLogs()
      }
    })
  }

  // Reset Warns
  const handleResetWarns = async (userId: string, username: string) => {
    const res = await resetUserWarns(userId)
    if (res.error) {
      setActionMsg(`Hata: ${res.error}`)
    } else {
      setActionMsg(`@${username} uyarıları sıfırlandı.`)
      if (selectedUser?.id === userId) {
        setSelectedUser((prev: any) => prev ? { ...prev, warns: 0 } : null)
      }
      reloadLogs()
    }
    setTimeout(() => setActionMsg(null), 3000)
  }

  // Delete User
  const handleDeleteUser = async () => {
    if (!selectedUser) return
    startDeleteTransition(async () => {
      const res = await deleteUserProfile(selectedUser.id)
      if (res.error) {
        setMgmtMsg({ type: 'error', text: `Hata: ${res.error}` })
      } else {
        setActionMsg(`@${selectedUser.username} başarıyla silindi.`)
        setSelectedUser(null)
        setShowDeleteModal(false)
        reloadLogs()
        setTimeout(() => setActionMsg(null), 3000)
      }
    })
  }

  // Role modification
  const handleRoleUpdate = async (userId: string, newRole: string, username: string) => {
    const res = await updateUserRole(userId, newRole)
    if (res.error) {
      setActionMsg(`Hata: ${res.error}`)
    } else {
      setActionMsg(`@${username} rolü ${newRole === 'moderator' ? 'Moderatör' : newRole === 'admin' ? 'Yönetici' : 'Üye'} yapıldı.`)
      if (selectedUser?.id === userId) {
        setSelectedUser((prev: any) => prev ? { ...prev, role: newRole } : null)
      }
      reloadLogs()
    }
    setTimeout(() => setActionMsg(null), 3000)
  }

  // Approve report ticket (Close as resolved)
  const handleApproveTicket = async (ticketId: string) => {
    startTicketTransition(async () => {
      const res = await closeSupportTicketByAdmin(ticketId)
      if (res.error) {
        setActionMsg(`Hata: ${res.error}`)
      } else {
        setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: 'closed' } : t))
        setActionMsg('Rapor başarıyla onaylandı ve bilet kapatıldı.')
        reloadLogs()
      }
      setTimeout(() => setActionMsg(null), 3000)
    })
  }

  // Reject report ticket (Close as dismissed / spam)
  const handleRejectTicket = async (ticketId: string) => {
    startTicketTransition(async () => {
      const res = await closeSupportTicketByAdmin(ticketId)
      if (res.error) {
        setActionMsg(`Hata: ${res.error}`)
      } else {
        setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: 'closed' } : t))
        setActionMsg('Rapor reddedildi ve bilet kapatıldı.')
        reloadLogs()
      }
      setTimeout(() => setActionMsg(null), 3000)
    })
  }

  // Counters mapping
  const countBekleyen = tickets.filter(t => t.status === 'open').length
  const countInceleniyor = tickets.filter(t => t.status === 'replied').length
  const countKapatildi = tickets.filter(t => t.status === 'closed').length

  return (
    <div className="w-full p-6 md:p-8 space-y-6 md:space-y-8 select-none text-slate-200">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-white/5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1 text-slate-400 flex items-center gap-1.5">
            <span>Davranış Kontrol Paneli</span>
            <span>&gt;</span>
            <span className="text-violet-400 font-extrabold">Moderasyon & Raporlar</span>
          </p>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">Moderasyon & Raporlar</h1>
          <p className="text-xs text-slate-400 mt-1">
            Kullanıcılar tarafından iletilen şikayetleri ve şüpheli profilleri inceleyin.
          </p>
        </div>

        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-violet-500/10 bg-violet-500/5 text-[9px] font-black text-violet-400 uppercase tracking-widest">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
          Aktif Moderasyon Çekirdeği
        </span>
      </div>

      {/* View Switcher Tabs */}
      <div className="flex border-b border-white/5 pb-0.5 gap-6">
        <button
          onClick={() => setActiveView('reports')}
          className={`pb-3 text-xs font-black uppercase tracking-wider transition-all relative cursor-pointer ${
            activeView === 'reports' ? 'text-white' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          Şikayet & Raporlar ({tickets.length})
          {activeView === 'reports' && (
            <motion.div layoutId="activeViewUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500" />
          )}
        </button>
        <button
          onClick={() => setActiveView('logs')}
          className={`pb-3 text-xs font-black uppercase tracking-wider transition-all relative cursor-pointer ${
            activeView === 'logs' ? 'text-white' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          Moderasyon Günlükleri ({logs.length})
          {activeView === 'logs' && (
            <motion.div layoutId="activeViewUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500" />
          )}
        </button>
      </div>

      {activeView === 'logs' ? (
        <div className="space-y-6">
          {/* Logs Filter / Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-white/5">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Search size={14} />
              </span>
              <input
                type="text"
                value={logSearchQuery}
                onChange={(e) => setLogSearchQuery(e.target.value)}
                placeholder="Günlüklerde ara (Moderatör, Hedef veya detay)..."
                className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-white/5 bg-slate-950/60 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500/40"
              />
            </div>

            {/* Filters and Refresh Button */}
            <div className="flex items-center gap-3">
              <select
                value={logActionFilter}
                onChange={(e) => setLogActionFilter(e.target.value)}
                className="px-3 py-2 text-[10px] font-bold border border-white/5 bg-slate-950/60 rounded-xl text-slate-300 outline-none cursor-pointer font-sans"
              >
                <option value="all">Tüm İşlem Tipleri</option>
                <option value="user_warn">Kullanıcı Uyarısı</option>
                <option value="user_mute">Susturma (Mute)</option>
                <option value="user_delete">Hesap Silme</option>
                <option value="post_delete">Gönderi Silme</option>
                <option value="role_change">Rol Güncelleme</option>
                <option value="verification_toggle">Rozet (Mavi/Sarı Tik)</option>
                <option value="xp_award">XP Ödülü Gönderme</option>
                <option value="community_approve">Topluluk Onayı</option>
                <option value="community_reject">Topluluk Reddi</option>
              </select>

              <button
                onClick={reloadLogs}
                disabled={isRefreshingLogs}
                className="p-2 rounded-xl border border-white/5 bg-slate-950/60 text-slate-400 hover:text-white transition-all flex items-center justify-center cursor-pointer disabled:opacity-50"
                title="Günlükleri Yenile"
              >
                <RefreshCw size={14} className={isRefreshingLogs ? 'animate-spin text-violet-400' : ''} />
              </button>
            </div>
          </div>

          {/* Logs List */}
          <div className="space-y-3">
            {filteredLogs.map((log) => {
              const labelColors: Record<string, string> = {
                role_change: 'bg-purple-500/10 border-purple-500/25 text-purple-400',
                user_warn: 'bg-amber-500/10 border-amber-500/25 text-amber-400',
                user_mute: 'bg-orange-500/10 border-orange-500/25 text-orange-400',
                user_delete: 'bg-rose-500/10 border-rose-500/25 text-rose-500',
                post_delete: 'bg-rose-500/10 border-rose-500/25 text-rose-400',
                verification_toggle: 'bg-blue-500/10 border-blue-500/25 text-blue-400',
                xp_award: 'bg-indigo-500/10 border-indigo-500/25 text-indigo-400',
                community_approve: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400',
                community_reject: 'bg-rose-500/10 border-rose-500/25 text-rose-400',
              }
              
              const labels: Record<string, string> = {
                role_change: 'Rol Güncelleme',
                user_warn: 'Kullanıcı Uyarısı',
                user_mute: 'Susturma (24s)',
                user_delete: 'Hesap Silme',
                post_delete: 'Post Silme',
                verification_toggle: 'Rozet Güncelleme',
                xp_award: 'XP Ödülü',
                community_approve: 'Topluluk Onayı',
                community_reject: 'Topluluk Reddi',
              }

              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-4 rounded-2xl border border-white/[0.04] bg-[#090912]/80 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-white/10 hover:bg-[#0c0c17] transition-all"
                >
                  {/* Left Block: Actor and Details */}
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap text-[9px] font-black uppercase tracking-wider select-none">
                      {/* Action label badge */}
                      <span className={`px-2 py-0.5 rounded border ${labelColors[log.action] || 'bg-slate-500/10 border-white/5 text-slate-400'}`}>
                        {labels[log.action] || log.action || 'Sistem'}
                      </span>

                      {/* Actor link */}
                      <span className="text-slate-500">Moderatör:</span>
                      <span
                        onClick={() => {
                          if (log.actor?.username) handleViewUserProfile(log.actor.username)
                        }}
                        className="text-white hover:text-violet-400 hover:underline cursor-pointer normal-case font-mono"
                      >
                        {log.actor?.name || 'Sistem'} (@{log.actor?.username || 'system'})
                      </span>

                      <span>•</span>

                      {/* Time */}
                      <span className="text-slate-500 font-mono font-medium lowercase">
                        {new Date(log.timestamp).toLocaleString('tr-TR')}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[11px] text-slate-300 leading-relaxed font-semibold break-words">
                        {log.details}
                      </p>
                      {log.target && (
                        <div className="text-[10px] text-slate-500 flex items-center gap-1">
                          <span>Hedef:</span>
                          {log.target.startsWith('@') ? (
                            <span
                              onClick={() => handleViewUserProfile(log.target)}
                              className="text-slate-400 hover:text-violet-400 hover:underline cursor-pointer font-mono font-bold"
                            >
                              {log.target}
                            </span>
                          ) : (
                            <span className="font-mono text-slate-400 font-bold">{log.target}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Block: Action status icon */}
                  <div className="flex-shrink-0 flex items-center gap-2">
                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/5 bg-white/[0.01] text-[9px] font-black text-slate-400 uppercase tracking-widest select-none">
                      Kayıtlı
                    </span>
                  </div>
                </motion.div>
              )
            })}

            {filteredLogs.length === 0 && (
              <div className="text-center py-20 text-xs text-slate-500 font-bold border border-dashed border-white/5 rounded-2xl bg-[#090912]/40">
                Filtreleme kriterlerine uygun moderasyon günlüğü bulunamadı.
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Status Counters Widget Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Bekliyor Widget */}
            <div className="rounded-2xl p-5 bg-card/45 border border-white/[0.04] flex items-center justify-between min-h-[90px]">
              <div className="space-y-0.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Bekliyor</span>
                <p className="text-xs text-rose-400 font-bold">Kuyrukta bekleyen şikayetler</p>
              </div>
              <p className="text-3xl font-black text-rose-500">{countBekleyen}</p>
            </div>

            {/* Inceleniyor Widget */}
            <div className="rounded-2xl p-5 bg-card/45 border border-white/[0.04] flex items-center justify-between min-h-[90px]">
              <div className="space-y-0.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">İnceleniyor</span>
                <p className="text-xs text-amber-400 font-bold">Yazışması devam eden veya bekletilen</p>
              </div>
              <p className="text-3xl font-black text-amber-500">{countInceleniyor}</p>
            </div>

            {/* Kapatildi Widget */}
            <div className="rounded-2xl p-5 bg-card/45 border border-white/[0.04] flex items-center justify-between min-h-[90px]">
              <div className="space-y-0.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Kapatıldı</span>
                <p className="text-xs text-emerald-400 font-bold">Karara bağlanmış biletler</p>
              </div>
              <p className="text-3xl font-black text-emerald-500">{countKapatildi}</p>
            </div>
          </div>

          {/* Control / Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2.5 border-b border-white/5">
            {/* Status filtering pills */}
            <div className="flex bg-slate-900/60 border border-white/5 p-1 rounded-xl select-none">
              {[
                { key: 'all', label: `Tümü (${tickets.length})` },
                { key: 'open', label: `Bekliyor (${countBekleyen})` },
                { key: 'replied', label: `İnceleniyor (${countInceleniyor})` },
                { key: 'closed', label: `Kapatıldı (${countKapatildi})` }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    activeTab === tab.key ? 'bg-violet-600 text-white' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content Type Filter */}
            <div className="flex items-center gap-2">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="px-3 py-1.5 text-[10px] font-bold border border-white/5 bg-slate-950/60 rounded-xl text-slate-300 outline-none cursor-pointer"
              >
                <option value="all">Tüm Şikayet Tipleri</option>
                <option value="post">Gönderi (POST)</option>
                <option value="comment">Yorum (YORUM)</option>
                <option value="profile">Profil (PROFİL)</option>
              </select>
            </div>
          </div>

          {/* Reports Queue List Container */}
          <div className="space-y-3.5">
            {filteredTickets.map((ticket) => {
              const typeStyle = ticket.type === 'POST' 
                ? 'bg-blue-500/10 border-blue-500/25 text-blue-400' 
                : ticket.type === 'PROFİL' 
                  ? 'bg-purple-500/10 border-purple-500/25 text-purple-400' 
                  : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'

              const priorityStyle = ticket.priority === 'YÜKSEK'
                ? 'bg-rose-500/10 border-rose-500/25 text-rose-500'
                : ticket.priority === 'ORTA'
                  ? 'bg-amber-500/10 border-amber-500/25 text-amber-500'
                  : 'bg-slate-500/10 border-white/5 text-slate-400'

              const statusStyle = ticket.status === 'open'
                ? 'bg-rose-500/10 border-rose-500/25 text-rose-500'
                : ticket.status === 'replied'
                  ? 'bg-amber-500/10 border-amber-500/25 text-amber-500'
                  : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400 animate-none'

              const statusLabel = ticket.status === 'open'
                ? 'BEKLİYOR'
                : ticket.status === 'replied'
                  ? 'İNCELENİYOR'
                  : 'KAPATILDI'

              return (
                <motion.div
                  key={ticket.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-4 rounded-2xl border border-white/[0.04] bg-[#090912]/80 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-white/10 hover:bg-[#0c0c17] transition-all"
                >
                  {/* Left Details block */}
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap text-[9px] font-black uppercase tracking-wider select-none">
                      {/* Priority */}
                      <span className={`px-2 py-0.5 rounded border ${priorityStyle}`}>
                        {ticket.priority}
                      </span>
                      
                      {/* Type */}
                      <span className={`px-2 py-0.5 rounded border ${typeStyle}`}>
                        {ticket.type}
                      </span>

                      {/* Reporter */}
                      <span className="text-slate-400">Şikayetçi:</span>
                      <span 
                        onClick={() => {
                          if (ticket.profiles) openUserDrawer(ticket.profiles)
                        }}
                        className="text-white hover:text-violet-400 hover:underline cursor-pointer normal-case font-mono"
                      >
                        @{ticket.profiles?.username || 'anonim'}
                      </span>

                      <span>•</span>

                      {/* Date */}
                      <span className="text-slate-500 font-mono font-medium lowercase">
                        {new Date(ticket.created_at).toLocaleString('tr-TR')}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-slate-200">{ticket.subject}</h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed font-medium break-words">{ticket.message}</p>
                    </div>
                  </div>

                  {/* Right Status & Actions block */}
                  <div className="flex items-center md:justify-end gap-3 flex-shrink-0">
                    {/* Status Indicator */}
                    <span className={`px-3 py-1 rounded-xl text-[9px] font-black border uppercase tracking-wider select-none ${statusStyle}`}>
                      {statusLabel}
                    </span>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5">
                      {ticket.status !== 'closed' && (
                        <>
                          <button
                            onClick={() => handleApproveTicket(ticket.id)}
                            disabled={isTicketPending}
                            className="px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-all cursor-pointer"
                          >
                            Onayla
                          </button>
                          <button
                            onClick={() => handleRejectTicket(ticket.id)}
                            disabled={isTicketPending}
                            className="px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all cursor-pointer"
                          >
                            Reddet
                          </button>
                        </>
                      )}
                      {ticket.profiles && (
                        <button
                          onClick={() => openUserDrawer(ticket.profiles)}
                          className="px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-violet-600 hover:bg-violet-700 text-white transition-all cursor-pointer"
                        >
                          İncele
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })}

            {filteredTickets.length === 0 && (
              <div className="text-center py-20 text-xs text-slate-500 font-bold border border-dashed border-white/5 rounded-2xl bg-[#090912]/40">
                Filtreleme kriterlerine uygun aktif rapor bulunmuyor.
              </div>
            )}
          </div>
        </>
      )}

      {/* Side Slide-out Drawer Panel */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop blur overlay */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedUser(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Slide-out Drawer Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="w-full max-w-md h-full bg-[#0a0a14] border-l border-white/[0.08] relative z-10 shadow-2xl flex flex-col p-6 space-y-6 select-none"
            >
              {/* Top close row */}
              <div className="flex items-center justify-between pb-3 border-b border-white/5 flex-shrink-0">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                  <Settings size={12} />
                  <span>Kullanıcı Detayı</span>
                </span>
                <button 
                  onClick={() => setSelectedUser(null)}
                  className="p-1 rounded bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Drawer Content Body (Scrollable) */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-6">
                
                {/* Header User Details Card */}
                <div className="p-4 rounded-xl border border-white/[0.04] bg-white/[0.01] flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-black text-white bg-gradient-to-br from-violet-600 to-indigo-600 relative overflow-hidden flex-shrink-0">
                    {selectedUser.avatar_url ? <img src={selectedUser.avatar_url} className="w-full h-full object-cover" /> : selectedUser.username.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="text-sm font-black text-white truncate">{selectedUser.first_name || selectedUser.username} {selectedUser.last_name || ''}</h4>
                      {selectedUser.is_verified && <span className="text-blue-400">✓</span>}
                      {selectedUser.is_gold && <span className="text-amber-400">★</span>}
                    </div>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">@{selectedUser.username}</p>
                  </div>
                </div>

                {/* Msg Alerts */}
                {mgmtMsg && (
                  <div className={`p-3 rounded-xl text-[10px] font-bold border flex items-center gap-1.5 ${
                    mgmtMsg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                  }`}>
                    {mgmtMsg.type === 'success' ? <Check size={12} /> : <AlertTriangle size={12} />}
                    <span>{mgmtMsg.text}</span>
                  </div>
                )}

                {/* Özet Bilgiler */}
                <div className="space-y-3.5">
                  <h5 className="text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-white/5 pb-1 select-none">Özet Bilgiler</h5>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
                    <div className="flex justify-between py-1 border-b border-white/[0.02]">
                      <span className="text-slate-500">Rolü</span>
                      <span className="font-semibold text-white capitalize">{selectedUser.role || 'Üye'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-white/[0.02]">
                      <span className="text-slate-500">Durumu</span>
                      <span className="font-semibold text-emerald-400">Aktif</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-white/[0.02]">
                      <span className="text-slate-500">Ülke</span>
                      <span className="font-semibold text-white truncate max-w-[90px]">{selectedUser.country ? getCountryName(selectedUser.country) : 'Belirtilmemiş'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-white/[0.02]">
                      <span className="text-slate-500">Kayıt Tarihi</span>
                      <span className="font-semibold text-white font-mono text-[10px]">{new Date(selectedUser.updated_at).toLocaleDateString('tr-TR')}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-white/[0.02]">
                      <span className="text-slate-500">Uyarılar</span>
                      <span className="font-semibold text-amber-500 font-mono">{selectedUser.warns ?? 0}x</span>
                    </div>
                  </div>
                </div>

                {/* Edit Form */}
                <div className="space-y-3 pt-2">
                  <h5 className="text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-white/5 pb-1">Detay Bilgileri Güncelle</h5>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[8px] font-bold text-slate-500 uppercase">İsim</label>
                      <input 
                        type="text" 
                        value={mgmtFirstName}
                        onChange={(e) => setMgmtFirstName(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-white/5 bg-slate-950/60 text-xs outline-none focus:border-violet-500/40 text-white font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-bold text-slate-500 uppercase">Soyisim</label>
                      <input 
                        type="text" 
                        value={mgmtLastName}
                        onChange={(e) => setMgmtLastName(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-white/5 bg-slate-950/60 text-xs outline-none focus:border-violet-500/40 text-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[8px] font-bold text-slate-500 uppercase">Ülke</label>
                      <SearchableSelect
                        value={mgmtCountry}
                        onChange={setMgmtCountry}
                        options={countriesList}
                        placeholder="Ülke Seçin"
                        selectClassName="p-2.5 bg-slate-950/60 border-white/5 rounded-xl text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-bold text-slate-500 uppercase">Şehir</label>
                      <SearchableSelect
                        value={mgmtCity}
                        onChange={setMgmtCity}
                        options={citiesList}
                        placeholder={loadingGeo ? "Yükleniyor..." : "Şehir Seçin"}
                        disabled={!mgmtCountry || loadingGeo}
                        selectClassName="p-2.5 bg-slate-950/60 border-white/5 rounded-xl text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[8px] font-bold text-slate-500 uppercase">Biyografi</label>
                    <textarea 
                      value={mgmtBio}
                      onChange={(e) => setMgmtBio(e.target.value)}
                      rows={2}
                      className="w-full p-2.5 rounded-xl border border-white/5 bg-slate-950/60 text-xs outline-none focus:border-violet-500/40 text-white resize-none"
                    />
                  </div>

                  <button 
                    onClick={handleSaveDetails}
                    disabled={isMgmtPending}
                    className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-violet-600 hover:bg-violet-700 text-white flex items-center justify-center gap-1.5 w-full cursor-pointer transition-all select-none disabled:opacity-50"
                  >
                    {isMgmtPending ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                    Bilgileri Kaydet
                  </button>
                </div>

                {/* Rozet ve Tik */}
                <div className="space-y-3 pt-2">
                  <h5 className="text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-white/5 pb-1">Rozet ve Tik Yönetimi</h5>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleToggleVerify('verified')}
                      disabled={isMgmtPending}
                      className={`py-2 rounded-xl text-[10px] font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        selectedUser.is_verified
                          ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                          : 'bg-white/5 hover:bg-blue-500/10 border-white/5 hover:border-blue-500/20 text-slate-400'
                      }`}
                    >
                      <Check size={11} /> Mavi Tik
                    </button>
                    <button
                      onClick={() => handleToggleVerify('gold')}
                      disabled={isMgmtPending}
                      className={`py-2 rounded-xl text-[10px] font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        selectedUser.is_gold
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          : 'bg-white/5 hover:bg-amber-500/10 border-white/5 hover:border-amber-500/20 text-slate-400'
                      }`}
                    >
                      <Star size={11} className={selectedUser.is_gold ? 'fill-amber-400' : ''} /> Sarı Tik
                    </button>
                  </div>
                </div>

                {/* XP Gönder */}
                <div className="space-y-3 pt-2">
                  <h5 className="text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-white/5 pb-1">Onur Ödülü (XP Gönder)</h5>
                  <div className="flex gap-2">
                    <select
                      value={xpRewardAmount}
                      onChange={(e) => setXpRewardAmount(Number(e.target.value))}
                      className="flex-1 p-2 rounded-xl border border-white/5 bg-slate-950/60 text-xs text-foreground outline-none font-mono"
                    >
                      <option value={100}>+100 XP (Standart)</option>
                      <option value={250}>+250 XP (Katkı)</option>
                      <option value={500}>+500 XP (Büyük Emek)</option>
                    </select>
                    <button 
                      onClick={handleAwardXP}
                      disabled={isMgmtPending}
                      className="px-3.5 rounded-xl text-[10px] font-black uppercase bg-violet-600 hover:bg-violet-700 text-white flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                    >
                      <Award size={11} /> Ödül
                    </button>
                  </div>
                </div>

                {/* Hızlı Moderasyon */}
                <div className="space-y-3 pt-2">
                  <h5 className="text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-white/5 pb-1">Hızlı Moderasyon İşlemleri</h5>
                  <div className="flex flex-col gap-2.5">
                    {/* Role modifications */}
                    {selectedUser.role !== 'founder' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRoleUpdate(selectedUser.id, selectedUser.role === 'admin' ? 'member' : 'admin', selectedUser.username)}
                          className="flex-1 py-2 text-[9px] font-black uppercase border border-purple-500/20 hover:bg-purple-500/10 text-purple-400 rounded-xl transition-all cursor-pointer text-center"
                        >
                          {selectedUser.role === 'admin' ? 'Adminlik Yetkisini Al' : 'Admin Yap'}
                        </button>
                        <button
                          onClick={() => handleRoleUpdate(selectedUser.id, selectedUser.role === 'moderator' ? 'member' : 'moderator', selectedUser.username)}
                          className="flex-1 py-2 text-[9px] font-black uppercase border border-emerald-500/25 hover:bg-emerald-500/10 text-emerald-400 rounded-xl transition-all cursor-pointer text-center"
                        >
                          {selectedUser.role === 'moderator' ? 'Modluğu Al' : 'Moderatör Yap'}
                        </button>
                      </div>
                    )}

                    {/* Reset warns */}
                    {(selectedUser.warns ?? 0) > 0 && (
                      <button
                        onClick={() => handleResetWarns(selectedUser.id, selectedUser.username)}
                        className="py-2.5 text-[9px] font-black uppercase border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-400 rounded-xl transition-all cursor-pointer w-full text-center"
                      >
                        Uyarıları Sıfırla
                      </button>
                    )}

                    <button 
                      onClick={() => setShowWarnModal(true)}
                      className="py-2.5 text-[9px] font-black uppercase border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 text-amber-500 rounded-xl transition-all cursor-pointer w-full text-center"
                    >
                      Uyarı Gönder
                    </button>

                    <button 
                      onClick={handleMuteUser}
                      disabled={isMgmtPending}
                      className="py-2.5 text-[9px] font-black uppercase border border-slate-500/15 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl transition-all cursor-pointer w-full text-center disabled:opacity-50"
                    >
                      {isMgmtPending ? 'İşleniyor...' : 'Sustur (24s)'}
                    </button>

                    <button 
                      onClick={() => setShowDeleteModal(true)}
                      className="py-2.5 text-[9px] font-black uppercase border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 text-rose-500 rounded-xl transition-all cursor-pointer w-full text-center"
                    >
                      Hesabı Kalıcı Olarak Sil
                    </button>
                  </div>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* WARN modal */}
      <AnimatePresence>
        {showWarnModal && selectedUser && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm p-6 rounded-2xl border border-white/5 bg-[#0c0c16] shadow-2xl relative space-y-4"
            >
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <AlertTriangle size={15} className="text-amber-500" />
                <span>@{selectedUser.username} Kullanıcısını Uyar</span>
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Kullanıcıya gönderilecek uyarı gerekçesini yazınız. Bu işlem kullanıcının uyarı sayacını +1 artırır.
              </p>
              <textarea 
                value={warnReason}
                onChange={(e) => setWarnReason(e.target.value)}
                placeholder="Örn: Rahatsız edici spam paylaşımlar nedeniyle uyarıldınız."
                className="w-full h-24 p-3 rounded-xl border border-white/5 bg-slate-950/60 text-xs text-white outline-none resize-none"
              />
              <div className="flex gap-2 justify-end text-xs">
                <button onClick={() => setShowWarnModal(false)} className="px-4 py-2 text-slate-500 hover:text-white transition-all cursor-pointer">İptal</button>
                <button 
                  onClick={handleWarnUser}
                  disabled={isWarningPending || !warnReason.trim()}
                  className="px-4 py-2 rounded-xl font-bold bg-amber-500 text-black hover:opacity-90 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isWarningPending ? 'Gönderiliyor...' : 'Uyar'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE confirmation modal */}
      <AnimatePresence>
        {showDeleteModal && selectedUser && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm p-6 rounded-2xl border border-white/5 bg-[#0c0c16] shadow-2xl relative space-y-4"
            >
              <h3 className="text-sm font-black text-rose-500 flex items-center gap-2">
                <Trash2 size={15} />
                <span>Hesabı Kalıcı Olarak Sil</span>
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                <b>@{selectedUser.username}</b> kullanıcısının hesabını ve platformdaki tüm verilerini kalıcı olarak silmek üzeresiniz. Bu işlem <b>GERİ ALINAMAZ</b>.
              </p>
              <div className="flex gap-2 justify-end text-xs">
                <button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 text-slate-500 hover:text-white transition-all cursor-pointer">İptal</button>
                <button 
                  onClick={handleDeleteUser}
                  disabled={isDeletePending}
                  className="px-4 py-2 rounded-xl font-bold bg-rose-600 text-white hover:bg-rose-700 transition-all cursor-pointer"
                >
                  {isDeletePending ? 'Siliniyor...' : 'Kalıcı Olarak Sil'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Action Toast message */}
      <AnimatePresence>
        {actionMsg && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="fixed bottom-6 right-6 px-4 py-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold rounded-xl shadow-lg z-50"
          >
            ✓ {actionMsg}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}
