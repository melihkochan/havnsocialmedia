'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface ConfirmationModalProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
  isDanger?: boolean
  isAlert?: boolean
}

export function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmText = 'Evet',
  cancelText = 'İptal',
  onConfirm,
  onCancel,
  isDanger = true,
  isAlert = false
}: ConfirmationModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
          />
          
          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            className="w-full max-w-sm bg-card border border-border rounded-2xl p-6 shadow-2xl relative z-10 overflow-hidden"
          >
            <h3 className="text-base font-bold text-foreground mb-2">{title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed mb-6">{message}</p>
            
            <div className="flex items-center justify-end gap-2">
              {!isAlert && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-3.5 py-2 text-xs font-bold border border-border hover:bg-accent rounded-xl transition-all cursor-pointer select-none active:scale-95 text-foreground"
                >
                  {cancelText}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  onConfirm()
                  onCancel()
                }}
                className={cn(
                  "px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer select-none active:scale-95 text-white shadow-sm",
                  isDanger 
                    ? "bg-destructive hover:opacity-90" 
                    : "bg-primary hover:opacity-90"
                )}
                style={!isDanger ? { background: 'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))' } : {}}
              >
                {isAlert && confirmText === 'Evet' ? 'Tamam' : confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
