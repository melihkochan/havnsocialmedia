'use server'

/**
 * OpenAI Moderation API integration.
 * Uses the FREE /v1/moderations endpoint (not GPT — no cost).
 * Catches all semantic NSFW content that keyword filters miss.
 *
 * If OPENAI_API_KEY is not set, this layer is gracefully skipped.
 */

export interface ModerationResult {
  flagged: boolean
  categories: string[]
  error?: string
}

export async function moderateContent(text: string): Promise<ModerationResult> {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    // API key not configured — skip this layer silently
    return { flagged: false, categories: [] }
  }

  if (!text || !text.trim()) {
    return { flagged: false, categories: [] }
  }

  try {
    const response = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        input: text,
        model: 'text-moderation-latest',
      }),
      // Short timeout — if OpenAI is slow, don't block the user's post
      signal: AbortSignal.timeout(4000),
    })

    if (!response.ok) {
      console.warn(`[NSFW] OpenAI Moderation API error: ${response.status}`)
      return { flagged: false, categories: [], error: `API error: ${response.status}` }
    }

    const data = await response.json()
    const result = data.results?.[0]

    if (!result) return { flagged: false, categories: [] }

    const flaggedCategories = Object.entries(
      result.categories as Record<string, boolean>
    )
      .filter(([, v]) => v)
      .map(([k]) => k)

    return {
      flagged: result.flagged as boolean,
      categories: flaggedCategories,
    }
  } catch (err: unknown) {
    // Network error, timeout, etc. — gracefully pass content through
    if (err instanceof Error && err.name === 'TimeoutError') {
      console.warn('[NSFW] OpenAI Moderation API timed out — skipping AI layer')
    }
    return { flagged: false, categories: [], error: String(err) }
  }
}
