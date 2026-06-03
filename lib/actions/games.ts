'use server'

import { createClient } from '@/lib/supabase/server'
import { rewardXP } from '@/lib/xp'
import { revalidatePath } from 'next/cache'

export interface LeaderboardEntry {
  id: string
  score: number
  created_at: string
  user_id: string
  username: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  is_verified: boolean
  is_gold: boolean
}

/**
 * Submits a game score. If it's the first qualifying score of the day, awards XP.
 */
export async function submitGameScore(gameType: 'wordle' | 'trivia' | 'reflex', score: number) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Giriş yapmalısınız.' }

    // 1. Check if the user has already played and received XP today for this game
    const startOfToday = new Date()
    startOfToday.setUTCHours(0, 0, 0, 0)

    const { data: todayScores, error: checkError } = await supabase
      .from('game_scores')
      .select('id, score')
      .eq('user_id', user.id)
      .eq('game_type', gameType)
      .gte('created_at', startOfToday.toISOString())

    if (checkError) {
      return { error: 'Skor kontrolü başarısız: ' + checkError.message }
    }

    const hasPlayedToday = todayScores && todayScores.length > 0

    // 2. Insert the new score
    const { data: inserted, error: insertError } = await supabase
      .from('game_scores')
      .insert({
        user_id: user.id,
        game_type: gameType,
        score: score,
      })
      .select()
      .single()

    if (insertError) {
      return { error: 'Skor kaydedilemedi: ' + insertError.message }
    }

    // 3. Determine XP reward eligibility
    let xpEarned = 0
    let eligibilityMsg = ''

    if (!hasPlayedToday) {
      // User is eligible for XP reward today
      if (gameType === 'wordle') {
        // Wordle solved (score is points: e.g. 10 to 100 based on tries)
        if (score > 0) {
          xpEarned = 20
          eligibilityMsg = 'Wordle kelimesini çözdünüz!'
        }
      } else if (gameType === 'trivia') {
        // Trivia: score is number of correct answers (0-5)
        if (score >= 4) {
          xpEarned = score === 5 ? 25 : 15
          eligibilityMsg = `${score}/5 doğru cevap verdiniz!`
        } else {
          eligibilityMsg = 'XP kazanmak için en az 4 doğru cevap gereklidir.'
        }
      } else if (gameType === 'reflex') {
        // Reflex: score is reaction time in ms (lower is better)
        if (score > 0 && score < 350) {
          xpEarned = score < 220 ? 25 : 15
          eligibilityMsg = `Tepki süreniz: ${score}ms!`
        } else {
          eligibilityMsg = 'XP kazanmak için tepki süreniz 350ms altında olmalıdır.'
        }
      }

      if (xpEarned > 0) {
        const rewardResult = await rewardXP(user.id, xpEarned)
        if (rewardResult.error) {
          console.error('XP Ödülü verilemedi:', rewardResult.error)
        }
      }
    } else {
      eligibilityMsg = 'Bugün bu oyundan zaten XP ödülü aldınız.'
    }

    // Clear caches to refresh stats everywhere
    revalidatePath('/', 'layout')

    return {
      success: true,
      scoreSaved: inserted,
      xpEarned,
      message: eligibilityMsg,
      alreadyClaimed: hasPlayedToday,
    }
  } catch (err: any) {
    return { error: err.message }
  }
}

/**
 * Fetches leaderboard entries for a given game type and period.
 */
export async function getGameLeaderboard(
  gameType: 'wordle' | 'trivia' | 'reflex',
  period: 'daily' | 'weekly' | 'all'
): Promise<{ error?: string; leaderboard?: LeaderboardEntry[] }> {
  try {
    const supabase = await createClient()

    let query = supabase
      .from('game_scores')
      .select(`
        id,
        score,
        created_at,
        user_id,
        profiles (
          id,
          username,
          first_name,
          last_name,
          avatar_url,
          is_verified,
          is_gold
        )
      `)
      .eq('game_type', gameType)

    // Apply period filters
    if (period === 'daily') {
      const startOfDay = new Date()
      startOfDay.setUTCHours(0, 0, 0, 0)
      query = query.gte('created_at', startOfDay.toISOString())
    } else if (period === 'weekly') {
      const startOfWeek = new Date()
      const day = startOfWeek.getUTCDay()
      const diff = startOfWeek.getUTCDate() - day + (day === 0 ? -6 : 1) // Adjust for Sunday
      startOfWeek.setUTCDate(diff)
      startOfWeek.setUTCHours(0, 0, 0, 0)
      query = query.gte('created_at', startOfWeek.toISOString())
    }

    // Order by score: Reflex is ASC (faster is better), others are DESC (higher is better)
    if (gameType === 'reflex') {
      query = query.order('score', { ascending: true })
    } else {
      query = query.order('score', { ascending: false })
    }

    // Fetch top scores
    const { data, error } = await query.limit(200)

    if (error) {
      return { error: error.message }
    }

    // Group by user_id to get only the BEST score of each user in this period
    const userBestScores = new Map<string, any>()
    for (const row of (data || [])) {
      if (!row.profiles) continue
      
      const userId = row.user_id
      const existing = userBestScores.get(userId)
      
      const isBetter = !existing || (
        gameType === 'reflex' ? row.score < existing.score : row.score > existing.score
      )
      
      if (isBetter) {
        userBestScores.set(userId, row)
      }
    }

    // Convert map to list and sort
    const sortedList = Array.from(userBestScores.values())
      .map((row: any) => {
        const prof = row.profiles as any
        return {
          id: row.id,
          score: row.score,
          created_at: row.created_at,
          user_id: row.user_id,
          username: prof.username || '',
          first_name: prof.first_name || null,
          last_name: prof.last_name || null,
          avatar_url: prof.avatar_url || null,
          is_verified: !!prof.is_verified,
          is_gold: !!prof.is_gold,
        }
      })
      .sort((a, b) => {
        return gameType === 'reflex' ? a.score - b.score : b.score - a.score
      })

    // Return top 20
    return { leaderboard: sortedList.slice(0, 20) }
  } catch (err: any) {
    return { error: err.message }
  }
}
