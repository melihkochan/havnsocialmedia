'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, ImagePlus, X, Loader2, ChevronDown, Users, User, Film } from 'lucide-react'
import { EmojiPickerButton } from '@/components/havn/EmojiPickerButton'
import { RichTextEditor } from '@/components/havn/RichTextEditor'
import { ImageUpload } from '@/components/havn/ImageUpload'
import { createPost } from '@/lib/actions/posts'
import { cn } from '@/lib/utils'

interface Community {
  id: string
  name: string
}

interface FeedPostFormProps {
  communities: Community[]
  currentUser: { username: string; avatar_url: string | null }
  defaultCommunityId?: string
}

function Avatar({ username, avatarUrl }: { username: string; avatarUrl: string | null }) {
  if (avatarUrl) {
    return <img src={avatarUrl} alt={username} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
  }
  return (
    <div
      className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
      style={{
        background: 'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))',
        color: 'var(--primary-foreground)',
      }}
    >
      {username.slice(0, 2).toUpperCase()}
    </div>
  )
}

// 'personal' = kişisel profil postu, community id = topluluk postu
type PostTarget = 'personal' | string

export function FeedPostForm({ communities, currentUser, defaultCommunityId }: FeedPostFormProps) {
  const router = useRouter()
  const [content, setContent] = useState('')
  const [focused, setFocused] = useState(false)
  const [target, setTarget] = useState<PostTarget>(defaultCommunityId || 'personal')

  useEffect(() => {
    if (defaultCommunityId) {
      setTarget(defaultCommunityId)
    } else {
      setTarget('personal')
    }
  }, [defaultCommunityId])
  const [showPicker, setShowPicker] = useState(false)
  const [showImageUpload, setShowImageUpload] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const editorRef = useRef<any>(null)

  function insertEmoji(emoji: string) {
    if (editorRef.current) {
      editorRef.current.chain().focus().insertContent(emoji).run()
    } else {
      setContent(prev => prev + emoji)
    }
  }

  const selectedCommunity = target !== 'personal' ? communities.find(c => c.id === target) : null
  const targetLabel = target === 'personal' ? 'Profilim' : (selectedCommunity?.name ?? 'Seç')
  const TargetIcon = target === 'personal' ? User : Users

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const hasText = !!content.replace(/<[^>]*>/g, '').trim()
    if (!hasText && !imageFile) return
    setLoading(true)
    setError(null)

    const formData = new FormData()
    const postContent = content
    formData.set('content', postContent)
    if (target !== 'personal') {
      formData.set('communityId', target)
    }
    // If personal, don't set communityId — createPost will handle null
    if (imageFile) formData.set('image', imageFile)

    const result = await createPost(formData)
    if (result?.error) {
      setError(result.error)
    } else {
      setContent('')
      setImageFile(null)
      setShowImageUpload(false)
      setFocused(false)
      router.refresh()
    }
    setLoading(false)
  }

  const isActive = focused || !!content || showImageUpload

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'bg-card border border-border rounded-2xl p-4 transition-all duration-300',
        isActive && 'shadow-lg border-primary/25'
      )}
    >
      <div className="flex gap-3">
        <Avatar username={currentUser.username} avatarUrl={currentUser.avatar_url} />
        <form ref={formRef} onSubmit={handleSubmit} className="flex-1 flex flex-col gap-3">
          {/* Target selector — Personal / Community */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowPicker(s => !s)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border border-border hover:border-primary/40 transition-all"
              style={{ color: 'var(--primary)' }}
            >
              <TargetIcon size={12} />
              {targetLabel}
              <ChevronDown size={12} className={cn('transition-transform', showPicker && 'rotate-180')} />
            </button>

            <AnimatePresence>
              {showPicker && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute left-0 top-full mt-1 z-20 bg-card rounded-xl border border-border shadow-2xl overflow-hidden min-w-[200px]"
                >
                  {/* Personal profile option */}
                  <button
                    type="button"
                    onClick={() => { setTarget('personal'); setShowPicker(false) }}
                    className={cn(
                      'w-full text-left px-3 py-2.5 text-xs font-medium transition-all hover:bg-accent flex items-center gap-2',
                      target === 'personal' ? 'text-primary bg-primary/5' : 'text-foreground'
                    )}
                  >
                    <User size={13} />
                    Profilim
                    <span className="text-[10px] text-muted-foreground ml-auto">Kişisel</span>
                  </button>



                  {/* Divider */}
                  {communities.length > 0 && (
                    <div className="border-t border-border">
                      <p className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Topluluklar</p>
                    </div>
                  )}

                  {/* Community options */}
                  {communities.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => { setTarget(c.id); setShowPicker(false) }}
                      className={cn(
                        'w-full text-left px-3 py-2 text-xs font-medium transition-all hover:bg-accent flex items-center gap-2',
                        c.id === target ? 'text-primary bg-primary/5' : 'text-foreground'
                      )}
                    >
                      <Users size={13} />
                      {c.name}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div 
            onFocus={() => setFocused(true)}
            onBlur={(e) => {
              if (formRef.current?.contains(e.relatedTarget as Node)) return
              setFocused(false)
            }}
            className={cn(
              "min-h-[90px] w-full bg-accent/30 dark:bg-accent/15 border border-border/80 rounded-xl p-3 text-foreground transition-all duration-200 cursor-text",
              focused && "border-primary/50 ring-2 ring-primary/10 shadow-inner bg-card"
            )}
          >
            <RichTextEditor
              editorRef={editorRef}
              value={content}
              onChange={setContent}
              placeholder={target === 'personal' ? 'Ne düşünüyorsun? (Komutlar için / yazın...)' : `${selectedCommunity?.name ?? 'Topluluk'} ile paylaş... (Komutlar için / yazın...)`}
              maxLength={500}
            />
          </div>

          {/* Image upload */}
          <AnimatePresence>
            {showImageUpload && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <ImageUpload onFileSelect={setImageFile} />
              </motion.div>
            )}
          </AnimatePresence>

          {error && <p className="text-xs" style={{ color: 'var(--destructive)' }}>{error}</p>}

          {/* Action bar */}
          <AnimatePresence>
            {isActive && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="pt-2 border-t border-border flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <EmojiPickerButton onInsert={insertEmoji} />
                    <button
                      type="button"
                      onClick={() => setShowImageUpload(s => !s)}
                      className={cn(
                        'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all',
                        showImageUpload ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                      )}
                    >
                      {showImageUpload ? <X size={14} /> : <ImagePlus size={14} />}
                      <span className="hidden sm:inline">{showImageUpload ? 'Kapat' : 'Görsel'}</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-muted-foreground">{content.replace(/<[^>]*>/g, '').length}/500</span>
                    <motion.button
                      type="submit"
                      disabled={loading || (!content.replace(/<[^>]*>/g, '').trim() && !imageFile)}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      className={cn(
                        'flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all',
                        content.replace(/<[^>]*>/g, '').trim() || imageFile
                          ? 'shadow-sm hover:opacity-90'
                          : 'bg-muted text-muted-foreground cursor-not-allowed'
                      )}
                      style={
                        content.replace(/<[^>]*>/g, '').trim() || imageFile
                          ? {
                              background: 'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))',
                              color: 'var(--primary-foreground)',
                            }
                          : {}
                      }
                    >
                      {loading ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                      Paylaş
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </div>
    </motion.div>
  )
}
