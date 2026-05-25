'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: (reason?: string) => void
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  pending?: boolean
  error?: string | null
  variant?: 'destructive' | 'default'
  showReason?: boolean
  reasonLabel?: string
  reasonPlaceholder?: string
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Onayla',
  cancelLabel = 'İptal',
  pending = false,
  error = null,
  variant = 'default',
  showReason = false,
  reasonLabel = 'Neden (isteğe bağlı)',
  reasonPlaceholder = 'Kısa bir açıklama yazın…',
}: ConfirmDialogProps) {
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (!open) setReason('')
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !pending) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, pending, onClose])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onConfirm(showReason ? reason.trim() || undefined : undefined)
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={pending ? undefined : onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.2 }}
            className="relative z-10 bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5 border-b border-border flex items-start gap-3">
              <div
                className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                  variant === 'destructive'
                    ? 'bg-destructive/10 text-destructive'
                    : 'bg-primary/10 text-primary'
                )}
              >
                <AlertTriangle size={20} />
              </div>
              <div className="flex-1 min-w-0 pr-6">
                <h2 id="confirm-dialog-title" className="text-sm font-black text-foreground">
                  {title}
                </h2>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={pending}
                className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-all cursor-pointer disabled:opacity-50"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {showReason && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">{reasonLabel}</label>
                  <textarea
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    rows={3}
                    maxLength={300}
                    placeholder={reasonPlaceholder}
                    disabled={pending}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none placeholder:text-muted-foreground disabled:opacity-60"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Gönderi sahibine bildirimde gösterilir.
                  </p>
                </div>
              )}

              {error && (
                <p
                  className="text-xs font-medium px-3 py-2 rounded-lg"
                  style={{
                    color: 'var(--destructive)',
                    background: 'color-mix(in oklch, var(--destructive) 10%, transparent)',
                  }}
                >
                  {error}
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={pending}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold border border-border text-foreground hover:bg-accent transition-all cursor-pointer disabled:opacity-50"
                >
                  {cancelLabel}
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-70',
                    variant === 'destructive'
                      ? 'text-destructive-foreground'
                      : 'text-primary-foreground'
                  )}
                  style={
                    variant === 'destructive'
                      ? {
                          background: 'var(--destructive)',
                        }
                      : {
                          background:
                            'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))',
                        }
                  }
                >
                  {pending ? <Loader2 size={14} className="animate-spin" /> : confirmLabel}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
