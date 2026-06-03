'use client'

import { useState, useTransition, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ShieldAlert, Trash2, Plus, RefreshCw, Loader2, Search, Check, AlertTriangle 
} from 'lucide-react'
import { addBannedWord, removeBannedWord, clearNsfwCache, type BannedWord } from '@/lib/actions/hq-nsfw'
import { useLocale } from '@/lib/i18n/LocaleContext'
import { t } from '@/lib/i18n'

interface HQContentFilterClientProps {
  initialWords: BannedWord[]
}

export function HQContentFilterClient({ initialWords }: HQContentFilterClientProps) {
  const { locale } = useLocale()
  const [words, setWords] = useState<BannedWord[]>(initialWords)
  const [searchQuery, setSearchQuery] = useState('')
  const [newWord, setNewWord] = useState('')
  const [category, setCategory] = useState('nsfw')
  
  const [isPending, startTransition] = useTransition()
  const [isCachePending, startCacheTransition] = useTransition()
  
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // Filter words
  const filteredWords = useMemo(() => {
    if (!searchQuery.trim()) return words
    const query = searchQuery.toLowerCase().trim()
    return words.filter(w => w.word.toLowerCase().includes(query))
  }, [words, searchQuery])

  // Add word
  const handleAddWord = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const wordVal = newWord.trim().toLowerCase()
    
    if (!wordVal) return
    if (wordVal.length < 2) {
      setError(locale === 'tr' ? 'Kelime en az 2 karakter olmalıdır.' : 'Word must be at least 2 characters.')
      return
    }

    if (words.some(w => w.word === wordVal)) {
      setError(locale === 'tr' ? 'Bu kelime zaten listede var.' : 'This word is already in the list.')
      return
    }

    startTransition(async () => {
      const res = await addBannedWord(wordVal, category)
      if (res.error) {
        setError(res.error)
      } else {
        // Optimistic / local update since id is not returned, fetch again or construct local
        const newWordObj: BannedWord = {
          id: Math.random().toString(36).substring(7),
          word: wordVal,
          category,
          created_at: new Date().toISOString(),
          added_by: null
        }
        setWords(prev => [newWordObj, ...prev])
        setNewWord('')
        showToast(locale === 'tr' ? 'Kelime başarıyla eklendi.' : 'Word successfully added.', 'success')
      }
    })
  }

  // Delete word
  const handleDeleteWord = (id: string, wordText: string) => {
    if (confirm(locale === 'tr' ? `"${wordText}" kelimesini silmek istediğinize emin misiniz?` : `Are you sure you want to delete "${wordText}"?`)) {
      startTransition(async () => {
        const res = await removeBannedWord(id)
        if (res.error) {
          showToast(res.error, 'error')
        } else {
          setWords(prev => prev.filter(w => w.id !== id))
          showToast(locale === 'tr' ? 'Kelime başarıyla silindi.' : 'Word successfully deleted.', 'success')
        }
      })
    }
  }

  // Clear cache
  const handleClearCache = () => {
    startCacheTransition(async () => {
      const res = await clearNsfwCache()
      if (res.success) {
        showToast(locale === 'tr' ? 'Sunucu filtresi önbelleği temizlendi!' : 'Server filter cache cleared!', 'success')
      } else {
        showToast(locale === 'tr' ? 'Önbellek temizlenirken hata oluştu.' : 'Failed to clear cache.', 'error')
      }
    })
  }

  return (
    <div className="space-y-6 text-slate-200">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className={`fixed bottom-6 right-6 px-4.5 py-3 rounded-2xl shadow-2xl border text-xs font-bold flex items-center gap-2 backdrop-blur-md z-50 ${
              toast.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-500'
                : 'bg-destructive/10 border-destructive/25 text-destructive'
            }`}
          >
            <span>{toast.type === 'success' ? '✅' : '❌'}</span>
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Form & Actions */}
        <div className="space-y-6 lg:col-span-1">
          <div className="bg-card/45 backdrop-blur-md border border-border/80 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Plus size={16} className="text-violet-400" />
              <span>{t('hq.content_filter.add', locale)}</span>
            </h3>

            <form onSubmit={handleAddWord} className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {t('hq.content_filter.add_placeholder', locale)}
                </label>
                <input
                  type="text"
                  value={newWord}
                  onChange={(e) => setNewWord(e.target.value)}
                  placeholder={locale === 'tr' ? 'Örn: porno' : 'e.g. porn'}
                  className="w-full px-4 py-3 text-xs rounded-xl border border-white/5 bg-slate-950/60 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500/40 font-mono"
                  disabled={isPending}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {t('hq.content_filter.category', locale)}
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-3 text-xs rounded-xl border border-white/5 bg-slate-950/60 text-slate-200 focus:outline-none focus:border-violet-500/40 cursor-pointer"
                  disabled={isPending}
                >
                  <option value="nsfw">NSFW ({locale === 'tr' ? 'Cinsellik/Argo' : 'Sexuality/Slang'})</option>
                  <option value="hate_speech">{locale === 'tr' ? 'Nefret Söylemi' : 'Hate Speech'}</option>
                  <option value="spam">{locale === 'tr' ? 'Spam / Dolandırıcılık' : 'Spam / Fraud'}</option>
                </select>
              </div>

              {error && (
                <div className="p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 border bg-rose-500/10 border-rose-500/20 text-rose-400">
                  <AlertTriangle size={14} className="flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isPending || !newWord.trim()}
                className="w-full py-3 rounded-xl text-xs font-black uppercase bg-violet-600 hover:bg-violet-700 text-white flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
              >
                {isPending ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <>
                    <Plus size={13} />
                    <span>{t('hq.content_filter.add', locale)}</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Cache Control Card */}
          <div className="bg-card/45 backdrop-blur-md border border-border/80 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <RefreshCw size={16} className="text-amber-400" />
              <span>{locale === 'tr' ? 'Önbellek Kontrolü' : 'Cache Control'}</span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {locale === 'tr' 
                ? 'Kelime filtresi performansı korumak için sunucuda önbelleğe alınır. Yeni eklemeler otomatik yenilenir fakat manuel olarak da temizleyebilirsiniz.' 
                : 'Word filter is cached on server to maximize performance. Changes auto-refresh but you can also manually clear the cache.'}
            </p>
            <button
              onClick={handleClearCache}
              disabled={isCachePending}
              className="w-full py-3 rounded-xl text-xs font-black uppercase bg-slate-900 border border-white/5 text-slate-300 hover:bg-slate-950 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
            >
              {isCachePending ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <>
                  <RefreshCw size={13} />
                  <span>{t('hq.content_filter.cache_clear', locale)}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Search & Words Grid */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Search bar */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
              <Search size={14} />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={locale === 'tr' ? 'Yasaklı kelimeler arasında ara...' : 'Search banned words...'}
              className="w-full pl-10 pr-4 py-3 text-xs rounded-xl border border-white/5 bg-slate-900/60 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500/40"
            />
          </div>

          {/* List Card */}
          <div className="bg-card/45 backdrop-blur-md border border-border/80 rounded-2xl p-5 min-h-[400px] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-4">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                {locale === 'tr' ? `Filtrelenenler (${filteredWords.length})` : `Filtered Words (${filteredWords.length})`}
              </span>
            </div>

            {filteredWords.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-500">
                <ShieldAlert size={36} className="text-slate-600 mb-2" />
                <p className="text-xs font-bold">{t('hq.content_filter.empty', locale)}</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2.5 content-start flex-1 overflow-y-auto max-h-[500px] pr-1">
                <AnimatePresence>
                  {filteredWords.map((w) => {
                    const categoryColors: Record<string, string> = {
                      nsfw: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
                      hate_speech: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
                      spam: 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                    }
                    
                    return (
                      <motion.div
                        key={w.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        layout
                        className={`flex items-center gap-2 pl-3.5 pr-2 py-1.5 rounded-xl border text-xs font-mono font-semibold ${
                          categoryColors[w.category] || 'bg-slate-500/10 border-white/5 text-slate-300'
                        }`}
                      >
                        <span>{w.word}</span>
                        <span className="text-[8px] opacity-60 uppercase tracking-wider">
                          ({w.category === 'nsfw' ? 'nsfw' : w.category === 'hate_speech' ? (locale === 'tr' ? 'nefret söylemi' : 'hate speech') : (locale === 'tr' ? 'spam' : 'spam')})
                        </span>
                        <button
                          onClick={() => handleDeleteWord(w.id, w.word)}
                          className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer ml-1"
                          title={t('hq.content_filter.delete', locale)}
                        >
                          <Trash2 size={11} />
                        </button>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
