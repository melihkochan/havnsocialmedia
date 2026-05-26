import { createServiceClient } from '@/lib/supabase/server'

// Gamification XP Rewards (Server-Only, NOT exposed as a Server Action)
export async function rewardXP(userId: string, amount: number) {
  try {
    const serviceClient = await createServiceClient()
    
    // Get current XP
    const { data: profile, error: getError } = await serviceClient
      .from('profiles')
      .select('xp')
      .eq('id', userId)
      .single()

    if (getError || !profile) return { error: 'Profil bulunamadı.' }

    const newXp = (profile.xp || 0) + amount

    const { error: updateError } = await serviceClient
      .from('profiles')
      .update({ xp: newXp })
      .eq('id', userId)

    if (updateError) return { error: updateError.message }
    return { success: true, newXp }
  } catch (err: any) {
    return { error: err.message }
  }
}
