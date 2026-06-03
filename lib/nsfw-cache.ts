/**
 * Server-side in-process NSFW word cache.
 * Loads banned words from Supabase banned_words table on first use,
 * then caches them in globalThis for 5 minutes to avoid repeated DB calls.
 */

declare global {
  // eslint-disable-next-line no-var
  var __nsfwWords: Set<string> | undefined
  // eslint-disable-next-line no-var
  var __nsfwLoadedAt: number | undefined
}

const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

/** Hardcoded fallback words — always active even if DB is unreachable */
const FALLBACK_WORDS = new Set([
  'porn', 'porno', 'sikiş', 'sikis', 'yarrak', 'yarak', 'amcık', 'amcik',
  'nude', 'orospu', 'pezevenk', 'gavat', 'ibne', 'fahişe', 'fahise',
  'kaltak', 'escorts', 'slut', 'sluts', 'pussy', 'asshole', 'vagina',
  'masturbation', 'masturbasyon',
])

/**
 * Returns the current NSFW word set, loading from DB if cache is stale.
 * Never throws — falls back to hardcoded list on any error.
 */
export async function getNsfwWordSet(): Promise<Set<string>> {
  const now = Date.now()

  // Return cached value if still fresh
  if (
    globalThis.__nsfwWords &&
    globalThis.__nsfwLoadedAt &&
    now - globalThis.__nsfwLoadedAt < CACHE_TTL_MS
  ) {
    return globalThis.__nsfwWords
  }

  // Load fresh from DB
  try {
    const { createServiceClient } = await import('@/lib/supabase/server')
    const supabase = await createServiceClient()
    const { data, error } = await supabase
      .from('banned_words')
      .select('word')

    if (!error && data) {
      const dbWords = new Set<string>(data.map((r: { word: string }) => r.word.toLowerCase().trim()))
      // Merge with fallback words
      FALLBACK_WORDS.forEach((w) => dbWords.add(w))
      globalThis.__nsfwWords = dbWords
      globalThis.__nsfwLoadedAt = now
      return dbWords
    }
  } catch {
    // DB unreachable — use fallback
  }

  // Fallback
  globalThis.__nsfwWords = new Set(FALLBACK_WORDS)
  globalThis.__nsfwLoadedAt = now
  return globalThis.__nsfwWords
}

/**
 * Force-invalidate the NSFW word cache.
 * Call this after adding/removing banned words from the admin panel.
 */
export function invalidateNsfwCache(): void {
  globalThis.__nsfwWords = undefined
  globalThis.__nsfwLoadedAt = undefined
}
