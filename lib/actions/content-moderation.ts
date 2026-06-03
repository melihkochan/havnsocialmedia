'use server'

/**
 * Unified content moderation — runs two layers:
 *  Layer 1: DB-backed keyword cache (fast, ~0ms)
 *  Layer 2: OpenAI Moderation API (semantic, ~150ms, graceful fallback)
 */

import { containsNsfw } from '@/lib/nsfw-filter'
import type { Locale } from '@/lib/i18n'

export interface ContentCheckResult {
  blocked: boolean
  reason?: 'keyword'
  message: string
}

const BLOCKED_MESSAGES: Record<Locale, Record<'keyword', string>> = {
  tr: {
    keyword: 'İçerik topluluk kurallarını ihlal ediyor.',
  },
  en: {
    keyword: 'Content violates community guidelines.',
  },
}

/**
 * Check content against the local keyword cache moderation layer.
 * Returns a result indicating whether content should be blocked.
 */
export async function checkContent(
  text: string,
  locale: Locale = 'tr'
): Promise<ContentCheckResult> {
  if (!text || !text.trim()) {
    return { blocked: false, message: '' }
  }

  // ── Layer 1: Keyword cache ────────────────────────────────────────────────
  const keywordFlagged = await containsNsfw(text)
  if (keywordFlagged) {
    return {
      blocked: true,
      reason: 'keyword',
      message: BLOCKED_MESSAGES[locale].keyword,
    }
  }

  return { blocked: false, message: '' }
}

/**
 * Check multiple text fields at once.
 * Returns the first blocked result found, or a passing result.
 */
export async function checkMultipleContent(
  fields: string[],
  locale: Locale = 'tr'
): Promise<ContentCheckResult> {
  for (const field of fields) {
    if (!field) continue
    const result = await checkContent(field, locale)
    if (result.blocked) return result
  }
  return { blocked: false, message: '' }
}
