'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Camera, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AvatarUploadProps {
  currentAvatarUrl: string | null
  username: string
  onFileSelect: (file: File | null) => void
}

export function AvatarUpload({ currentAvatarUrl, username, onFileSelect }: AvatarUploadProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const previewRef = useRef<HTMLDivElement>(null)

  const PREVIEW_SIZE = 160

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      setImageSrc(ev.target?.result as string)
      setZoom(1)
      setOffset({ x: 0, y: 0 })
    }
    reader.readAsDataURL(file)
  }

  // When image loads, auto-fit and generate initial crop
  useEffect(() => {
    if (!imageSrc) return
    const img = new Image()
    img.onload = () => {
      imgRef.current = img
      generateCrop(img, zoom, offset)
    }
    img.src = imageSrc
  }, [imageSrc])

  // Re-generate crop on zoom/offset change
  useEffect(() => {
    if (imgRef.current && imageSrc) {
      generateCrop(imgRef.current, zoom, offset)
    }
  }, [zoom, offset, imageSrc])

  const generateCrop = useCallback((img: HTMLImageElement, z: number, off: { x: number; y: number }) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const size = 512 // Output size
    canvas.width = size
    canvas.height = size

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Calculate dimensions to cover the circle
    const scale = Math.max(size / img.width, size / img.height) * z
    const w = img.width * scale
    const h = img.height * scale
    const x = (size - w) / 2 + off.x * scale
    const y = (size - h) / 2 + off.y * scale

    // Draw circular clip
    ctx.clearRect(0, 0, size, size)
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
    ctx.closePath()
    ctx.clip()

    ctx.drawImage(img, x, y, w, h)

    // Convert to file
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' })
        onFileSelect(file)
      }
    }, 'image/jpeg', 0.85)
  }, [onFileSelect])

  // Drag handlers
  function handlePointerDown(e: React.PointerEvent) {
    if (!imageSrc) return
    setDragging(true)
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y })
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragging) return
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    })
  }

  function handlePointerUp() {
    setDragging(false)
  }

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault()
    setZoom(z => Math.max(0.5, Math.min(3, z + (e.deltaY > 0 ? -0.05 : 0.05))))
  }

  function handleReset() {
    setImageSrc(null)
    setZoom(1)
    setOffset({ x: 0, y: 0 })
    onFileSelect(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Circular preview */}
      <div
        ref={previewRef}
        className={cn(
          'relative rounded-full overflow-hidden border-4 transition-all cursor-grab active:cursor-grabbing',
          imageSrc ? 'border-primary/40' : 'border-border',
        )}
        style={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
      >
        {imageSrc && imgRef.current ? (
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${imageSrc})`,
              backgroundSize: `${(Math.max(PREVIEW_SIZE / (imgRef.current?.naturalWidth || 1), PREVIEW_SIZE / (imgRef.current?.naturalHeight || 1)) * zoom * (imgRef.current?.naturalWidth || 1))}px`,
              backgroundPosition: `calc(50% + ${offset.x}px) calc(50% + ${offset.y}px)`,
              backgroundRepeat: 'no-repeat',
            }}
          />
        ) : currentAvatarUrl ? (
          <img
            src={currentAvatarUrl}
            alt={username}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-3xl font-black"
            style={{
              background: 'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))',
              color: 'var(--primary-foreground)',
            }}
          >
            {username.slice(0, 2).toUpperCase()}
          </div>
        )}

        {/* Camera overlay */}
        {!imageSrc && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center"
          >
            <Camera size={28} className="text-white" />
          </button>
        )}
      </div>

      {/* Controls */}
      {imageSrc ? (
        <div className="flex items-center gap-3">
          {/* Zoom controls */}
          <div className="flex items-center gap-1.5 bg-card border border-border rounded-xl px-2 py-1">
            <button
              type="button"
              onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}
              className="p-1 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-all"
            >
              <ZoomOut size={14} />
            </button>
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.05"
              value={zoom}
              onChange={e => setZoom(parseFloat(e.target.value))}
              className="w-20 h-1 accent-primary"
            />
            <button
              type="button"
              onClick={() => setZoom(z => Math.min(3, z + 0.1))}
              className="p-1 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-all"
            >
              <ZoomIn size={14} />
            </button>
          </div>

          {/* Reset */}
          <button
            type="button"
            onClick={handleReset}
            className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
            title="Sıfırla"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="text-xs font-semibold px-4 py-2 rounded-xl border border-border hover:border-primary/40 hover:bg-accent text-muted-foreground hover:text-foreground transition-all"
        >
          <span className="flex items-center gap-1.5">
            <Camera size={13} />
            Fotoğraf Seç
          </span>
        </button>
      )}

      <p className="text-[10px] text-muted-foreground">
        {imageSrc ? 'Sürükle ve zum yaparak ayarla' : 'JPG, PNG — Maks 10MB'}
      </p>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Hidden canvas for cropping */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
