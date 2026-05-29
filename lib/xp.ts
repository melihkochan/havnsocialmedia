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

    // Check if double XP is active in system settings
    const { data: doubleXpSetting } = await serviceClient
      .from('system_settings')
      .select('value')
      .eq('key', 'double_xp_active')
      .maybeSingle()

    const doubleXp = doubleXpSetting?.value === true || doubleXpSetting?.value === 'true'
    const finalAmount = doubleXp ? amount * 2 : amount

    const newXp = (profile.xp || 0) + finalAmount

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
