'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, ImagePlus, X, Loader2 } from 'lucide-react'
import { ImageUpload } from '@/components/havn/ImageUpload'
import { EmojiPickerButton } from '@/components/havn/EmojiPickerButton'
import { insertIntoField } from '@/lib/insert-text'
import { createPost } from '@/lib/actions/posts'
import { cn } from '@/lib/utils'
import { AiPostAssistant } from '@/components/havn/AiPostAssistant'

interface NewPostFormProps {
  communityId: string
  currentUser: { username: string; avatar_url: string | null }
}

function Avatar({ username, avatarUrl }: { username: string; avatarUrl: string | null }) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={username}
        className="w-9 h-9 rounded-full object-cover flex-shrink-0"
      />
    )
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

export function NewPostForm({ communityId, currentUser }: NewPostFormProps) {
  const router = useRouter()
  const [content, setContent] = useState('')
  const [focused, setFocused] = useState(false)
  const [showImageUpload, setShowImageUpload] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function insertEmoji(emoji: string) {
    insertIntoField(content, setContent, textareaRef.current, emoji)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim() && !imageFile) return
    setLoading(true)
    setError(null)

    const formData = new FormData()
    formData.set('content', content)
    formData.set('communityId', communityId)
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
          <textarea
            ref={textareaRef}
            value={content}
            onChange={e => setContent(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={(e) => {
              // Don't collapse if clicking within the form
              if (formRef.current?.contains(e.relatedTarget as Node)) return
              setFocused(false)
            }}
            placeholder="Topluluğunla bir şeyler paylaş..."
            rows={isActive ? 3 : 1}
            maxLength={500}
            className="w-full bg-transparent text-foreground placeholder:text-muted-foreground text-sm leading-relaxed resize-none outline-none transition-all duration-300"
          />

          {/* Image upload area */}
          <AnimatePresence>
            {showImageUpload && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <ImageUpload onFileSelect={setImageFile} />
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <p className="text-xs" style={{ color: 'var(--destructive)' }}>{error}</p>
          )}

          {/* Action bar */}
          <AnimatePresence>
            {isActive && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-2 border-t border-border flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowImageUpload(s => !s)}
                      className={cn(
                        'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all',
                        showImageUpload
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                      )}
                    >
                      {showImageUpload ? <X size={14} /> : <ImagePlus size={14} />}
                      <span className="hidden sm:inline">{showImageUpload ? 'Kapat' : 'Görsel'}</span>
                    </button>
                    <EmojiPickerButton onInsert={insertEmoji} />
                    <AiPostAssistant text={content} onSelect={setContent} />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{content.length}/500</span>
                    <motion.button
                      type="submit"
                      disabled={loading || (!content.trim() && !imageFile)}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      className={cn(
                        'flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all',
                        content.trim() || imageFile
                          ? 'shadow-sm hover:opacity-90'
                          : 'bg-muted text-muted-foreground cursor-not-allowed'
                      )}
                      style={
                        content.trim() || imageFile
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
