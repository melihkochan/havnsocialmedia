'use client'

import { useState, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Shield, ShieldOff, AlertTriangle, Trash2, RefreshCw, Loader2, Check, Star } from 'lucide-react'
import { updateUserRole, getHQUsers, warnUser, deleteUserProfile, toggleProfileVerification } from '@/lib/actions/hq-admin'

type UserRow = {
  id: string
  username: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  role: string | null
  updated_at: string
  is_verified: boolean | null
  is_gold: boolean | null
  xp: number | null
  postCount: number
  warns: number | null
  last_seen_at: string | null
  show_status: boolean | null
}

const ROLE_STYLES: Record<string, { bg: string; color: string; label: string; border: string }> = {
  founder: { bg: 'rgba(245,158,11,0.12)', color: '#fbbf24', label: 'Kurucu', border: 'rgba(245,158,11,0.25)' },
  admin: { bg: 'rgba(239,68,68,0.12)', color: '#f87171', label: 'Yönetici', border: 'rgba(239,68,68,0.25)' },
  moderator: { bg: 'rgba(16,185,129,0.12)', color: '#34d399', label: 'Moderatör', border: 'rgba(16,185,129,0.25)' },
  elite: { bg: 'rgba(139,92,246,0.12)', color: '#a78bfa', label: 'Elite Üye', border: 'rgba(139,92,246,0.25)' },
  new_member: { bg: 'rgba(148,163,184,0.08)', color: '#94a3b8', label: 'Yeni Üye', border: 'rgba(148,163,184,0.15)' },
  member: { bg: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', label: 'Üye', border: 'rgba(255,255,255,0.08)' },
}

function RoleBadge({ user }: { user: UserRow }) {
  let roleKey = user.role ?? 'member'
  if (roleKey === 'member') {
    if ((user.xp ?? 0) > 1000) {
      roleKey = 'elite'
    } else {
      roleKey = 'new_member'
    }
  }
  const s = ROLE_STYLES[roleKey] ?? ROLE_STYLES.member
  return (
    <span
      className="text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-wider select-none"
      style={{ background: s.bg, color: s.color, borderColor: s.border }}
    >
      {s.label}
    </span>
  )
}

function getOnlineStatus(user: UserRow) {
  if (user.show_status === false || !user.last_seen_at) {
    return { label: 'Çevrimdışı', colorClass: 'bg-slate-500/80' }
  }
  const lastSeen = new Date(user.last_seen_at)
  const now = new Date()
  const diffMins = Math.floor((now.getTime() - lastSeen.getTime()) / 60000)

  if (diffMins < 3) {
    return { label: 'Çevrimiçi', colorClass: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' }
  } else if (diffMins < 10) {
    return { label: 'Boşta', colorClass: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' }
  }
  return { label: 'Çevrimdışı', colorClass: 'bg-slate-500/80' }
}

function WarnCircles({ count }: { count: number }) {
  const c = Math.max(0, count)
  return (
    <div className="flex items-center gap-1.5">
      {[0, 1, 2].map((idx) => {
        let bgClass = 'bg-white/10'
        if (c === 1 && idx === 0) {
          bgClass = 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
        } else if (c === 2 && idx < 2) {
          bgClass = 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
        } else if (c >= 3) {
          bgClass = 'bg-rose-500 shadow-[0_0_10px_rgba(239,68,68,0.7)]'
        }
        return (
          <div
            key={idx}
            className={`w-2 h-2 rounded-full ${bgClass} transition-colors duration-300`}
          />
        )
      })}
    </div>
  )
}

function UserAvatar({ user }: { user: UserRow }) {
  const initials = [user.first_name?.[0], user.last_name?.[0]].filter(Boolean).join('').toUpperCase()
    || user.username.slice(0, 2).toUpperCase()
  return (
    <div
      className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black text-white flex-shrink-0 overflow-hidden shadow-inner border border-white/5"
      style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
    >
      {user.avatar_url ? (
        <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
      ) : initials}
    </div>
  )
}

export function HQUserTable({
  initialUsers,
  initialTotal,
  currentUserRole = 'member',
}: {
  initialUsers: UserRow[]
  initialTotal: number
  currentUserRole?: string
}) {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [users, setUsers] = useState(initialUsers)
  const [total, setTotal] = useState(initialTotal)
  
  const [isPending, startTransition] = useTransition()
  const [actionMsg, setActionMsg] = useState<{ id: string; msg: string } | null>(null)

  // Modals state
  const [warnModalUser, setWarnModalUser] = useState<UserRow | null>(null)
  const [warnReason, setWarnReason] = useState('')
  const [isWarningPending, startWarnTransition] = useTransition()

  const [deleteConfirmUser, setDeleteConfirmUser] = useState<UserRow | null>(null)
  const [isDeletePending, startDeleteTransition] = useTransition()

  async function handleSearch(q: string, role: string) {
    const data = await getHQUsers({ search: q, role })
    setUsers(data.users as any)
    setTotal(data.total)
  }

  function onSearch(val: string) {
    setSearch(val)
    startTransition(() => handleSearch(val, roleFilter))
  }

  function onRoleFilter(val: string) {
    setRoleFilter(val)
    startTransition(() => handleSearch(search, val))
  }

  async function handleRoleUpdate(userId: string, newRole: string, username: string) {
    const result = await updateUserRole(userId, newRole)
    if (result.error) {
      setActionMsg({ id: userId, msg: `Hata: ${result.error}` })
    } else {
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)))
      setActionMsg({ id: userId, msg: `@${username} rolü ${newRole === 'moderator' ? 'Moderatör' : 'Üye'} yapıldı` })
    }
    setTimeout(() => setActionMsg(null), 3000)
  }

  async function submitWarning() {
    if (!warnModalUser || !warnReason.trim()) return
    startWarnTransition(async () => {
      const res = await warnUser(warnModalUser.id, warnReason.trim())
      if (res.error) {
        setActionMsg({ id: warnModalUser.id, msg: `Hata: ${res.error}` })
      } else {
        setUsers((prev) =>
          prev.map((u) => (u.id === warnModalUser.id ? { ...u, warns: (u.warns ?? 0) + 1 } : u))
        )
        setActionMsg({ id: warnModalUser.id, msg: `@${warnModalUser.username} başarıyla uyarıldı` })
      }
      setWarnModalUser(null)
      setWarnReason('')
      setTimeout(() => setActionMsg(null), 3000)
    })
  }

  async function submitDeleteUser() {
    if (!deleteConfirmUser) return
    startDeleteTransition(async () => {
      const res = await deleteUserProfile(deleteConfirmUser.id)
      if (res.error) {
        setActionMsg({ id: deleteConfirmUser.id, msg: `Hata: ${res.error}` })
      } else {
        setUsers((prev) => prev.filter((u) => u.id !== deleteConfirmUser.id))
        setTotal((t) => t - 1)
        setActionMsg({ id: deleteConfirmUser.id, msg: `@${deleteConfirmUser.username} başarıyla silindi` })
      }
      setDeleteConfirmUser(null)
      setTimeout(() => setActionMsg(null), 3000)
    })
  }

  async function handleToggleVerification(userId: string, field: 'verified' | 'gold', username: string) {
    const result = await toggleProfileVerification(userId, field)
    if (result.error) {
      setActionMsg({ id: userId, msg: `Hata: ${result.error}` })
    } else {
      setUsers((prev) =>
        prev.map((u) => {
          if (u.id === userId) {
            return {
              ...u,
              is_verified: field === 'verified' ? !u.is_verified : u.is_verified,
              is_gold: field === 'gold' ? !u.is_gold : u.is_gold,
            }
          }
          return u
        })
      )
      const fieldName = field === 'verified' ? 'Mavi Tik' : 'Sarı Tik'
      setActionMsg({ id: userId, msg: `@${username} için ${fieldName} güncellendi` })
    }
    setTimeout(() => setActionMsg(null), 3000)
  }

  const roleOptions = [
    { value: '', label: 'Tüm Roller' },
    { value: 'founder', label: 'Kurucu' },
    { value: 'admin', label: 'Yönetici' },
    { value: 'moderator', label: 'Moderatör' },
    { value: 'member', label: 'Üye' },
  ]

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div
          className="flex-1 flex items-center gap-2 rounded-xl px-3.5 py-2.5 bg-[#0e0e1b] border border-white/5 focus-within:border-primary/45 transition-colors"
        >
          <Search size={14} className="text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Kullanıcı adı ara... (Örn: @melih)"
            className="flex-1 bg-transparent text-xs text-white outline-none placeholder:text-slate-500"
          />
          {isPending && <RefreshCw size={12} className="animate-spin text-slate-500" />}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
          {roleOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onRoleFilter(opt.value)}
              className="px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap"
              style={{
                background: roleFilter === opt.value ? 'rgba(124,58,237,0.18)' : 'rgba(255,255,255,0.03)',
                color: roleFilter === opt.value ? '#a78bfa' : 'rgba(255,255,255,0.4)',
                border: `1px solid ${roleFilter === opt.value ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.06)'}`,
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Action message toast */}
      <AnimatePresence>
        {actionMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
          >
            ✓ {actionMsg.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table Container - Responsive Horizontal Scroll */}
      <div
        className="rounded-2xl border border-white/5 bg-[#090912]/80 backdrop-blur-md overflow-x-auto"
      >
        <div className="min-w-[950px]">
          {/* Header Row */}
          <div
            className="grid px-5 py-3.5 text-[10px] font-black uppercase tracking-widest border-b border-white/5 text-slate-400 bg-white/[0.01]"
            style={{
              gridTemplateColumns: '2fr 1fr 1fr 1.2fr 0.8fr 0.8fr 180px',
            }}
          >
            <span>Kullanıcı</span>
            <span>Statü</span>
            <span>Rolü</span>
            <span>Katılım Tarihi</span>
            <span>Yazı Adeti</span>
            <span>Uyarılar (Warns)</span>
            <span className="text-right">Hızlı Moderasyon</span>
          </div>

          {/* Rows */}
          <div className="divide-y divide-white/5">
            {users.map((user, i) => {
              const status = getOnlineStatus(user)

              return (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className="grid px-5 py-3.5 items-center hover:bg-white/[0.01] transition-colors"
                  style={{ gridTemplateColumns: '2fr 1fr 1fr 1.2fr 0.8fr 0.8fr 180px' }}
                >
                  {/* User Column */}
                  <div className="flex items-center gap-3 min-w-0">
                    <UserAvatar user={user} />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                        <span>{user.first_name || user.username}</span>
                        {user.is_verified && <span className="text-blue-400 flex-shrink-0" title="Doğrulanmış Hesap">✓</span>}
                        {user.is_gold && <span className="text-amber-400 flex-shrink-0" title="İş Ortağı / Altın Hesap">★</span>}
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5 select-all">
                        <span>@{user.username}</span>
                      </p>
                    </div>
                  </div>

                  {/* Status Column */}
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${status.colorClass}`} />
                    <span className="text-[10px] font-mono font-bold capitalize text-slate-400">{status.label}</span>
                  </div>

                  {/* Role Column */}
                  <div>
                    <RoleBadge user={user} />
                  </div>

                  {/* Join Date Column */}
                  <p className="text-[11px] font-mono text-slate-400">
                    {new Date(user.updated_at).toLocaleDateString('tr-TR', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                  </p>

                  {/* Post Count Column */}
                  <p className="text-xs font-mono font-bold text-white pl-2">{user.postCount}</p>

                  {/* Warnings Column */}
                  <div>
                    <WarnCircles count={user.warns ?? 0} />
                  </div>

                  {/* Actions Column */}
                  <div className="flex items-center justify-end gap-1.5">
                    {/* Warn User Button */}
                    {user.role !== 'founder' && (
                      <button
                        onClick={() => setWarnModalUser(user)}
                        title="Kullanıcıyı Uyar"
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-all bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/20 cursor-pointer"
                      >
                        <AlertTriangle size={12} />
                      </button>
                    )}

                    {/* Mavi Tik (Verification) Toggle */}
                    {['founder', 'admin'].includes(currentUserRole) && user.role !== 'founder' && (
                      <button
                        onClick={() => handleToggleVerification(user.id, 'verified', user.username)}
                        title={user.is_verified ? "Doğrulamayı Kaldır" : "Doğrula (Mavi Tik)"}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all border cursor-pointer ${
                          user.is_verified
                            ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                            : 'bg-white/5 hover:bg-blue-500/10 text-slate-400 hover:text-blue-400 border-white/5 hover:border-blue-500/20'
                        }`}
                      >
                        <Check size={12} />
                      </button>
                    )}

                    {/* Sarı Tik (Gold Partner) Toggle */}
                    {['founder', 'admin'].includes(currentUserRole) && user.role !== 'founder' && (
                      <button
                        onClick={() => handleToggleVerification(user.id, 'gold', user.username)}
                        title={user.is_gold ? "Sarı Tiki Kaldır" : "Sarı Tik Ver"}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all border cursor-pointer ${
                          user.is_gold
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                            : 'bg-white/5 hover:bg-amber-500/10 text-slate-400 hover:text-amber-400 border-white/5 hover:border-amber-500/20'
                        }`}
                      >
                        <Star size={12} className={user.is_gold ? "fill-amber-400" : ""} />
                      </button>
                    )}

                    {/* Moderator Toggle Button */}
                    {['founder', 'admin'].includes(currentUserRole) && ['moderator', 'member'].includes(user.role ?? 'member') && user.role !== 'founder' && (
                      <button
                        onClick={() => handleRoleUpdate(user.id, user.role === 'moderator' ? 'member' : 'moderator', user.username)}
                        title={user.role === 'moderator' ? 'Moderatörlük Yetkisini Al' : 'Moderatör Yap'}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all border cursor-pointer ${
                          user.role === 'moderator'
                            ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/25'
                            : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/25'
                        }`}
                      >
                        {user.role === 'moderator' ? <ShieldOff size={12} /> : <Shield size={12} />}
                      </button>
                    )}

                    {/* Delete Account Button */}
                    {['founder', 'admin'].includes(currentUserRole) && user.role !== 'founder' && (
                      <button
                        onClick={() => setDeleteConfirmUser(user)}
                        title="Kullanıcıyı Kalıcı Olarak Sil"
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-all bg-rose-500/10 hover:bg-rose-500/25 text-rose-500 border border-rose-500/20 cursor-pointer animate-pulse hover:animate-none"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </motion.div>
              )
            })}

            {users.length === 0 && (
              <div className="text-center py-16 text-xs text-slate-500 font-bold bg-[#090912]/40">
                Arama kriterlerine uygun üye bulunamadı.
              </div>
            )}
          </div>
        </div>
      </div>

      <p className="text-[10px] text-right text-slate-500 font-mono select-none">
        Toplam {total.toLocaleString('tr-TR')} üye · Sayfa başına 20 kayıt listeleniyor
      </p>

      {/* Warning Modal */}
      <AnimatePresence>
        {warnModalUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md p-6 rounded-2xl border border-white/5 bg-[#0c0c16]/95 backdrop-blur-md shadow-2xl relative"
            >
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <AlertTriangle className="text-amber-500" size={16} />
                <span>@{warnModalUser.username} Kullanıcısını Uyar</span>
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Kullanıcıya gönderilecek uyarının gerekçesini yazınız. Bu uyarı kullanıcıya anlık bildirim (modal/bildirim) olarak gidecek ve uyarı göstergesi (+1) güncellenecektir.
              </p>
              
              <textarea
                value={warnReason}
                onChange={(e) => setWarnReason(e.target.value)}
                placeholder="Örn: Spam ve aralıksız gönderi paylaşımı yapılması nedeniyle uyarıldınız."
                className="w-full h-24 mt-4 p-3 rounded-xl border border-white/5 bg-background/55 text-xs text-foreground outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/10 transition-all resize-none placeholder:text-slate-600"
              />
              
              <div className="flex gap-2.5 mt-5 justify-end">
                <button
                  onClick={() => {
                    setWarnModalUser(null)
                    setWarnReason('')
                  }}
                  disabled={isWarningPending}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-white/5 transition-all cursor-pointer"
                >
                  İptal
                </button>
                <button
                  onClick={submitWarning}
                  disabled={isWarningPending || !warnReason.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 text-black hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {isWarningPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Gönderiliyor...</span>
                    </>
                  ) : (
                    <span>Uyarı Gönder</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete User Modal */}
      <AnimatePresence>
        {deleteConfirmUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm p-6 rounded-2xl border border-white/5 bg-[#0c0c16]/95 backdrop-blur-md shadow-2xl relative"
            >
              <h3 className="text-sm font-black text-rose-500 flex items-center gap-2">
                <Trash2 size={16} />
                <span>Hesabı Kalıcı Olarak Sil</span>
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                <b>@{deleteConfirmUser.username}</b> kullanıcısının hesabını ve platformdaki tüm paylaşımlarını/verilerini kalıcı olarak silmek üzeresiniz. Bu işlem **geri alınamaz**.
              </p>
              
              <div className="flex gap-2.5 mt-5 justify-end">
                <button
                  onClick={() => setDeleteConfirmUser(null)}
                  disabled={isDeletePending}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-white/5 transition-all cursor-pointer"
                >
                  İptal
                </button>
                <button
                  onClick={submitDeleteUser}
                  disabled={isDeletePending}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {isDeletePending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Siliniyor...</span>
                    </>
                  ) : (
                    <span>Kalıcı Olarak Sil</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
