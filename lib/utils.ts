import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getSessionId(accessToken?: string): string | null {
  if (!accessToken) return null
  try {
    const payloadBase64 = accessToken.split('.')[1]
    const payloadJson = Buffer.from(payloadBase64, 'base64').toString('utf8')
    const payload = JSON.parse(payloadJson)
    return payload.session_id || null
  } catch {
    return null
  }
}

export function getSafeTimestamp(dateStr?: string | null): string {
  if (!dateStr) return ""
  const formatted = dateStr.includes("T") ? dateStr : dateStr.replace(" ", "T")
  const t = Date.parse(formatted)
  return isNaN(t) ? "" : String(t)
}

export function getPlainTextLength(html: string): number {
  if (!html) return 0
  const temp = html
    .replace(/<\/p><p>/g, '\n')
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<[^>]*>/g, '')
  return temp.length
}

export function getParagraphCount(html: string): number {
  if (!html) return 0
  const collapsed = html.replace(/(<p>\s*<br\s*\/?>\s*<\/p>|<p>\s*<\/p>){3,}/gi, '<p><br></p><p><br></p>')
  return (collapsed.match(/<p>/g) || []).length
}


