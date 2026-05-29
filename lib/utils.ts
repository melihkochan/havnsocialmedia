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


