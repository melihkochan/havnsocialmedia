'use server'

import { createClient } from '@/lib/supabase/server'
import { getIstanbulDateString } from '@/lib/streak-utils'

export async function getUserActivity(userId: string) {
  try {
    const supabase = await createClient()
    
    // Calculate 365 days ago
    const oneYearAgo = new Date()
    oneYearAgo.setDate(oneYearAgo.getDate() - 365)
    const oneYearAgoStr = oneYearAgo.toISOString()

    // Fetch dates in parallel
    const [posts, comments, likes, commentLikes, suggestions, votes] = await Promise.all([
      supabase.from('posts').select('created_at').eq('user_id', userId).gte('created_at', oneYearAgoStr),
      supabase.from('comments').select('created_at').eq('user_id', userId).gte('created_at', oneYearAgoStr),
      supabase.from('likes').select('created_at').eq('user_id', userId).gte('created_at', oneYearAgoStr),
      supabase.from('comment_likes').select('created_at').eq('user_id', userId).gte('created_at', oneYearAgoStr),
      supabase.from('suggestions').select('created_at').eq('user_id', userId).gte('created_at', oneYearAgoStr),
      supabase.from('suggestion_votes').select('created_at').eq('user_id', userId).gte('created_at', oneYearAgoStr),
    ])

    const counts: Record<string, number> = {}

    const addActivity = (createdAt: string | null | undefined) => {
      if (!createdAt) return
      try {
        const dateStr = getIstanbulDateString(new Date(createdAt))
        counts[dateStr] = (counts[dateStr] || 0) + 1
      } catch (err) {
        // ignore invalid dates
      }
    }

    posts.data?.forEach(x => addActivity(x.created_at))
    comments.data?.forEach(x => addActivity(x.created_at))
    likes.data?.forEach(x => addActivity(x.created_at))
    commentLikes.data?.forEach(x => addActivity(x.created_at))
    suggestions.data?.forEach(x => addActivity(x.created_at))
    votes.data?.forEach(x => addActivity(x.created_at))

    return { success: true, data: counts }
  } catch (error: any) {
    console.error('Error fetching user activity:', error)
    return { success: false, error: error.message, data: {} }
  }
}
