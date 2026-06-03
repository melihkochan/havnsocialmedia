/**
 * NSFW content filter — now powered by DB-backed cache + bypass detection.
 *
 * This module is server-only ('use server' would conflict with dynamic import usage).
 * The filter normalizes bypass attempts (s.i.k → sik) and checks against
 * the cached word set loaded from the banned_words table.
 */

import { getNsfwWordSet } from './nsfw-cache'

/**
 * Normalize text to catch common bypass attempts:
 * - Turkish chars → ASCII equivalents
 * - Punctuation/dots between letters removed (s.i.k → sik)
 * - Repeated characters collapsed (siiik → sik)  [optional — not done here to avoid false positives]
 */
function normalize(str: string): string {
  return str
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    // Remove punctuation that may be inserted between letters to bypass filters
    .replace(/[.\-_*•·]/g, '')
    // Remove remaining non-alphanumeric except spaces
    .replace(/[^a-z0-9\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Check if text contains NSFW content based on the DB-backed word cache.
 * Returns true if content should be blocked.
 * Never throws — silently returns false on error.
 */
export async function containsNsfw(text: string): Promise<boolean> {
  if (!text || !text.trim()) return false

  try {
    const wordSet = await getNsfwWordSet()
    const normalizedText = normalize(text)
    const words = normalizedText.split(/\s+/)

    // Word-level exact match
    for (const word of words) {
      if (word && wordSet.has(word)) return true
    }

    // Substring match (catches compound words / phrases like "pornizle")
    for (const banned of wordSet) {
      if (banned.length >= 3 && normalizedText.includes(banned)) return true
    }

    return false
  } catch {
    return false
  }
}
