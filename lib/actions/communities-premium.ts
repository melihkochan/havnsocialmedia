'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// 1. Dynamic Accent Color Updates
export async function updateCommunityAccent(communityId: string, color: string) {
  const supabase = await createClient()
  const serviceClient = await createServiceClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Giriş yapmalısınız.' }

  // Verify that the user is owner or moderator
  const { data: membership } = await supabase
    .from('community_members')
    .select('role, status')
    .eq('community_id', communityId)
    .eq('user_id', user.id)
    .single()

  if (!membership || membership.status !== 'approved' || (membership.role !== 'owner' && membership.role !== 'moderator')) {
    return { error: 'Bu toplulukta renk ayarını değiştirme yetkiniz yok.' }
  }

  const { error } = await serviceClient
    .from('communities')
    .update({ accent_color: color })
    .eq('id', communityId)

  if (error) return { error: error.message }

  const { data: community } = await supabase.from('communities').select('slug').eq('id', communityId).single()
  if (community) {
    revalidatePath(`/communities/${community.slug}`)
  }
  revalidatePath('/communities')
  revalidatePath('/feed')

  return { success: true }
}



