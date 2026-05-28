'use client'

import { useState, useEffect, useRef } from 'react'
import { useEditor, EditorContent, Extension, Mark, mergeAttributes } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { cn } from '@/lib/utils'
import { Heading, Code, Type, Quote, EyeOff } from 'lucide-react'

// Define Custom Spoiler Mark
const SpoilerMark = Mark.create({
  name: 'spoiler',

  addOptions() {
    return {
      HTMLAttributes: {
        'data-spoiler': 'true',
        class: 'bg-muted-foreground/30 text-foreground border border-dashed border-muted-foreground/50 rounded px-1.5 py-0.5 select-all font-medium',
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-spoiler]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0]
  },
})

// Helper to check for the slash command
function detectSlashCommand(editor: any, onSlashDetect: (query: string | null) => void) {
  const { state } = editor
  const { selection } = state
  const $pos = selection.$from
  
  // Check 10 characters before the cursor
  const textBefore = $pos.parent.textBetween(
    Math.max(0, $pos.parentOffset - 10),
    $pos.parentOffset,
    undefined,
    '\uFFFC'
  )
  
  const slashIndex = textBefore.lastIndexOf('/')
  if (slashIndex === -1) {
    onSlashDetect(null)
    return
  }

  const query = textBefore.slice(slashIndex + 1)
  // Query can only have letters and numbers (no space)
  if (/^[a-zA-Z0-9]*$/.test(query)) {
    onSlashDetect(query)
  } else {
    onSlashDetect(null)
  }
}

// Custom extension to intercept keydowns or selection changes to check for the slash command
const SlashCommandDetector = Extension.create({
  name: 'slashCommandDetector',

  addOptions() {
    return {
      onSlashDetect: (query: string | null) => {},
    }
  },

  onCreate() {
    this.options.onSlashDetect(null)
  },

  onUpdate() {
    detectSlashCommand(this.editor, this.options.onSlashDetect)
  },

  onSelectionUpdate() {
    detectSlashCommand(this.editor, this.options.onSlashDetect)
  }
})

interface CommandItem {
  id: string
  name: string
  desc: string
  icon: React.ComponentType<any>
}

const commands: CommandItem[] = [
  { id: 'h1', name: 'Başlık 1', desc: 'Büyük başlık ekle', icon: Heading },
  { id: 'h2', name: 'Başlık 2', desc: 'Orta boy başlık ekle', icon: Heading },
  { id: 'blockquote', name: 'Alıntı', desc: 'Alıntı bloğu ekle', icon: Quote },
  { id: 'codeBlock', name: 'Kod Bloğu', desc: 'Kod parçacığı alanı ekle', icon: Code },
  { id: 'spoiler', name: 'Spoiler', desc: 'Gizli, sansürlü yazı ekle', icon: EyeOff },
]

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  maxLength?: number
  className?: string
  autoFocus?: boolean
  editorRef?: React.MutableRefObject<any>
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Ne düşünüyorsun? (Komutlar için / yazın...)',
  maxLength = 500,
  className,
  autoFocus = false,
  editorRef,
}: RichTextEditorProps) {
  const [slashQuery, setSlashQuery] = useState<string | null>(null)
  const [showSlashMenu, setShowSlashMenu] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [menuCoords, setMenuCoords] = useState({ top: 0, left: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  const filteredCommands = slashQuery !== null
    ? commands.filter(c => c.name.toLowerCase().includes(slashQuery.toLowerCase()) || c.id.toLowerCase().includes(slashQuery.toLowerCase()))
    : commands

  // Refs to avoid stale closures inside Editor configuration
  const selectedIdxRef = useRef(0)
  const filteredCommandsRef = useRef<CommandItem[]>([])
  const showSlashMenuRef = useRef(false)
  const slashQueryRef = useRef<string | null>(null)

  useEffect(() => { selectedIdxRef.current = selectedIdx }, [selectedIdx])
  useEffect(() => { filteredCommandsRef.current = filteredCommands }, [filteredCommands])
  useEffect(() => { showSlashMenuRef.current = showSlashMenu }, [showSlashMenu])
  useEffect(() => { slashQueryRef.current = slashQuery }, [slashQuery])

  const executeCommand = (commandId: string) => {
    if (!editor) return

    const { state } = editor
    const { selection } = state
    const currentQuery = slashQueryRef.current || ''
    
    // Slash length is query length + 1 (for the '/')
    const deleteLength = currentQuery.length + 1
    
    editor.chain()
      .focus()
      .deleteRange({ from: selection.from - deleteLength, to: selection.from })
      .run()

    if (commandId === 'h1') {
      editor.chain().focus().toggleHeading({ level: 1 }).run()
    } else if (commandId === 'h2') {
      editor.chain().focus().toggleHeading({ level: 2 }).run()
    } else if (commandId === 'blockquote') {
      editor.chain().focus().toggleBlockquote().run()
    } else if (commandId === 'codeBlock') {
      editor.chain().focus().toggleCodeBlock().run()
    } else if (commandId === 'spoiler') {
      editor.chain().focus().toggleMark('spoiler').run()
    }

    setShowSlashMenu(false)
    setSlashQuery(null)
  }

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2],
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      SpoilerMark,
      SlashCommandDetector.configure({
        onSlashDetect: (query: string | null) => {
          if (query !== null) {
            setSlashQuery(query)
            setShowSlashMenu(true)
            setSelectedIdx(0)
            
            // Calculate coordinates for the popup
            if (editor && containerRef.current) {
              const { view, state } = editor
              try {
                const coords = view.coordsAtPos(state.selection.from)
                const containerRect = containerRef.current.getBoundingClientRect()
                
                // Position popup below the cursor line
                setMenuCoords({
                  top: coords.bottom - containerRect.top + 5,
                  left: Math.min(coords.left - containerRect.left, containerRect.width - 240),
                })
              } catch (e) {
                // fallback
              }
            }
          } else {
            setSlashQuery(null)
            setShowSlashMenu(false)
          }
        }
      })
    ],
    content: value,
    editorProps: {
      attributes: {
        class: 'outline-none text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none min-h-[60px] cursor-text placeholder:text-muted-foreground',
      },
      handleKeyDown: (view, event) => {
        if (showSlashMenuRef.current && filteredCommandsRef.current.length > 0) {
          const list = filteredCommandsRef.current
          const idx = selectedIdxRef.current
          
          if (event.key === 'ArrowDown') {
            setSelectedIdx((prev) => (prev + 1) % list.length)
            return true
          }
          if (event.key === 'ArrowUp') {
            setSelectedIdx((prev) => (prev - 1 + list.length) % list.length)
            return true
          }
          if (event.key === 'Enter') {
            if (list[idx]) {
              executeCommand(list[idx].id)
              return true
            }
          }
          if (event.key === 'Escape') {
            setShowSlashMenu(false)
            setSlashQuery(null)
            return true
          }
        }
        return false
      }
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      // Exclude empty paragraphs from triggering value changes to keep it clean
      if (html === '<p></p>') {
        onChange('')
      } else {
        onChange(html)
      }
    },
  })

  // Expose editor ref
  useEffect(() => {
    if (editorRef && editor) {
      editorRef.current = editor
    }
  }, [editor, editorRef])

  // Watch programmatic value updates (like clear form)
  useEffect(() => {
    if (editor && value !== editor.getHTML() && (value || editor.getHTML() !== '<p></p>')) {
      // Temporarily store cursor position
      const { from } = editor.state.selection
      editor.commands.setContent(value, { emitUpdate: false })
      // Restore cursor position if possible
      try {
        editor.commands.setTextSelection(from)
      } catch {}
    }
  }, [value, editor])

  useEffect(() => {
    if (editor && autoFocus) {
      editor.commands.focus()
    }
  }, [editor, autoFocus])

  // Simple clean text counter
  const charCount = editor ? editor.getText().length : 0

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <EditorContent editor={editor} />
      
      {/* Slash Commands Dropdown */}
      {showSlashMenu && filteredCommands.length > 0 && (
        <>
          {/* Backdrop to close menu on click */}
          <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setShowSlashMenu(false)} />
          
          <div
            style={{ top: menuCoords.top, left: menuCoords.left }}
            className="absolute z-50 w-56 bg-card border border-border shadow-2xl rounded-xl p-1.5 flex flex-col gap-0.5 animate-in fade-in slide-in-from-top-1 duration-150"
          >
            <div className="text-[9px] font-black text-muted-foreground/80 uppercase px-2 py-1 tracking-wider select-none border-b border-border/40 mb-1">
              Yazı Komutları
            </div>
            <div className="max-h-48 overflow-y-auto flex flex-col gap-0.5">
              {filteredCommands.map((cmd, i) => {
                const Icon = cmd.icon
                const isActive = i === selectedIdx
                return (
                  <button
                    key={cmd.id}
                    type="button"
                    onClick={() => executeCommand(cmd.id)}
                    className={cn(
                      'flex items-center gap-3 px-2 py-1.5 rounded-lg text-left transition-all w-full cursor-pointer',
                      isActive ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-accent text-foreground'
                    )}
                  >
                    <div className={cn('w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 text-xs font-black', isActive ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary')}>
                      <Icon size={12} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-black leading-tight truncate">{cmd.name}</div>
                      <div className={cn('text-[9px] truncate mt-0.5', isActive ? 'text-white/80' : 'text-muted-foreground')}>{cmd.desc}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* Length counter warning if close to limit */}
      {charCount > 0 && (
        <div className={cn(
          'absolute right-0 bottom-[-22px] text-[10px] font-bold select-none transition-colors duration-200',
          charCount > maxLength ? 'text-destructive' : 'text-muted-foreground'
        )}>
          {charCount}/{maxLength}
        </div>
      )}
    </div>
  )
}
