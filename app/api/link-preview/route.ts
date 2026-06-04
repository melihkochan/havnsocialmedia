import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function extractMetaTag(html: string, propertyOrName: string): string | null {
  const regex = new RegExp(
    `<meta[^>]+(?:property|name)=["']${propertyOrName}["'][^>]+content=["']([^"']+)["']`,
    'i'
  )
  const match = html.match(regex)
  if (match) return decodeHtmlEntities(match[1])

  const regexAlt = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${propertyOrName}["']`,
    'i'
  )
  const matchAlt = html.match(regexAlt)
  if (matchAlt) return decodeHtmlEntities(matchAlt[1])

  return null
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return match ? decodeHtmlEntities(match[1].trim()) : null
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const urlParam = searchParams.get('url')

    if (!urlParam) {
      return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 })
    }

    let targetUrl: URL
    try {
      targetUrl = new URL(urlParam)
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }

    if (targetUrl.protocol !== 'http:' && targetUrl.protocol !== 'https:') {
      return NextResponse.json({ error: 'Invalid protocol' }, { status: 400 })
    }

    const hostname = targetUrl.hostname.toLowerCase()
    const isLocal =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('172.16.') ||
      hostname.startsWith('172.17.') ||
      hostname.startsWith('172.18.') ||
      hostname.startsWith('172.19.') ||
      hostname.startsWith('172.20.') ||
      hostname.startsWith('172.21.') ||
      hostname.startsWith('172.22.') ||
      hostname.startsWith('172.23.') ||
      hostname.startsWith('172.24.') ||
      hostname.startsWith('172.25.') ||
      hostname.startsWith('172.26.') ||
      hostname.startsWith('172.27.') ||
      hostname.startsWith('172.28.') ||
      hostname.startsWith('172.29.') ||
      hostname.startsWith('172.30.') ||
      hostname.startsWith('172.31.')

    if (isLocal) {
      return NextResponse.json({ error: 'Access denied to local network' }, { status: 403 })
    }

    const response = await fetch(targetUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; HavnLinkBot/1.0; +https://havn.com)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(4000)
    })

    if (!response.ok) {
      return NextResponse.json({ error: `Failed to fetch page: ${response.statusText}` }, { status: response.status })
    }

    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
      return NextResponse.json({
        title: targetUrl.hostname,
        description: `Content Type: ${contentType}`,
        image: null,
        siteName: targetUrl.hostname
      })
    }

    const html = await response.text()

    const title = extractMetaTag(html, 'og:title') || extractMetaTag(html, 'twitter:title') || extractTitle(html) || targetUrl.hostname
    const description = extractMetaTag(html, 'og:description') || extractMetaTag(html, 'twitter:description') || extractMetaTag(html, 'description') || ''
    const image = extractMetaTag(html, 'og:image') || extractMetaTag(html, 'twitter:image') || null
    const siteName = extractMetaTag(html, 'og:site_name') || targetUrl.hostname

    let absoluteImage = image
    if (image && !image.startsWith('http://') && !image.startsWith('https://')) {
      try {
        absoluteImage = new URL(image, targetUrl.toString()).toString()
      } catch {
        absoluteImage = null
      }
    }

    return NextResponse.json({
      title,
      description,
      image: absoluteImage,
      siteName
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
