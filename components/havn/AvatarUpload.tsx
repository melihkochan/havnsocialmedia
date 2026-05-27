'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Camera, ZoomIn, ZoomOut, RotateCcw, Check, Undo } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface KokonutAvatar {
  id: number
  name: string
  rgb: string
  svgString: string
  element: React.ReactNode
}

const KOKONUT_AVATARS: KokonutAvatar[] = [
  {
    id: 1,
    name: 'Avatar 1',
    rgb: '255, 0, 91',
    svgString: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" fill="none" width="36" height="36"><mask id="mask1" maskUnits="userSpaceOnUse" x="0" y="0" width="36" height="36"><rect fill="#FFFFFF" width="36" height="36" rx="72"/></mask><g mask="url(#mask1)"><rect fill="#ff005b" width="36" height="36"/><rect fill="#ffb238" width="36" height="36" rx="6" transform="translate(9 -5) rotate(219 18 18) scale(1)"/><g transform="translate(4.5 -4) rotate(9 18 18)"><path d="M15 19c2 1 4 1 6 0" fill="none" stroke="#000000" stroke-linecap="round"/><rect fill="#000000" width="1.5" height="2" rx="1" stroke="none" x="10" y="14"/><rect fill="#000000" width="1.5" height="2" rx="1" stroke="none" x="24" y="14"/></g></g></svg>`,
    element: (
      <svg fill="none" height="40" viewBox="0 0 36 36" width="40" xmlns="http://www.w3.org/2000/svg">
        <mask height="36" id="m1" maskUnits="userSpaceOnUse" width="36" x="0" y="0">
          <rect fill="#FFFFFF" height="36" rx="72" width="36" />
        </mask>
        <g mask="url(#m1)">
          <rect fill="#ff005b" height="36" width="36" />
          <rect fill="#ffb238" height="36" rx="6" transform="translate(9 -5) rotate(219 18 18) scale(1)" width="36" x="0" y="0" />
          <g transform="translate(4.5 -4) rotate(9 18 18)">
            <path d="M15 19c2 1 4 1 6 0" fill="none" stroke="#000000" stroke-linecap="round" />
            <rect fill="#000000" height="2" rx="1" stroke="none" width="1.5" x="10" y="14" />
            <rect fill="#000000" height="2" rx="1" stroke="none" width="1.5" x="24" y="14" />
          </g>
        </g>
      </svg>
    )
  },
  {
    id: 2,
    name: 'Avatar 2',
    rgb: '255, 125, 16',
    svgString: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" fill="none" width="36" height="36"><mask id="mask2" maskUnits="userSpaceOnUse" x="0" y="0" width="36" height="36"><rect fill="#FFFFFF" width="36" height="36" rx="72"/></mask><g mask="url(#mask2)"><rect fill="#ff7d10" width="36" height="36"/><rect fill="#0a0310" width="36" height="36" rx="6" transform="translate(5 -1) rotate(55 18 18) scale(1.1)"/><g transform="translate(7 -6) rotate(-5 18 18)"><path d="M15 20c2 1 4 1 6 0" fill="none" stroke="#FFFFFF" stroke-linecap="round"/><rect fill="#FFFFFF" width="1.5" height="2" rx="1" stroke="none" x="14" y="14"/><rect fill="#FFFFFF" width="1.5" height="2" rx="1" stroke="none" x="20" y="14"/></g></g></svg>`,
    element: (
      <svg fill="none" height="40" viewBox="0 0 36 36" width="40" xmlns="http://www.w3.org/2000/svg">
        <mask height="36" id="m2" maskUnits="userSpaceOnUse" width="36" x="0" y="0">
          <rect fill="#FFFFFF" height="36" rx="72" width="36" />
        </mask>
        <g mask="url(#m2)">
          <rect fill="#ff7d10" height="36" width="36" />
          <rect fill="#0a0310" height="36" rx="6" transform="translate(5 -1) rotate(55 18 18) scale(1.1)" width="36" x="0" y="0" />
          <g transform="translate(7 -6) rotate(-5 18 18)">
            <path d="M15 20c2 1 4 1 6 0" fill="none" stroke="#FFFFFF" stroke-linecap="round" />
            <rect fill="#FFFFFF" height="2" rx="1" stroke="none" width="1.5" x="14" y="14" />
            <rect fill="#FFFFFF" height="2" rx="1" stroke="none" width="1.5" x="20" y="14" />
          </g>
        </g>
      </svg>
    )
  },
  {
    id: 3,
    name: 'Avatar 3',
    rgb: '139, 92, 246',
    svgString: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" fill="none" width="36" height="36"><mask id="mask3" maskUnits="userSpaceOnUse" x="0" y="0" width="36" height="36"><rect fill="#FFFFFF" width="36" height="36" rx="72"/></mask><g mask="url(#mask3)"><rect fill="#0a0310" width="36" height="36"/><rect fill="#ff005b" width="36" height="36" rx="36" transform="translate(-3 7) rotate(227 18 18) scale(1.2)"/><g transform="translate(-3 3.5) rotate(7 18 18)"><path d="M13 21 a1 0.75 0 0 0 10 0" fill="#FFFFFF"/><rect fill="#FFFFFF" width="1.5" height="2" rx="1" stroke="none" x="12" y="14"/><rect fill="#FFFFFF" width="1.5" height="2" rx="1" stroke="none" x="22" y="14"/></g></g></svg>`,
    element: (
      <svg fill="none" height="40" viewBox="0 0 36 36" width="40" xmlns="http://www.w3.org/2000/svg">
        <mask height="36" id="m3" maskUnits="userSpaceOnUse" width="36" x="0" y="0">
          <rect fill="#FFFFFF" height="36" rx="72" width="36" />
        </mask>
        <g mask="url(#m3)">
          <rect fill="#0a0310" height="36" width="36" />
          <rect fill="#ff005b" height="36" rx="36" transform="translate(-3 7) rotate(227 18 18) scale(1.2)" width="36" x="0" y="0" />
          <g transform="translate(-3 3.5) rotate(7 18 18)">
            <path d="M13,21 a1,0.75 0 0,0 10,0" fill="#FFFFFF" />
            <rect fill="#FFFFFF" height="2" rx="1" stroke="none" width="1.5" x="12" y="14" />
            <rect fill="#FFFFFF" height="2" rx="1" stroke="none" width="1.5" x="22" y="14" />
          </g>
        </g>
      </svg>
    )
  },
  {
    id: 4,
    name: 'Avatar 4',
    rgb: '137, 252, 179',
    svgString: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" fill="none" width="36" height="36"><mask id="mask4" maskUnits="userSpaceOnUse" x="0" y="0" width="36" height="36"><rect fill="#FFFFFF" width="36" height="36" rx="72"/></mask><g mask="url(#mask4)"><rect fill="#d8fcb3" width="36" height="36"/><rect fill="#89fcb3" width="36" height="36" rx="6" transform="translate(9 -5) rotate(219 18 18) scale(1)"/><g transform="translate(4.5 -4) rotate(9 18 18)"><path d="M15 19c2 1 4 1 6 0" fill="none" stroke="#000000" stroke-linecap="round"/><rect fill="#000000" width="1.5" height="2" rx="1" stroke="none" x="10" y="14"/><rect fill="#000000" width="1.5" height="2" rx="1" stroke="none" x="24" y="14"/></g></g></svg>`,
    element: (
      <svg fill="none" height="40" viewBox="0 0 36 36" width="40" xmlns="http://www.w3.org/2000/svg">
        <mask height="36" id="m4" maskUnits="userSpaceOnUse" width="36" x="0" y="0">
          <rect fill="#FFFFFF" height="36" rx="72" width="36" />
        </mask>
        <g mask="url(#m4)">
          <rect fill="#d8fcb3" height="36" width="36" />
          <rect fill="#89fcb3" height="36" rx="6" transform="translate(9 -5) rotate(219 18 18) scale(1)" width="36" x="0" y="0" />
          <g transform="translate(4.5 -4) rotate(9 18 18)">
            <path d="M15 19c2 1 4 1 6 0" fill="none" stroke="#000000" stroke-linecap="round" />
            <rect fill="#000000" height="2" rx="1" stroke="none" width="1.5" x="10" y="14" />
            <rect fill="#000000" height="2" rx="1" stroke="none" width="1.5" x="24" y="14" />
          </g>
        </g>
      </svg>
    )
  }
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

  // Generate preset SVG image and pass back to parent
  const handlePresetSelect = useCallback((presetId: number) => {
    const preset = KOKONUT_AVATARS.find(p => p.id === presetId)
    if (!preset) return

    const canvas = canvasRef.current
    if (!canvas) return
    const size = 512
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Create image from SVG XML
    const img = new Image()
    const svgBlob = new Blob([preset.svgString], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)

    img.onload = () => {
      ctx.clearRect(0, 0, size, size)
      ctx.drawImage(img, 0, 0, size, size)
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `preset_${presetId}.png`, { type: 'image/png' })
          onFileSelect(file)
          setSelectedPresetId(presetId)
          setImageSrc(null)
          setIsDeleted(false)
        }
        URL.revokeObjectURL(url)
      }, 'image/png')
    }
    img.src = url
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

  const selectedPreset = KOKONUT_AVATARS.find(p => p.id === selectedPresetId)
  const glowRgb = selectedPreset ? selectedPreset.rgb : 'var(--primary)'

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Hidden input to pass delete status back via Form Data */}
      <input type="hidden" name="delete_avatar" value={isDeleted ? 'true' : 'false'} />

      {/* Circular preview stage with animated glowing borders matching selected avatar */}
      <div className="relative h-40 w-40 flex items-center justify-center">
        {/* Glow effect */}
        <motion.div
          animate={{
            boxShadow: `0 0 0 2px rgba(${glowRgb}, 0.55), 0 6px 24px rgba(${glowRgb}, 0.18)`,
          }}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-full transition-all duration-300"
        />

        {/* Circular preview */}
        <div
          ref={previewRef}
          className={cn(
            'relative h-[152px] w-[152px] rounded-full overflow-hidden border-2 transition-all cursor-grab active:cursor-grabbing group shadow-inner',
            (imageSrc || selectedPreset) ? 'border-primary/20' : 'border-border',
          )}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onWheel={handleWheel}
        >
          <AnimatePresence mode="wait">
            {imageSrc && imgRef.current ? (
              <motion.div
                key="crop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0"
                style={{
                  backgroundImage: `url(${imageSrc})`,
                  backgroundSize: `${(Math.max(PREVIEW_SIZE / (imgRef.current?.naturalWidth || 1), PREVIEW_SIZE / (imgRef.current?.naturalHeight || 1)) * zoom * (imgRef.current?.naturalWidth || 1))}px`,
                  backgroundPosition: `calc(50% + ${offset.x}px) calc(50% + ${offset.y}px)`,
                  backgroundRepeat: 'no-repeat',
                }}
              />
            ) : selectedPreset ? (
              <motion.div
                key={selectedPresetId}
                initial={{ opacity: 0, rotate: -20 }}
                animate={{ opacity: 1, rotate: 0 }}
                exit={{ opacity: 0, rotate: 20 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="absolute inset-0 flex items-center justify-center overflow-hidden"
              >
                {/* Scale factor [3.8] to fill the circle completely */}
                <div className="scale-[3.8] transform origin-center flex items-center justify-center">
                  {selectedPreset.element}
                </div>
              </motion.div>
            ) : (currentAvatarUrl && !isDeleted) ? (
              <motion.img
                key="url"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                src={currentAvatarUrl}
                alt={username}
                className="w-full h-full object-cover"
              />
            ) : (
              <motion.div
                key="initials"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full h-full flex items-center justify-center text-4xl font-black"
                style={{
                  background: 'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))',
                  color: 'var(--primary-foreground)',
                }}
              >
                {userInitials}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Camera overlay */}
          {!imageSrc && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
            >
              <Camera size={28} className="text-white" />
            </button>
          )}
        </div>
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
              className="p-2 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-all flex items-center justify-center cursor-pointer"
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
              className="text-xs font-semibold px-4 py-2.5 rounded-xl border border-border hover:border-primary/40 hover:bg-accent text-muted-foreground hover:text-foreground transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Camera size={13} />
              Fotoğraf Seç
            </button>

            {/* Remove / Undo Button */}
            {isDeleted ? (
              <button
                type="button"
                onClick={handleUndo}
                className="text-xs font-semibold px-4 py-2.5 rounded-xl border border-dashed border-primary/40 hover:bg-primary/5 text-primary transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Undo size={13} />
                Geri Al
              </button>
            ) : (currentAvatarUrl || selectedPresetId) ? (
              <button
                type="button"
                onClick={handleRemove}
                className="text-xs font-semibold px-4 py-2.5 rounded-xl border border-border hover:border-destructive/40 hover:bg-destructive/5 text-muted-foreground hover:text-destructive transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
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

      {/* Preset Avatar Picker Grid (Matching Kokonut UI style) */}
      {!imageSrc && (
        <div className="w-full max-w-[260px] border-t border-border/60 pt-3 mt-1">
          <div className="text-[10px] font-semibold text-muted-foreground tracking-wider uppercase mb-2.5 text-center">
            Avatarını Seç
          </div>
          <div className="grid grid-cols-4 gap-3 justify-items-center">
            {KOKONUT_AVATARS.map((avatar) => {
              const isSelected = selectedPresetId === avatar.id
              return (
                <motion.button
                  key={avatar.id}
                  type="button"
                  onClick={() => handlePresetSelect(avatar.id)}
                  className={cn(
                    'h-12 w-12 rounded-xl relative flex items-center justify-center cursor-pointer transition-all border shadow-sm bg-muted overflow-hidden',
                    isSelected
                      ? 'border-foreground/20 ring-2 ring-foreground/70 ring-offset-2 ring-offset-background opacity-100'
                      : 'border-border opacity-60 hover:opacity-100'
                  )}
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.94 }}
                  title={avatar.name}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="scale-[1.3] transform">
                      {avatar.element}
                    </div>
                  </div>
                  {isSelected && (
                    <div className="absolute -right-0.5 -bottom-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-foreground">
                      <Check className="h-2.5 w-2.5 text-background" />
                    </div>
                  )}
                </motion.button>
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
