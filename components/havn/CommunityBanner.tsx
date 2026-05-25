"use client"

import { useState, useTransition, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Users, Lock, Globe, Settings, X, Loader2, ImagePlus, Trash2, Plus, Megaphone } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { updateCommunitySettings } from "@/lib/actions/communities"
import { PendingRequestsList } from "@/components/havn/PendingRequestsList"
import { cn } from "@/lib/utils"
import { parseCommunityDescription, serializeCommunityDescription } from "@/lib/community-rules"

interface CommunityBannerProps {
  community: {
    id: string
    name: string
    description: string
    type: string
    member_count: number
    rules?: any[]
    announcement?: string | null
  }
  isAdmin?: boolean
  initialPendingRequests?: any[]
}

export function CommunityBanner({ community, isAdmin, initialPendingRequests = [] }: CommunityBannerProps) {
  const isPrivate = community.type === "request_to_join"
  const [showSettings, setShowSettings] = useState(false)
  const [version, setVersion] = useState<number | null>(null)

  const searchParams = useSearchParams()
  const showRequestsParam = searchParams ? searchParams.get("showRequests") === "true" : false

  const [requests, setRequests] = useState<any[]>(initialPendingRequests)

  useEffect(() => {
    if (showRequestsParam && isAdmin) {
      setShowSettings(true)
    }
  }, [showRequestsParam, isAdmin])

  useEffect(() => {
    setRequests(initialPendingRequests)
  }, [initialPendingRequests])

  // Dynamic Image fallbacks using state + onError
  const [avatarError, setAvatarError] = useState(false)
  const [bannerError, setBannerError] = useState(false)

  const avatarUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/communities/${community.id}/avatar`
  const bannerUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/communities/${community.id}/banner`

  const avatarSrc = version ? `${avatarUrl}?v=${version}` : avatarUrl
  const bannerSrc = version ? `${bannerUrl}?v=${version}` : bannerUrl

  const pendingCount = requests.length

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="relative overflow-hidden rounded-2xl min-h-[120px] flex items-center"
      style={{
        background: bannerError
          ? "linear-gradient(135deg, var(--havn-gradient-start) 0%, var(--havn-gradient-end) 60%, color-mix(in oklch, var(--havn-gradient-end) 60%, var(--background)) 100%)"
          : "rgba(0,0,0,0.3)",
      }}
    >
      {/* Custom Banner Image */}
      {!bannerError && (
        <img
          src={bannerSrc}
          onError={() => setBannerError(true)}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* Decorative overlay to make text readable */}
      <div className="absolute inset-0 bg-black/35 backdrop-blur-[0.5px]" />

      {/* Decorative mesh pattern */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 50%, white 1px, transparent 1px),
            radial-gradient(circle at 80% 20%, white 1px, transparent 1px),
            radial-gradient(circle at 60% 80%, white 1px, transparent 1px)`,
          backgroundSize: "40px 40px, 60px 60px, 50px 50px",
        }}
      />

      <div className="relative w-full px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Info Left */}
        <div className="flex items-center gap-5">
          {/* Community Icon / Avatar */}
          <div className="relative w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center flex-shrink-0 shadow-lg overflow-hidden">
            {!avatarError ? (
              <img
                src={avatarSrc}
                onError={() => setAvatarError(true)}
                alt={community.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-2xl font-black text-white tracking-tight">
                {community.name.charAt(0)}
              </span>
            )}
          </div>

          {/* Info Text */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h1 className="text-xl font-black text-white tracking-tight drop-shadow-md">
                {community.name}
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-white/20 text-white backdrop-blur-sm">
                {isPrivate ? (
                  <>
                    <Lock size={10} /> Başvurulu
                  </>
                ) : (
                  <>
                    <Globe size={10} /> Herkese Açık
                  </>
                )}
              </span>
            </div>

            {(() => {
              const parsed = parseCommunityDescription(community.description)
              return parsed.description ? (
                <p className="text-xs text-white/80 line-clamp-2 max-w-md mb-2 drop-shadow-sm font-medium">
                  {parsed.description}
                </p>
              ) : null
            })()}

            <div className="flex items-center gap-4 text-white/95 text-xs drop-shadow-sm">
              <span className="flex items-center gap-1.5 font-semibold">
                <Users size={13} />
                <strong className="text-white font-black">
                  {community.member_count.toLocaleString("tr-TR")}
                </strong>{" "}
                üye
              </span>
            </div>
          </div>
        </div>

        {/* Settings button if Admin */}
        {isAdmin && (
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowSettings(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold border border-white/30 backdrop-blur-md transition-all duration-200 flex-shrink-0 self-start sm:self-center cursor-pointer shadow-md relative"
          >
            <Settings size={14} />
            <span>Topluluk Ayarları</span>
            {pendingCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center text-[9px] font-black animate-pulse border border-white/20">
                {pendingCount}
              </span>
            )}
          </motion.button>
        )}
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {showSettings && (
          <EditCommunityModal
            community={community}
            currentAvatar={avatarError ? null : avatarUrl}
            currentBanner={bannerError ? null : bannerUrl}
            onClose={() => setShowSettings(false)}
            pendingRequests={requests}
            setPendingRequests={setRequests}
            initialTab={showRequestsParam ? "requests" : "general"}
            onSave={(newSlug) => {
              setVersion(Date.now())
              setAvatarError(false)
              setBannerError(false)
              setShowSettings(false)
              // If slug changed, redirect to new URL
              if (newSlug && newSlug !== community.name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').slice(0, 50)) {
                window.location.href = `/communities/${newSlug}`
              } else {
                window.location.reload()
              }
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

interface EditModalProps {
  community: {
    id: string
    name: string
    description: string
    type: string
    rules?: any[]
    announcement?: string | null
  }
  currentAvatar: string | null
  currentBanner: string | null
  onClose: () => void
  onSave: (newSlug?: string) => void
  pendingRequests: any[]
  setPendingRequests: React.Dispatch<React.SetStateAction<any[]>>
  initialTab?: "general" | "requests"
}

function EditCommunityModal({ community, currentAvatar, currentBanner, onClose, onSave, pendingRequests, setPendingRequests, initialTab = "general" }: EditModalProps) {
  const [activeTab, setActiveTab] = useState<"general" | "rules" | "requests">(initialTab)
  const [type, setType] = useState(community.type)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Parse Rules & Announcement from raw description as fallback
  const parsedData = useRef(parseCommunityDescription(community.description)).current
  const [descText, setDescText] = useState(parsedData.description)
  const [rules, setRules] = useState<string[]>(
    community.rules && Array.isArray(community.rules)
      ? community.rules
      : parsedData.rules
  )
  const [announcement, setAnnouncement] = useState(
    community.announcement !== undefined && community.announcement !== null
      ? community.announcement
      : (parsedData.announcement || '')
  )
  const [newRule, setNewRule] = useState('')

  // Preview States
  const [avatarPreview, setAvatarPreview] = useState<string | null>(currentAvatar)
  const [bannerPreview, setBannerPreview] = useState<string | null>(currentBanner)

  const avatarInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>, target: "avatar" | "banner") {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    if (target === "avatar") {
      setAvatarPreview(url)
    } else {
      setBannerPreview(url)
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set("type", type)

    // Save description, rules list, and announcement as separate fields
    fd.set("description", descText)
    fd.set("rules", JSON.stringify(rules))
    fd.set("announcement", announcement.trim())

    startTransition(async () => {
      const res = await updateCommunitySettings(community.id, fd)
      if (res.error) {
        setError(res.error)
      } else {
        onSave(res.slug)
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        className="relative z-10 bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-foreground">Topluluk Ayarları</h2>
            <p className="text-[10px] text-muted-foreground">{community.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-all cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tabs switcher */}
        <div className="flex border-b border-border bg-muted/20">
          <button
            type="button"
            onClick={() => setActiveTab("general")}
            className={cn(
              "flex-1 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer",
              activeTab === "general"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Genel Bilgiler
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("rules")}
            className={cn(
              "flex-1 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer",
              activeTab === "rules"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Kurallar & Duyuru
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("requests")}
            className={cn(
              "flex-1 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center justify-center gap-2",
              activeTab === "requests"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <span>Başvurular</span>
            {pendingRequests.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-black">
                {pendingRequests.length}
              </span>
            )}
          </button>
        </div>

        {/* Form Wrap */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          {/* Scrollable Tab Content Container */}
          <div className="p-6 overflow-y-auto max-h-[450px]">
            {activeTab === "general" && (
              <div className="space-y-4">
                {/* Banner Area */}
                <div className="relative h-28 bg-muted rounded-xl flex items-center justify-center overflow-hidden border border-border">
                  {bannerPreview ? (
                    <img src={bannerPreview} alt="Banner" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[11px] text-muted-foreground">Kapak görseli seçilmedi</span>
                  )}
                  <button
                    type="button"
                    onClick={() => bannerInputRef.current?.click()}
                    className="absolute bottom-2 right-2 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white text-[10px] font-semibold backdrop-blur-sm transition-all cursor-pointer"
                  >
                    <ImagePlus size={11} /> Kapak Seç
                  </button>
                </div>

                {/* Avatar upload + Info details */}
                <div className="flex gap-4 items-center">
                  <div className="relative w-16 h-16 rounded-xl bg-muted border border-border overflow-hidden flex items-center justify-center group flex-shrink-0">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-lg font-black text-muted-foreground">{community.name.charAt(0)}</span>
                    )}
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer"
                    >
                      <ImagePlus size={14} />
                    </button>
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-foreground">Topluluk Görseli</h3>
                    <p className="text-[10px] text-muted-foreground">Logoyu değiştirmek için üzerine tıklayın.</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Topluluk Adı</label>
                  <input
                    name="name"
                    required
                    minLength={3}
                    maxLength={50}
                    defaultValue={community.name}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Açıklama</label>
                  <textarea
                    rows={3}
                    maxLength={300}
                    value={descText}
                    onChange={(e) => setDescText(e.target.value)}
                    placeholder="Açıklama girin..."
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Gizlilik Türü</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["public", "request_to_join"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setType(t)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer justify-center",
                          type === t
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/40"
                        )}
                      >
                        {t === "public" ? <Globe size={13} /> : <Lock size={13} />}
                        {t === "public" ? "Herkese Açık" : "Başvurulu"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Hidden File Inputs */}
                <input
                  ref={avatarInputRef}
                  name="avatar"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileChange(e, "avatar")}
                />
                <input
                  ref={bannerInputRef}
                  name="banner"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileChange(e, "banner")}
                />

                {error && <p className="text-xs font-medium text-destructive">{error}</p>}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl text-xs font-semibold border border-border hover:bg-accent text-foreground transition-all cursor-pointer"
                  >
                    İptal
                  </button>
                  <motion.button
                    type="submit"
                    disabled={isPending}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold shadow-lg cursor-pointer"
                    style={{
                      background: "linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))",
                      color: "var(--primary-foreground)",
                    }}
                  >
                    {isPending ? <Loader2 size={12} className="animate-spin" /> : null}
                    Kaydet
                  </motion.button>
                </div>
              </div>
            )}

            {activeTab === "rules" && (
              <div className="space-y-5">
                {/* Rules List Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-foreground">Topluluk Kuralları</h3>
                    <span className="text-[9px] font-bold text-muted-foreground uppercase px-2 py-0.5 rounded-md bg-muted">
                      {rules.length} kural
                    </span>
                  </div>

                  <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
                    {rules.length === 0 ? (
                      <p className="text-xs text-muted-foreground/60 italic py-4 text-center">Henüz özel kural eklenmedi. Standart kurallar geçerli olacaktır.</p>
                    ) : (
                      rules.map((rule, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-card border border-border/80 shadow-sm hover:border-primary/20 transition-all">
                          <div className="flex items-start gap-2.5 min-w-0">
                            <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-px">
                              {idx + 1}
                            </span>
                            <span className="text-xs text-foreground font-medium break-all">{rule}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setRules(prev => prev.filter((_, i) => i !== idx))}
                            className="p-1.5 rounded-lg text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-all cursor-pointer"
                            title="Kuralı Sil"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add Rule Input */}
                  <div className="flex gap-2">
                    <input
                      value={newRule}
                      onChange={(e) => setNewRule(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          if (newRule.trim()) {
                            setRules(prev => [...prev, newRule.trim()])
                            setNewRule('')
                          }
                        }
                      }}
                      placeholder="Yeni kural yazın..."
                      className="flex-1 px-3.5 py-2 rounded-xl border border-border bg-background text-foreground text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/60"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newRule.trim()) {
                          setRules(prev => [...prev, newRule.trim()])
                          setNewRule('')
                        }
                      }}
                      className="px-3 rounded-xl bg-primary/10 hover:bg-primary/15 text-primary text-xs font-bold border border-primary/20 transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Plus size={13} /> Ekle
                    </button>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-border/60" />

                {/* Announcement Section */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Megaphone size={13} className="text-primary" />
                    <h3 className="text-xs font-bold text-foreground">Sabitlenmiş Duyuru</h3>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-normal">
                    Topluluğun en üstünde tüm üyelere gösterilecek bir duyuru yayınlayın. Kaldırmak için metni tamamen silin.
                  </p>
                  <textarea
                    value={announcement}
                    onChange={(e) => setAnnouncement(e.target.value)}
                    placeholder="Duyuru metni yazın (örn: Hoş geldiniz! Bu hafta sonu canlı sohbet etkinliğimiz var.)"
                    rows={3}
                    maxLength={250}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none placeholder:text-muted-foreground/60 leading-relaxed"
                  />
                </div>

                {error && <p className="text-xs font-medium text-destructive">{error}</p>}

                {/* Save Button for rules tab */}
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl text-xs font-semibold border border-border hover:bg-accent text-foreground transition-all cursor-pointer"
                  >
                    İptal
                  </button>
                  <motion.button
                    type="submit"
                    disabled={isPending}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold shadow-lg cursor-pointer"
                    style={{
                      background: "linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))",
                      color: "var(--primary-foreground)",
                    }}
                  >
                    {isPending ? <Loader2 size={12} className="animate-spin" /> : null}
                    Kaydet
                  </motion.button>
                </div>
              </div>
            )}

            {activeTab === "requests" && (
              <div className="space-y-4">
                <PendingRequestsList
                  communityId={community.id}
                  requests={pendingRequests}
                  setRequests={setPendingRequests}
                  minimal={true}
                />
              </div>
            )}
          </div>
        </form>
      </motion.div>
    </div>
  )
}
