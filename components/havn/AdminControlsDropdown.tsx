'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { toggleProfileVerification, adminUpdateProfile } from '@/lib/actions/profile'
import { BadgeCheck, Loader2, Shield, Settings, User, Image, RefreshCw, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface AdminControlsDropdownProps {
  targetProfile: {
    id: string
    username: string
    first_name: string | null
    last_name: string | null
    bio: string | null
    avatar_url: string | null
    banner_url: string | null
    is_verified?: boolean
    is_gold?: boolean
  }
}

export function AdminControlsDropdown({ targetProfile }: AdminControlsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [isPending, startTransition] = useTransition()
  
  // Verification states
  const [isVerified, setIsVerified] = useState(targetProfile.is_verified ?? false)
  const [isGold, setIsGold] = useState(targetProfile.is_gold ?? false)

  // Edit Modal form states
  const [usernameInput, setUsernameInput] = useState(targetProfile.username)
  const [firstNameInput, setFirstNameInput] = useState(targetProfile.first_name ?? '')
  const [lastNameInput, setLastNameInput] = useState(targetProfile.last_name ?? '')
  const [bioInput, setBioInput] = useState(targetProfile.bio ?? '')
  const [resetAvatar, setResetAvatar] = useState(false)
  const [resetBanner, setResetBanner] = useState(false)
  
  const [error, setError] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Sync state if profile changes
  useEffect(() => {
    setIsVerified(targetProfile.is_verified ?? false)
    setIsGold(targetProfile.is_gold ?? false)
  }, [targetProfile])

  // Click outside handler to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleToggleVerification = (type: 'verified' | 'gold') => {
    setError(null)
    startTransition(async () => {
      const res = await toggleProfileVerification(targetProfile.id, type)
      if (res.error) {
        setError(res.error)
      } else if (res.success) {
        if (type === 'verified') {
          setIsVerified(res.is_verified ?? false)
        } else if (type === 'gold') {
          setIsGold(res.is_gold ?? false)
        }
      }
    })
  }

  const handleAdminUpdate = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const res = await adminUpdateProfile(targetProfile.id, {
        username: usernameInput,
        first_name: firstNameInput.trim() || null,
        last_name: lastNameInput.trim() || null,
        bio: bioInput.trim() || null,
        resetAvatar,
        resetBanner
      })

      if (res.error) {
        setError(res.error)
      } else {
        setShowEditModal(false)
        setIsOpen(false)
        // Reset flags
        setResetAvatar(false)
        setResetBanner(false)
      }
    })
  }

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border bg-card/60 hover:bg-accent hover:border-primary/40 text-xs font-bold text-foreground transition-all duration-200 active:scale-95 cursor-pointer shadow-sm select-none"
      >
        <Shield size={14} className="text-amber-500 fill-amber-500/10" />
        <span>Yönetici Kontrolleri</span>
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2.5 w-60 z-30 bg-card/98 border border-border rounded-2xl shadow-2xl p-2 flex flex-col gap-1 backdrop-blur-xl"
            style={{
              boxShadow: "0 10px 30px -10px rgba(0, 0, 0, 0.4), 0 1px 3px rgba(0, 0, 0, 0.1)"
            }}
          >
            <div className="text-[9px] font-black text-muted-foreground uppercase px-2.5 py-1.5 tracking-wider border-b border-border/40 select-none">
              YÖNETİM ARAÇLARI
            </div>

            {/* Mavi Tik Toggle Option */}
            <button
              onClick={() => handleToggleVerification('verified')}
              disabled={isPending}
              className="flex items-center justify-between px-2.5 py-2 rounded-xl hover:bg-accent/70 text-left text-xs font-bold transition-all cursor-pointer w-full"
            >
              <div className="flex items-center gap-2">
                <BadgeCheck size={14} className={cn(isVerified ? "fill-[#0ea5e9] text-card" : "text-muted-foreground")} />
                <span>Mavi Tik (Doğrulama)</span>
              </div>
              {isPending ? (
                <Loader2 size={12} className="animate-spin text-muted-foreground" />
              ) : (
                <div className={cn(
                  "w-7 h-4 rounded-full p-0.5 transition-colors duration-200",
                  isVerified ? "bg-[#0ea5e9]" : "bg-muted"
                )}>
                  <div className={cn(
                    "w-3 h-3 rounded-full bg-white transition-transform duration-200",
                    isVerified ? "translate-x-3" : "translate-x-0"
                  )} />
                </div>
              )}
            </button>

            {/* Sarı Tik Toggle Option */}
            <button
              onClick={() => handleToggleVerification('gold')}
              disabled={isPending}
              className="flex items-center justify-between px-2.5 py-2 rounded-xl hover:bg-accent/70 text-left text-xs font-bold transition-all cursor-pointer w-full"
            >
              <div className="flex items-center gap-2">
                <BadgeCheck size={14} className={cn(isGold ? "fill-[#eab308] text-card" : "text-muted-foreground")} />
                <span>Sarı Tik (İş Ortağı)</span>
              </div>
              {isPending ? (
                <Loader2 size={12} className="animate-spin text-muted-foreground" />
              ) : (
                <div className={cn(
                  "w-7 h-4 rounded-full p-0.5 transition-colors duration-200",
                  isGold ? "bg-[#eab308]" : "bg-muted"
                )}>
                  <div className={cn(
                    "w-3 h-3 rounded-full bg-white transition-transform duration-200",
                    isGold ? "translate-x-3" : "translate-x-0"
                  )} />
                </div>
              )}
            </button>

            <div className="border-t border-border/40 my-1" />

            {/* Edit Profile Option */}
            <button
              onClick={() => {
                setShowEditModal(true)
                setIsOpen(false)
              }}
              className="flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-accent/70 text-left text-xs font-bold transition-all text-foreground cursor-pointer w-full"
            >
              <Settings size={14} className="text-muted-foreground" />
              <span>Profili Düzenle (Admin)</span>
            </button>
            
            {error && (
              <div className="text-[9px] font-semibold text-red-500 p-2 border-t border-border/30 mt-1 select-none">
                {error}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEditModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md bg-card border border-border rounded-3xl shadow-2xl overflow-hidden p-6 flex flex-col gap-4 text-left"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <div className="flex items-center gap-2">
                  <Shield size={16} className="text-amber-500 fill-amber-500/10" />
                  <h3 className="font-black text-sm text-foreground uppercase tracking-wide">PROFİLİ DÜZENLE (ADMIN)</h3>
                </div>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-1 rounded-lg hover:bg-accent transition-all text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleAdminUpdate} className="flex flex-col gap-4">
                {/* Names */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">İsim</label>
                    <input
                      type="text"
                      value={firstNameInput}
                      onChange={(e) => setFirstNameInput(e.target.value)}
                      placeholder="Girilmemiş"
                      className="bg-accent/40 border border-border/60 rounded-xl px-3 py-2 text-xs font-bold text-foreground focus:outline-none focus:border-primary/60"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Soyisim</label>
                    <input
                      type="text"
                      value={lastNameInput}
                      onChange={(e) => setLastNameInput(e.target.value)}
                      placeholder="Girilmemiş"
                      className="bg-accent/40 border border-border/60 rounded-xl px-3 py-2 text-xs font-bold text-foreground focus:outline-none focus:border-primary/60"
                    />
                  </div>
                </div>

                {/* Username */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Kullanıcı Adı</label>
                  <input
                    type="text"
                    required
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    className="bg-accent/40 border border-border/60 rounded-xl px-3 py-2 text-xs font-bold text-foreground focus:outline-none focus:border-primary/60"
                  />
                </div>

                {/* Bio */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Biyografi</label>
                  <textarea
                    value={bioInput}
                    onChange={(e) => setBioInput(e.target.value)}
                    placeholder="Biyografi girilmemiş..."
                    rows={3}
                    className="bg-accent/40 border border-border/60 rounded-xl px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:border-primary/60 resize-none"
                  />
                </div>

                {/* Media Actions */}
                <div className="flex flex-col gap-2 border-t border-border/40 pt-3 select-none">
                  <span className="text-[10px] font-black uppercase text-muted-foreground tracking-wider mb-1">Medya Ayarları</span>
                  
                  <div className="grid grid-cols-2 gap-2">
                    {/* Reset Avatar */}
                    <button
                      type="button"
                      onClick={() => setResetAvatar(!resetAvatar)}
                      className={cn(
                        "flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border text-[10px] font-black uppercase transition-all duration-200 cursor-pointer active:scale-95",
                        resetAvatar
                          ? "bg-red-500/10 border-red-500/30 text-red-500"
                          : "border-border/60 text-muted-foreground hover:bg-accent/40"
                      )}
                    >
                      <User size={12} />
                      <span>Avatarı Sıfırla</span>
                    </button>

                    {/* Reset Banner */}
                    <button
                      type="button"
                      onClick={() => setResetBanner(!resetBanner)}
                      className={cn(
                        "flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border text-[10px] font-black uppercase transition-all duration-200 cursor-pointer active:scale-95",
                        resetBanner
                          ? "bg-red-500/10 border-red-500/30 text-red-500"
                          : "border-border/60 text-muted-foreground hover:bg-accent/40"
                      )}
                    >
                      <Image size={12} />
                      <span>Kapağı Sıfırla</span>
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="text-[10px] font-semibold text-red-500 text-center select-none bg-red-500/5 border border-red-500/10 rounded-xl p-2">
                    {error}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2 border-t border-border/40 pt-4 mt-1">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 rounded-xl border border-border hover:bg-accent text-xs font-bold text-foreground transition-all cursor-pointer select-none"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary/95 text-xs font-bold text-primary-foreground transition-all cursor-pointer disabled:opacity-50 select-none shadow-sm"
                  >
                    {isPending ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <RefreshCw size={13} />
                    )}
                    <span>Değişiklikleri Kaydet</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
