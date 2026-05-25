'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ImagePlus, X, Upload } from 'lucide-react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

interface ImageUploadProps {
  onFileSelect: (file: File | null) => void
  className?: string
}

export function ImageUpload({ onFileSelect, className }: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const [isVideo, setIsVideo] = useState(false)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((file: File) => {
    const isVid = file.type.startsWith('video/')
    const isImg = file.type.startsWith('image/')
    if (!isImg && !isVid) return
    
    const url = URL.createObjectURL(file)
    setPreview(url)
    setIsVideo(isVid)
    onFileSelect(file)
  }, [onFileSelect])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleRemove = () => {
    setPreview(null)
    setIsVideo(false)
    onFileSelect(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className={cn('relative', className)}>
      <AnimatePresence mode="wait">
        {preview ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative rounded-xl overflow-hidden border border-border"
          >
            <div className="relative w-full aspect-video flex items-center justify-center bg-black/10">
              {isVideo ? (
                <video src={preview} controls={false} autoPlay muted loop playsInline className="w-full h-full object-cover" />
              ) : (
                <Image src={preview} alt="Önizleme" fill className="object-cover" unoptimized />
              )}
            </div>
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-background/80 backdrop-blur-sm border border-border flex items-center justify-center hover:bg-destructive hover:text-white hover:border-destructive transition-all"
            >
              <X size={14} />
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={cn(
              'border-2 border-dashed rounded-xl p-6 flex flex-col items-center gap-2 cursor-pointer transition-all duration-200',
              dragging
                ? 'border-primary bg-primary/5 scale-[1.01]'
                : 'border-border hover:border-primary/50 hover:bg-accent'
            )}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: 'color-mix(in oklch, var(--primary) 12%, transparent)' }}
            >
              {dragging ? (
                <Upload size={18} style={{ color: 'var(--primary)' }} />
              ) : (
                <ImagePlus size={18} style={{ color: 'var(--primary)' }} />
              )}
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                {dragging ? 'Bırak!' : 'Görsel veya Video Ekle'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Sürükle bırak veya tıkla · PNG, JPG, GIF, MP4, WEBM
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
      />
    </div>
  )
}
