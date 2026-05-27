'use client'

import React, { useState, useEffect } from 'react'
import { splitMessageParts, getFlagImageUrl } from '@/lib/flags'
import { cn } from '@/lib/utils'
import { Play, ExternalLink } from 'lucide-react'

interface FormattedMessageProps {
  text: string
  className?: string
}

// Custom Interactive Spoiler Component
function Spoiler({ children }: { children: React.ReactNode }) {
  const [revealed, setRevealed] = useState(false)
  return (
    <span
      onClick={(e) => {
        e.stopPropagation()
        e.preventDefault()
        setRevealed(prev => !prev)
      }}
      className={cn(
        "inline-block rounded px-1.5 py-0.5 cursor-pointer font-bold select-none transition-all duration-300 mx-0.5",
        revealed
          ? "bg-muted/40 text-foreground border border-border/40"
          : "bg-foreground/90 hover:bg-foreground/95 text-transparent filter blur-[4px] select-none"
      )}
      title={revealed ? "Gizlemek için tıklayın" : "Gösterisi için tıklayın (Spoiler)"}
    >
      {children}
    </span>
  )
}

// Custom On-Demand YouTube Embed Component
function YouTubeEmbed({ videoId }: { videoId: string }) {
  const [loadVideo, setLoadVideo] = useState(false)

  return (
    <div className="w-full my-4 rounded-2xl overflow-hidden border border-border bg-card shadow-lg select-none">
      {loadVideo ? (
        <div className="aspect-video w-full bg-black">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1`}
            title="YouTube Video Player"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
          />
        </div>
      ) : (
        <div
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setLoadVideo(true)
          }}
          className="relative w-full aspect-video bg-zinc-950 flex items-center justify-center cursor-pointer group"
        >
          <img
            src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
            alt="YouTube Video"
            className="absolute inset-0 w-full h-full object-cover opacity-75 group-hover:scale-[1.015] transition-transform duration-300"
            loading="lazy"
          />
          {/* Pulsing Play Button */}
          <div className="absolute w-14 h-14 rounded-full bg-primary/95 group-hover:bg-primary text-white flex items-center justify-center shadow-2xl transition-all duration-200 transform group-hover:scale-110">
            <Play size={20} className="fill-current translate-x-[1.5px]" />
          </div>
          <span className="absolute bottom-3 right-3 bg-red-600 text-white font-black text-[9px] px-2 py-0.5 rounded uppercase tracking-widest shadow">
            YouTube
          </span>
        </div>
      )}
    </div>
  )
}

// Custom Twitter/X Embed Card
function TwitterEmbed({ username, tweetId, url }: { username: string; tweetId: string; url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="block w-full my-4 p-4 bg-card/65 backdrop-blur-md border border-border/80 rounded-2xl hover:border-primary/45 shadow-sm hover:shadow-md transition-all duration-300 group text-left min-w-0"
    >
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-black uppercase flex-shrink-0">
            {username.slice(0, 2)}
          </div>
          <div className="min-w-0 flex flex-col">
            <span className="text-xs font-black text-foreground truncate">@{username}</span>
            <span className="text-[9px] text-muted-foreground">Twitter / X'te Görüntüle</span>
          </div>
        </div>
        <svg className="w-4.5 h-4.5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      </div>
      <div className="text-xs text-foreground/90 leading-relaxed mb-2 break-words font-medium">
        Bu gönderiyi Twitter / X üzerinde okumak için tıklayın.
      </div>
      <div className="text-[9px] text-muted-foreground">
        Gönderi Kimliği: {tweetId}
      </div>
    </a>
  )
}

// Convert plain text with flags into React nodes
function renderTextWithFlags(text: string): React.ReactNode[] {
  const parts = splitMessageParts(text)
  return parts.map((part, i) => {
    if (part.type === 'text') {
      return <span key={i}>{part.value}</span>
    }
    return (
      <img
        key={i}
        src={getFlagImageUrl(part.iso, 40)}
        alt={part.iso.toUpperCase()}
        title={part.iso.toUpperCase()}
        width={22}
        height={16}
        className="inline-block rounded-[2px] object-cover align-[-3px] mx-0.5 shadow-sm ring-1 ring-border/40"
        loading="lazy"
        decoding="async"
      />
    )
  })
}

export function FormattedMessage({ text, className }: FormattedMessageProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    // SSR / First-load plain text fallback
    const stripped = text.replace(/<[^>]*>/g, '')
    return <span className={cn('whitespace-pre-wrap', className)}>{renderTextWithFlags(stripped)}</span>
  }

  // Detect HTML
  const isHtml = text.trim().startsWith('<') && text.trim().endsWith('>')

  if (!isHtml) {
    return <span className={cn('whitespace-pre-wrap', className)}>{renderTextWithFlags(text)}</span>
  }

  // Parse HTML client-side
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(text, 'text/html')
    
    // Recursive converter from DOM nodes to React nodes
    const convertNode = (node: Node, index: number): React.ReactNode => {
      if (node.nodeType === Node.TEXT_NODE) {
        return <React.Fragment key={index}>{renderTextWithFlags(node.nodeValue || '')}</React.Fragment>
      }

      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement
        const tagName = element.tagName.toLowerCase()
        const children = Array.from(element.childNodes).map((child, i) => convertNode(child, i))

        switch (tagName) {
          case 'p':
            return <p key={index} className="mb-2.5 last:mb-0 leading-relaxed break-words">{children}</p>
          case 'h1':
            return <h1 key={index} className="text-xl sm:text-2xl font-black text-foreground mt-4 mb-2 leading-snug">{children}</h1>
          case 'h2':
            return <h2 key={index} className="text-lg sm:text-xl font-bold text-foreground mt-3 mb-1.5 leading-snug">{children}</h2>
          case 'blockquote':
            return (
              <blockquote key={index} className="border-l-4 border-primary bg-primary/5 pl-4 pr-3 py-2 rounded-r-xl italic my-3 text-muted-foreground leading-relaxed break-words">
                {children}
              </blockquote>
            )
          case 'pre':
            return (
              <pre key={index} className="bg-zinc-950 dark:bg-zinc-900 border border-border/80 rounded-xl p-3.5 my-3 overflow-x-auto text-xs font-mono text-zinc-100 shadow-inner">
                {children}
              </pre>
            )
          case 'code':
            // Inline code or code inside pre block
            const isInsidePre = element.parentElement?.tagName.toLowerCase() === 'pre'
            if (isInsidePre) {
              return <code key={index} className="block select-all whitespace-pre leading-normal">{children}</code>
            }
            return (
              <code key={index} className="bg-accent px-1.5 py-0.5 rounded-md text-xs font-mono text-primary font-bold border border-border/20">
                {children}
              </code>
            )
          case 'span':
            if (element.getAttribute('data-spoiler') === 'true') {
              return <Spoiler key={index}>{children}</Spoiler>
            }
            return <span key={index}>{children}</span>
          case 'a':
            const href = element.getAttribute('href') || ''
            
            // Check YouTube link
            const ytRegex = /(?:youtube\.from\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/ ]{11})/i
            // In standard TipTap it might look like youtube.com
            const ytUrlRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/ ]{11})/i
            const ytMatch = href.match(ytUrlRegex)
            if (ytMatch && ytMatch[1]) {
              return <YouTubeEmbed key={index} videoId={ytMatch[1]} />
            }

            // Check Twitter/X link
            const twitterRegex = /(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)\/status\/(\d+)/i
            const twMatch = href.match(twitterRegex)
            if (twMatch && twMatch[1] && twMatch[2]) {
              return <TwitterEmbed key={index} username={twMatch[1]} tweetId={twMatch[2]} url={href} />
            }

            return (
              <a
                key={index}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-primary hover:underline font-bold inline-flex items-center gap-0.5 transition-all"
              >
                {children}
                <ExternalLink size={10} className="opacity-60 inline-block align-baseline" />
              </a>
            )
          default:
            return <span key={index}>{children}</span>
        }
      }

      return null
    }

    const reactElements = Array.from(doc.body.childNodes).map((node, i) => convertNode(node, i))
    return <span className={className}>{reactElements}</span>
  } catch (err) {
    // fallback
    return <span className={cn('whitespace-pre-wrap', className)}>{renderTextWithFlags(text)}</span>
  }
}
