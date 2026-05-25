'use client'

import { useState } from 'react'
import { Share2, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PostShareButtonProps {
  postId: string
  /** Topluluk gönderisinde yalnızca bağlantı kopyalama (yeniden paylaşım yok) */
  communityId?: string | null
  className?: string
}

export function PostShareButton({ postId, communityId, className }: PostShareButtonProps) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/post/${postId}`)
      setCopied(true)
      setOpen(false)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      window.prompt('Bağlantıyı kopyala:', `${window.location.origin}/post/${postId}`)
    }
  }

  function handleMainClick() {
    if (communityId) {
      copyLink()
      return
    }
    setOpen(s => !s)
  }

  return (
    <div className={cn('relative ml-auto', className)}>
      <button
        type="button"
        onClick={handleMainClick}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
      >
        <Share2 size={16} />
        {copied ? 'Kopyalandı!' : 'Paylaş'}
      </button>

      {!communityId && open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 bottom-full mb-2 z-20 glass rounded-xl shadow-xl overflow-hidden w-44 border border-border flex flex-col">
            <button
              type="button"
              onClick={copyLink}
              className="flex items-center gap-2 px-3 py-2.5 text-xs text-foreground hover:bg-accent transition-colors text-left w-full cursor-pointer"
            >
              <ExternalLink size={13} />
              {copied ? 'Kopyalandı!' : 'Bağlantıyı Kopyala'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
