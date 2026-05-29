'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Option {
  value: string
  label: string
  image?: string
}

interface SearchableSelectProps {
  value: string
  onChange: (value: string) => void
  options: Option[]
  placeholder?: string
  disabled?: boolean
  className?: string
  selectClassName?: string
}

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = 'Seçin...',
  disabled = false,
  className,
  selectClassName
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  const selectedOption = options.find(o => o.value === value)

  const filteredOptions = options.filter(o =>
    o.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.value.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-sm outline-none flex items-center justify-between transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none text-left",
          isOpen ? "border-primary ring-2 ring-primary/20" : "",
          selectClassName
        )}
      >
        {selectedOption ? (
          <span className="flex items-center gap-2 truncate">
            {selectedOption.image && (
              <img src={selectedOption.image} alt="" className="w-4.5 h-3 object-cover rounded shadow-sm flex-shrink-0" />
            )}
            <span className="truncate">{selectedOption.label}</span>
          </span>
        ) : (
          <span className="text-muted-foreground truncate">{placeholder}</span>
        )}
        <ChevronDown size={14} className={cn("text-muted-foreground transition-transform flex-shrink-0", isOpen ? "rotate-180" : "")} />
      </button>

      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 p-1.5 rounded-xl border border-border bg-popover shadow-xl max-h-64 flex flex-col gap-1.5 overflow-hidden">
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-muted/40 border border-border/50">
            <Search size={12} className="text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ara..."
              className="flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground/60"
            />
          </div>
          <div className="flex-1 overflow-y-auto max-h-48 space-y-0.5 pr-0.5">
            {filteredOptions.map(o => (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  onChange(o.value)
                  setIsOpen(false)
                  setSearchQuery('')
                }}
                className={cn(
                  "w-full px-3 py-2 rounded-lg text-xs flex items-center gap-2.5 transition-colors cursor-pointer text-left hover:bg-accent hover:text-accent-foreground",
                  o.value === value ? "bg-primary/10 text-primary font-bold" : "text-popover-foreground"
                )}
              >
                {o.image && (
                  <img src={o.image} alt="" className="w-4.5 h-3 object-cover rounded shadow-sm flex-shrink-0" />
                )}
                <span className="truncate">{o.label}</span>
              </button>
            ))}
            {filteredOptions.length === 0 && (
              <div className="text-center py-3 text-[11px] text-muted-foreground">Sonuç bulunamadı</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
