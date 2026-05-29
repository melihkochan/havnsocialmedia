'use client'

import { useState, useTransition, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users,
  Globe,
  Lock,
  Search,
  Plus,
  Trash2,
  Check,
  Loader2,
  Megaphone,
  Crown,
  Settings,
  AlertCircle
} from 'lucide-react'
import { updateCommunitySettings } from '@/lib/actions/communities'
import { cn } from '@/lib/utils'

type Community = {
  id: string
  name: string
  slug: string
  description: string | null
  type: 'public' | 'request_to_join'
  rules?: any[]
  announcement?: string | null
  accent_color?: string | null
  created_by: string
  created_at: string
  memberCount: number
  creator?: {
    id: string
    username: string
    first_name: string | null
    last_name: string | null
    avatar_url: string | null
  } | null
}

const COLOR_PRESETS = [
  { name: 'default', color: 'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))', label: 'Varsayılan' },
  { name: '#0284c7', color: '#0284c7', label: 'Mavi' },
  { name: '#059669', color: '#059669', label: 'Yeşil' },
  { name: '#d97706', color: '#d97706', label: 'Altın' },
  { name: '#e11d48', color: '#e11d48', label: 'Gül' },
  { name: '#4f46e5', color: '#4f46e5', label: 'İndigo' },
  { name: '#ea580c', color: '#ea580c', label: 'Turuncu' },
  { name: '#0891b2', color: '#0891b2', label: 'Cyan' },
]

export function HQCommunitiesManagement({
  initialCommunities
}: {
  initialCommunities: Community[]
}) {
  const [communities, setCommunities] = useState<Community[]>(initialCommunities)
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(
    initialCommunities.length > 0 ? initialCommunities[0].id : null
  )

  const [selectedType, setSelectedType] = useState<'public' | 'request_to_join'>('public')
  const [selectedAccent, setSelectedAccent] = useState<string>('default')
  const [rules, setRules] = useState<string[]>([])
  const [newRule, setNewRule] = useState('')
  const [announcement, setAnnouncement] = useState('')
  
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const selectedCommunity = communities.find(c => c.id === selectedId)

  // Sync state when selected community changes
  useEffect(() => {
    if (selectedCommunity) {
      setSelectedType(selectedCommunity.type)
      setSelectedAccent(selectedCommunity.accent_color || 'default')
      setRules(
        Array.isArray(selectedCommunity.rules)
          ? selectedCommunity.rules
          : []
      )
      setAnnouncement(selectedCommunity.announcement || '')
      setFeedback(null)
    }
  }, [selectedId, selectedCommunity])

  const filtered = communities.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.slug.toLowerCase().includes(search.toLowerCase())
  )

  const handleSave = async () => {
    if (!selectedCommunity) return
    setFeedback(null)
    startTransition(async () => {
      const fd = new FormData()
      fd.set('name', selectedCommunity.name)
      fd.set('description', selectedCommunity.description || '')
      fd.set('type', selectedType)
      fd.set('rules', JSON.stringify(rules))
      fd.set('announcement', announcement.trim())
      fd.set('accent_color', selectedAccent)

      const res = await updateCommunitySettings(selectedCommunity.id, fd)
      if (res.error) {
        setFeedback({ type: 'error', text: `Hata: ${res.error}` })
      } else {
        setFeedback({ type: 'success', text: 'Topluluk ayarları başarıyla güncellendi.' })
        // Update local state
        setCommunities(prev => prev.map(c => c.id === selectedCommunity.id ? {
          ...c,
          type: selectedType,
          rules,
          announcement: announcement.trim() || null,
          accent_color: selectedAccent === 'default' ? null : selectedAccent
        } : c))
      }
    })
  }

  const handleAddRule = () => {
    if (newRule.trim()) {
      setRules(prev => [...prev, newRule.trim()])
      setNewRule('')
    }
  }

  const handleRemoveRule = (idx: number) => {
    setRules(prev => prev.filter((_, i) => i !== idx))
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      {/* Left Sidebar: Communities List */}
      <div className="rounded-2xl border border-white/5 bg-[#090912]/80 backdrop-blur-md p-4 space-y-4 flex flex-col h-[650px] lg:col-span-1 min-w-0">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <h3 className="text-xs font-black text-white uppercase tracking-widest">AKTİF TOPLULUKLAR</h3>
          <span className="text-[9px] font-bold text-slate-500 font-mono uppercase bg-white/5 px-2 py-0.5 rounded">
            {communities.length} adet
          </span>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 rounded-xl px-3 py-2 bg-[#0e0e1b] border border-white/5 focus-within:border-primary/45 transition-colors">
          <Search size={13} className="text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Topluluk ara..."
            className="flex-1 bg-transparent text-xs text-white outline-none placeholder:text-slate-600"
          />
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {filtered.map((c) => {
            const isSelected = c.id === selectedId
            const initials = c.name.charAt(0).toUpperCase()
            
            return (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={cn(
                  "w-full text-left p-3 rounded-xl border flex items-center gap-3 transition-all cursor-pointer",
                  isSelected
                    ? "bg-primary/10 border-primary/30 text-white"
                    : "bg-white/[0.01] border-white/5 hover:bg-white/[0.02] text-slate-400 hover:text-white"
                )}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm text-white flex-shrink-0 shadow-inner"
                  style={{
                    background: c.accent_color && c.accent_color !== 'default'
                      ? c.accent_color
                      : `linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))`
                  }}
                >
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold truncate block">{c.name}</span>
                    <span className="text-[8px] font-bold uppercase tracking-wider text-slate-500">
                      {c.type === 'public' ? 'Açık' : 'Özel'}
                    </span>
                  </div>
                  <p className="text-[9px] text-slate-500 font-mono mt-0.5 truncate flex items-center gap-1.5">
                    <span>{c.memberCount.toLocaleString('tr-TR')} üye</span>
                    {c.creator && (
                      <>
                        <span>•</span>
                        <span className="text-amber-500/80 font-bold flex items-center gap-0.5">
                          <Crown size={8} className="fill-amber-500/10" />
                          @{c.creator.username}
                        </span>
                      </>
                    )}
                  </p>
                </div>
              </button>
            )
          })}
          {filtered.length === 0 && (
            <p className="text-center text-xs text-slate-600 font-bold py-12">Aranan kriterde topluluk bulunamadı.</p>
          )}
        </div>
      </div>

      {/* Right Column: Settings Panel */}
      <div className="lg:col-span-2 min-w-0">
        <AnimatePresence mode="wait">
          {selectedCommunity ? (
            <motion.div
              key={selectedCommunity.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="rounded-2xl border border-white/5 bg-[#090912]/80 backdrop-blur-md p-6 space-y-6"
            >
              {/* Settings Header */}
              <div className="border-b border-white/5 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <Settings className="text-primary w-4 h-4" />
                    <span>{selectedCommunity.name.toUpperCase()} AYARLARI</span>
                  </h3>
                  <p className="text-[10px] text-slate-500 font-mono mt-1 leading-normal select-all">
                    Kurucu ID: {selectedCommunity.created_by} · slug: /{selectedCommunity.slug}
                  </p>
                </div>
                {selectedCommunity.creator && (
                  <div className="flex items-center gap-2 bg-white/[0.02] border border-white/5 px-3 py-1.5 rounded-xl flex-shrink-0 self-start sm:self-center">
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 flex items-center justify-center text-[9px] font-black text-white uppercase select-none">
                      {selectedCommunity.creator.username.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-white truncate">
                        {selectedCommunity.creator.first_name || selectedCommunity.creator.username}
                      </p>
                      <p className="text-[8px] text-slate-500 font-mono">@{selectedCommunity.creator.username}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Feedback toast */}
              {feedback && (
                <div className={cn(
                  "p-3.5 rounded-xl text-xs font-bold border flex items-center gap-2",
                  feedback.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                )}>
                  {feedback.type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
                  <span>{feedback.text}</span>
                </div>
              )}

              {/* Form Settings List */}
              <div className="space-y-6">
                {/* TOPLULUK TÜRÜ */}
                <div className="space-y-2">
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400">Topluluk Türü</h4>
                  <p className="text-[10px] text-slate-500 leading-normal">
                    Kullanıcıların bu topluluğa serbestçe katılıp katılamayacağını veya başvuru kuyruğuna girip girmeyeceğini seçin.
                  </p>
                  
                  <div className="grid grid-cols-2 gap-3 max-w-sm pt-1">
                    <button
                      onClick={() => setSelectedType('public')}
                      className={cn(
                        "py-2.5 rounded-xl text-xs font-black uppercase tracking-wider border cursor-pointer transition-all flex items-center justify-center gap-1.5",
                        selectedType === 'public'
                          ? "bg-primary/20 text-primary border-primary/30"
                          : "bg-white/5 text-slate-400 border-white/5 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      <Globe size={12} />
                      <span>Açık (Herkese)</span>
                    </button>
                    <button
                      onClick={() => setSelectedType('request_to_join')}
                      className={cn(
                        "py-2.5 rounded-xl text-xs font-black uppercase tracking-wider border cursor-pointer transition-all flex items-center justify-center gap-1.5",
                        selectedType === 'request_to_join'
                          ? "bg-primary/20 text-primary border-primary/30"
                          : "bg-white/5 text-slate-400 border-white/5 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      <Lock size={12} />
                      <span>Başvurulu (Özel)</span>
                    </button>
                  </div>
                </div>

                {/* ACCENT COLOR SELECTOR */}
                <div className="space-y-2">
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400">Topluluk Tema Rengi (Accent)</h4>
                  <p className="text-[10px] text-slate-500 leading-normal">
                    Topluluk içi butonlar, başlıklar ve arka plan gradyanında bu tema rengi devralınacaktır.
                  </p>

                  <div className="flex flex-wrap gap-2.5 pt-1">
                    {COLOR_PRESETS.map((preset) => {
                      const isSel = selectedAccent === preset.name
                      return (
                        <button
                          key={preset.name}
                          onClick={() => setSelectedAccent(preset.name)}
                          className={cn(
                            "w-8 h-8 rounded-full cursor-pointer transition-all flex items-center justify-center relative shadow ring-offset-background",
                            isSel ? "ring-2 ring-primary scale-110" : "hover:scale-105 border border-white/10"
                          )}
                          style={{ background: preset.color }}
                          title={preset.label}
                        >
                          {isSel && (
                            <span className="text-[10px] text-white font-black drop-shadow-md">✓</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* ACTIVE RULES LIST */}
                <div className="space-y-3">
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400">Aktif Kurallar Listesi</h4>
                  
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {rules.length === 0 ? (
                      <p className="text-xs text-slate-500/60 italic py-4">Bu topluluğa eklenmiş herhangi bir özel kural bulunmamaktadır.</p>
                    ) : (
                      rules.map((rule, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between gap-3 p-3 rounded-xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.02] hover:border-white/10 transition-all"
                        >
                          <div className="flex items-start gap-2.5 min-w-0">
                            <span className="w-5 h-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-px">
                              {idx + 1}
                            </span>
                            <span className="text-xs text-slate-300 font-medium break-all">{rule}</span>
                          </div>
                          
                          <button
                            onClick={() => handleRemoveRule(idx)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer flex-shrink-0"
                            title="Kuralı Sil"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add rule input box */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newRule}
                      onChange={(e) => setNewRule(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddRule()
                        }
                      }}
                      placeholder="Yeni kural başlığı yazın..."
                      className="flex-1 px-4 py-2.5 rounded-xl border border-white/5 bg-background/55 text-xs text-white outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/10 transition-all placeholder:text-slate-700"
                    />
                    <button
                      onClick={handleAddRule}
                      className="px-4 rounded-xl text-xs font-black uppercase tracking-wider bg-white/5 hover:bg-white/10 text-white border border-white/5 transition-all cursor-pointer flex items-center gap-1"
                    >
                      <Plus size={13} />
                      <span>Ekle</span>
                    </button>
                  </div>
                </div>

                {/* SABİTLENEN GENEL DUYURU */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Megaphone size={12} className="text-primary" />
                    <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400">Sabitlenen Genel Duyuru</h4>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-normal">
                    Topluluk akışının en tepesinde sabit olarak gösterilecek duyuru metnini yazın. Devre dışı bırakmak için kutuyu boş bırakın.
                  </p>
                  
                  <textarea
                    value={announcement}
                    onChange={(e) => setAnnouncement(e.target.value)}
                    placeholder="Duyuru metnini buraya yazın (Örn: Accent-color uyumu buttery-smooth test ediliyor.)"
                    rows={3}
                    maxLength={300}
                    className="w-full px-4 py-3 rounded-xl border border-white/5 bg-background/55 text-xs text-white outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/10 transition-all resize-none placeholder:text-slate-700 leading-relaxed"
                  />
                </div>

                {/* Save button */}
                <div className="pt-2 border-t border-white/5 flex justify-end">
                  <button
                    onClick={handleSave}
                    disabled={isPending}
                    className="px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-primary text-white hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-primary/10"
                  >
                    {isPending ? <Loader2 size={13} className="animate-spin" /> : null}
                    <span>Topluluk Ayarlarını Güncelle (Kaydet)</span>
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="rounded-2xl border border-white/5 bg-[#090912]/80 backdrop-blur-md p-16 text-center flex flex-col items-center justify-center gap-3">
              <Settings size={28} className="text-slate-600 animate-spin-slow" />
              <h4 className="text-sm font-bold text-white">Yönetilecek Topluluk Seçin</h4>
              <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                Ayarlarını, accent rengini, kurallarını ve duyurularını düzenlemek için soldaki listeden bir topluluk seçin.
              </p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
