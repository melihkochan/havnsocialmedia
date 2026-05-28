'use client'

import React, { useState, useEffect } from 'react'
import { splitMessageParts, getFlagImageUrl } from '@/lib/flags'
import { cn } from '@/lib/utils'
import { Play, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getDisplayName } from '@/lib/profile-display'

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
        "relative inline-block rounded cursor-pointer transition-all duration-300 mx-0.5 select-none overflow-hidden align-[-2px] text-center",
        revealed 
          ? "bg-muted/30 border border-border/40 text-foreground px-1.5 py-0.5 select-text min-w-0" 
          : "bg-zinc-950 dark:bg-zinc-900 border border-zinc-800/80 text-transparent px-2.5 py-0.5 min-w-[76px]"
      )}
      title={revealed ? "Gizlemek için tıklayın" : "Gösterisi için tıklayın (Spoiler)"}
    >
      <span className={cn("transition-all duration-300", !revealed && "blur-[5px] opacity-15 pointer-events-none")}>
        {children}
      </span>
      {!revealed && (
        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black tracking-widest text-primary uppercase select-none pointer-events-none animate-pulse">
          SPOILER
        </span>
      )}
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

// Custom Twitter/X Profile Embed Card
function TwitterProfileEmbed({ username, url }: { username: string; url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="block w-full my-4 p-4 bg-card/65 backdrop-blur-md border border-border/80 rounded-2xl hover:border-primary/45 shadow-sm hover:shadow-md transition-all duration-300 group text-left min-w-0"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-black uppercase flex-shrink-0">
            {username.slice(0, 2)}
          </div>
          <div className="min-w-0 flex flex-col">
            <span className="text-xs font-black text-foreground truncate">@{username}</span>
            <span className="text-[9px] text-muted-foreground">Twitter / X Profili</span>
          </div>
        </div>
        <svg className="w-4.5 h-4.5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      </div>
    </a>
  )
}

// Custom Dynamic Havn Post Embed Card
function HavnPostEmbed({ postId, url }: { postId: string; url: string }) {
  const [postData, setPostData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function fetchPost() {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('posts')
          .select(`
            id,
            content,
            image_url,
            created_at,
            profiles (
              username,
              avatar_url,
              first_name,
              last_name
            )
          `)
          .eq('id', postId)
          .single()

        if (active && !error && data) {
          setPostData(data)
        }
      } catch (err) {
        console.error(err)
      } finally {
        if (active) setLoading(false)
      }
    }
    fetchPost()
    return () => {
      active = false
    }
  }, [postId])

  if (loading) {
    return (
      <div className="w-full my-4 p-4 bg-card/65 border border-border/80 rounded-2xl animate-pulse">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-muted rounded w-1/3" />
            <div className="h-2 bg-muted rounded w-1/4" />
          </div>
        </div>
        <div className="h-3 bg-muted rounded w-3/4 mt-3" />
      </div>
    )
  }

  if (!postData) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="inline-flex items-center gap-1 text-primary hover:underline font-bold"
      >
        Gönderi ({url.length > 30 ? url.slice(0, 30) + '...' : url})
        <ExternalLink size={10} />
      </a>
    )
  }

  const profile = postData.profiles
  const textContent = (postData.content || '').replace(/<[^>]*>/g, '')
  const displayName = profile ? getDisplayName(profile) : 'Kullanıcı'

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="block w-full my-4 p-4 bg-card/65 backdrop-blur-md border border-border/80 rounded-2xl hover:border-primary/45 shadow-sm hover:shadow-md transition-all duration-300 text-left min-w-0"
    >
      <div className="flex items-center gap-2 mb-2">
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} alt={profile.username} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-black uppercase flex-shrink-0">
            {profile?.username?.slice(0, 2) || 'HV'}
          </div>
        )}
        <div className="min-w-0 flex flex-col">
          <span className="text-xs font-black text-foreground truncate">{displayName}</span>
          <span className="text-[9px] text-muted-foreground">@{profile?.username}</span>
        </div>
        <span className="text-[9px] text-primary bg-primary/10 px-1.5 py-0.5 rounded font-black ml-auto uppercase tracking-wider">
          Havn Gönderisi
        </span>
      </div>
      <div className="text-xs text-foreground/90 leading-relaxed truncate max-w-full font-medium">
        {textContent || "Görsel gönderi"}
      </div>
      {postData.image_url && (
        <div className="mt-3 rounded-lg overflow-hidden border border-border/60 max-h-32 relative aspect-[3/1] w-full">
          <img src={postData.image_url} alt="Havn post preview" className="w-full h-full object-cover" />
        </div>
      )}
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

  // Detect HTML
  const isHtml = text.trim().startsWith('<') && text.trim().endsWith('>')

  if (!mounted) {
    // SSR / First-load plain text fallback
    const stripped = text.replace(/<[^>]*>/g, '')
    if (isHtml) {
      return <div className={cn('whitespace-pre-wrap', className)}>{renderTextWithFlags(stripped)}</div>
    }
    return <span className={cn('whitespace-pre-wrap', className)}>{renderTextWithFlags(stripped)}</span>
  }

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
            return <div key={index} className="mb-2.5 last:mb-0 leading-relaxed break-words">{children}</div>
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
            const ytUrlRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/ ]{11})/i
            const ytMatch = href.match(ytUrlRegex)
            if (ytMatch && ytMatch[1]) {
              return <YouTubeEmbed key={index} videoId={ytMatch[1]} />
            }

            // Check Twitter/X tweet link
            const twitterRegex = /(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)\/status\/(\d+)/i
            const twMatch = href.match(twitterRegex)
            if (twMatch && twMatch[1] && twMatch[2]) {
              return <TwitterEmbed key={index} username={twMatch[1]} tweetId={twMatch[2]} url={href} />
            }

            // Check Twitter/X profile link
            const twitterProfileRegex = /(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)(?:\/)?$/i
            const twProfileMatch = href.match(twitterProfileRegex)
            if (twProfileMatch && twProfileMatch[1]) {
              const username = twProfileMatch[1]
              const excluded = ['home', 'explore', 'messages', 'notifications', 'settings', 'search', 'i', 'hashtag', 'privacy', 'tos', 'about', 'login', 'signup']
              if (!excluded.includes(username.toLowerCase())) {
                return <TwitterProfileEmbed key={index} username={username} url={href} />
              }
            }

            // Check Havn internal post link
            const havnPostRegex = /\/post\/([a-zA-Z0-9-]+)/i
            const havnPostMatch = href.match(havnPostRegex)
            if (havnPostMatch && havnPostMatch[1]) {
              return <HavnPostEmbed key={index} postId={havnPostMatch[1]} url={href} />
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
    return <div className={className}>{reactElements}</div>
  } catch (err) {
    // fallback
    return <span className={cn('whitespace-pre-wrap', className)}>{renderTextWithFlags(text)}</span>
  }
}
