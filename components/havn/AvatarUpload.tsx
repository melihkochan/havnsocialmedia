'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Camera, ZoomIn, ZoomOut, RotateCcw, Check, Undo, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AvatarPreset {
  id: number
  name: string
  gradientStart: string
  gradientEnd: string
  textHex: string
}

const PRESETS: AvatarPreset[] = [
  { id: 1, name: 'Sunset Glow', gradientStart: '#ff005b', gradientEnd: '#ffb238', textHex: '#ffffff' },
  { id: 2, name: 'Ocean Breeze', gradientStart: '#00c6ff', gradientEnd: '#0072ff', textHex: '#ffffff' },
  { id: 3, name: 'Deep Space', gradientStart: '#7f00ff', gradientEnd: '#e100ff', textHex: '#ffffff' },
  { id: 4, name: 'Cyberpunk', gradientStart: '#f857a6', gradientEnd: '#ff5858', textHex: '#ffffff' },
  { id: 5, name: 'Emerald Forest', gradientStart: '#11998e', gradientEnd: '#38ef7d', textHex: '#ffffff' },
  { id: 6, name: 'Soft Orchid', gradientStart: '#a8c0ff', gradientEnd: '#3f2b96', textHex: '#ffffff' }
]

interface AvatarUploadProps {
  currentAvatarUrl: string | null
  username: string
  onFileSelect: (file: File | null) => void
}

export function AvatarUpload({ currentAvatarUrl, username, onFileSelect }: AvatarUploadProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [selectedPresetId, setSelectedPresetId] = useState<number | null>(null)
  const [isDeleted, setIsDeleted] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const previewRef = useRef<HTMLDivElement>(null)

  const PREVIEW_SIZE = 160
  const userInitials = username.slice(0, 2).toUpperCase()

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      setImageSrc(ev.target?.result as string)
      setSelectedPresetId(null)
      setIsDeleted(false)
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

  // Generate and set preset blob
  const handlePresetSelect = useCallback((preset: AvatarPreset) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const size = 512
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, size, size)

    // Clip to circle
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
    ctx.closePath()
    ctx.clip()

    // Draw gradient background
    const grad = ctx.createLinearGradient(0, 0, size, size)
    grad.addColorStop(0, preset.gradientStart)
    grad.addColorStop(1, preset.gradientEnd)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, size, size)

    // Draw text (initials)
    ctx.fillStyle = preset.textHex
    ctx.font = '900 180px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(userInitials, size / 2, size / 2 + 10)

    // Convert to file
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `preset_${preset.id}.png`, { type: 'image/png' })
        onFileSelect(file)
        setSelectedPresetId(preset.id)
        setImageSrc(null)
        setIsDeleted(false)
      }
    }, 'image/png')
  }, [userInitials, onFileSelect])

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
    setSelectedPresetId(null)
    setIsDeleted(false)
    setZoom(1)
    setOffset({ x: 0, y: 0 })
    onFileSelect(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleRemove() {
    setImageSrc(null)
    setSelectedPresetId(null)
    setIsDeleted(true)
    onFileSelect(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleUndo() {
    setIsDeleted(false)
  }

  const selectedPreset = PRESETS.find(p => p.id === selectedPresetId)

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Hidden input to pass delete status back via Form Data */}
      <input type="hidden" name="delete_avatar" value={isDeleted ? 'true' : 'false'} />

      {/* Circular preview */}
      <div
        ref={previewRef}
        className={cn(
          'relative rounded-full overflow-hidden border-4 transition-all cursor-grab active:cursor-grabbing group shadow-md',
          (imageSrc || selectedPreset) ? 'border-primary/40' : 'border-border',
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
        ) : selectedPreset ? (
          <div
            className="w-full h-full flex items-center justify-center text-4xl font-black tracking-tight"
            style={{
              background: `linear-gradient(135deg, ${selectedPreset.gradientStart}, ${selectedPreset.gradientEnd})`,
              color: selectedPreset.textHex,
            }}
          >
            {userInitials}
          </div>
        ) : (currentAvatarUrl && !isDeleted) ? (
          <img
            src={currentAvatarUrl}
            alt={username}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-4xl font-black"
            style={{
              background: 'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))',
              color: 'var(--primary-foreground)',
            }}
          >
            {userInitials}
          </div>
        )}

        {/* Camera overlay */}
        {!imageSrc && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
          >
            <Camera size={28} className="text-white" />
          </button>
        )}
      </div>

      {/* Action Buttons Row */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {imageSrc ? (
          <div className="flex items-center gap-3">
            {/* Zoom controls */}
            <div className="flex items-center gap-1.5 bg-card border border-border rounded-xl px-2.5 py-1.5">
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
                className="w-20 h-1 accent-primary bg-accent rounded-lg cursor-pointer"
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
              className="p-2 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-all flex items-center justify-center"
              title="Sıfırla"
            >
              <RotateCcw size={14} />
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs font-semibold px-4 py-2.5 rounded-xl border border-border hover:border-primary/40 hover:bg-accent text-muted-foreground hover:text-foreground transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Camera size={13} />
              Fotoğraf Seç
            </button>

            {/* Remove / Undo Button */}
            {isDeleted ? (
              <button
                type="button"
                onClick={handleUndo}
                className="text-xs font-semibold px-4 py-2.5 rounded-xl border border-dashed border-primary/40 hover:bg-primary/5 text-primary transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Undo size={13} />
                Geri Al
              </button>
            ) : (currentAvatarUrl || selectedPresetId) ? (
              <button
                type="button"
                onClick={handleRemove}
                className="text-xs font-semibold px-4 py-2.5 rounded-xl border border-border hover:border-destructive/40 hover:bg-destructive/5 text-muted-foreground hover:text-destructive transition-all flex items-center gap-1.5 shadow-sm"
              >
                Fotoğrafı Kaldır
              </button>
            ) : null}
          </div>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground text-center">
        {imageSrc ? 'Sürükle ve zum yaparak ayarla' : 'JPG, PNG — Maks 10MB'}
      </p>

      {/* Preset Avatar Picker Grid */}
      {!imageSrc && (
        <div className="w-full max-w-[260px] border-t border-border/60 pt-3 mt-1">
          <div className="text-[10px] font-semibold text-muted-foreground tracking-wider uppercase mb-2 text-center">
            Hazır Şablonlar
          </div>
          <div className="grid grid-cols-6 gap-2.5 justify-items-center">
            {PRESETS.map((preset) => {
              const isSelected = selectedPresetId === preset.id
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handlePresetSelect(preset)}
                  className={cn(
                    'h-8 w-8 rounded-full relative flex items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95 border border-border/40 shadow-sm',
                    isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''
                  )}
                  style={{
                    background: `linear-gradient(135deg, ${preset.gradientStart}, ${preset.gradientEnd})`
                  }}
                  title={preset.name}
                >
                  {isSelected ? (
                    <Check size={13} className="text-white drop-shadow" />
                  ) : (
                    <span className="text-[9px] font-black text-white/80 select-none">
                      {userInitials}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

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
