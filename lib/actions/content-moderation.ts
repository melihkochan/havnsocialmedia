'use server'

/**
 * Unified content moderation — runs two layers:
 *  Layer 1: DB-backed keyword cache (fast, ~0ms)
 *  Layer 2: OpenAI Moderation API (semantic, ~150ms, graceful fallback)
 */

import { containsNsfw } from '@/lib/nsfw-filter'
import { moderateContent } from './openai-moderation'
import type { Locale } from '@/lib/i18n'

export interface ContentCheckResult {
  blocked: boolean
  reason?: 'keyword' | 'ai_moderation'
  message: string
}

const BLOCKED_MESSAGES: Record<Locale, Record<'keyword' | 'ai_moderation', string>> = {
  tr: {
    keyword: 'İçerik topluluk kurallarını ihlal ediyor.',
    ai_moderation: 'İçerik yapay zeka moderasyonundan geçemedi.',
  },
  en: {
    keyword: 'Content violates community guidelines.',
    ai_moderation: 'Content was flagged by AI moderation.',
  },
}

/**
 * Check content against both moderation layers.
 * Returns a result indicating whether content should be blocked and why.
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

  // ── Layer 2: OpenAI Moderation (graceful — passes through on any error) ──
  const aiResult = await moderateContent(text)
  if (aiResult.flagged) {
    return {
      blocked: true,
      reason: 'ai_moderation',
      message: BLOCKED_MESSAGES[locale].ai_moderation,
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
