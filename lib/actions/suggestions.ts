'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { isFounder } from '@/lib/founder'

export async function createSuggestion(
  title: string,
  description: string,
  isAnonymous: boolean = false,
  isPrivate: boolean = false
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Öneri göndermek için giriş yapmalısınız.' }

  if (!title || !title.trim() || !description || !description.trim()) {
    return { error: 'Başlık ve açıklama alanları doldurulmalıdır.' }
  }

  const { data, error } = await supabase
    .from('suggestions')
    .insert({
      title: title.trim(),
      description: description.trim(),
      user_id: user.id,
      status: 'open',
      is_anonymous: isAnonymous,
      is_private: isPrivate
    })
    .select()
    .single()

  if (error) {
    console.error('createSuggestion error:', error)
    return { error: 'Öneri kaydedilemedi: ' + error.message }
  }

  // Notify all administrators/founders about the new suggestion
  try {
    const { data: admins } = await supabase
      .from('profiles')
      .select('id')
      .or('username.eq.melih,is_gold.eq.true')

    if (admins && admins.length > 0) {
      const { createNotification } = await import('@/lib/actions/notifications')
      for (const admin of admins) {
        if (admin.id !== user.id) {
          await createNotification(
            admin.id,
            user.id,
            'support_reply',
            null,
            null,
            {
              message: `Yeni bir öneri paylaşıldı: "${title.trim().slice(0, 40)}${title.trim().length > 40 ? '...' : ''}"`,
              postPreview: data.id
            }
          )
        }
      }
    }
  } catch (err) {
    console.warn('Could not send notification to admins for new suggestion:', err)
  }

  revalidatePath('/suggestions')
  return { success: true, suggestion: data }
}

export async function getSuggestions(statusFilter?: string, sortBy: 'votes' | 'new' = 'votes') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const currentUserId = user?.id || null

  let query = supabase
    .from('suggestions')
    .select(`
      *,
      suggestion_votes (
        vote_type,
        user_id
      )
    `)

  if (statusFilter && statusFilter !== 'all') {
    query = query.eq('status', statusFilter)
  }

  const { data, error } = await query

  if (error) {
    console.error('getSuggestions error:', error)
    return []
  }

  if (!data || data.length === 0) return []

  // Fetch profiles of users who created suggestions
  const authorIds = Array.from(new Set(data.map((item: any) => item.user_id)))
  let profilesMap: Record<string, any> = {}

  if (authorIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, first_name, last_name, xp, is_verified, is_gold')
      .in('id', authorIds)

    if (!profilesError && profiles) {
      profiles.forEach((p: any) => {
        profilesMap[p.id] = p
      })
    }
  }

  // Fetch founder/admin profile if suggestions have admin notes
  let adminProfile: any = null
  const hasNotes = data.some((item: any) => item.admin_note !== null)
  if (hasNotes) {
    const { data: adminData } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, first_name, last_name, is_verified, is_gold')
      .eq('username', 'melih')
      .single()
    if (adminData) {
      adminProfile = adminData
    }
  }

  // Fetch current user's profile to check if they are an admin
  let isCurrentUserAdmin = false
  if (currentUserId) {
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', currentUserId)
      .single()
    isCurrentUserAdmin = currentProfile?.is_gold || isFounder(currentProfile)
  }

  // Fetch comment counts
  let commentCountsMap: Record<string, number> = {}
  try {
    const { data: cData, error: cErr } = await supabase
      .from('suggestion_comments')
      .select('id, suggestion_id')
    if (!cErr && cData) {
      cData.forEach((c: any) => {
        commentCountsMap[c.suggestion_id] = (commentCountsMap[c.suggestion_id] || 0) + 1
      })
    }
  } catch (err) {
    console.warn('Could not fetch suggestion comment counts (table might not exist yet):', err)
  }

  // Map and aggregate
  const mapped = data.map((item: any) => {
    const votes = item.suggestion_votes || []
    let score = 0
    let userVote = 0

    votes.forEach((v: any) => {
      score += v.vote_type
      if (currentUserId && v.user_id === currentUserId) {
        userVote = v.vote_type
      }
    })

    let authorProfile = profilesMap[item.user_id] || null
    if (item.is_anonymous) {
      if (!isCurrentUserAdmin && item.user_id !== currentUserId) {
        authorProfile = {
          username: 'gizli',
          first_name: 'Gizli',
          last_name: 'Kullanıcı',
          avatar_url: null,
          is_verified: false,
          is_gold: false,
          xp: 0
        }
      }
    }

    return {
      ...item,
      score,
      userVote,
      voteCount: votes.length,
      commentCount: commentCountsMap[item.id] || 0,
      profiles: authorProfile,
      adminProfile
    }
  })

  // Sort
  if (sortBy === 'new') {
    mapped.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  } else {
    // sort by score desc, then by date desc
    mapped.sort((a: any, b: any) => {
      if (b.score !== a.score) {
        return b.score - a.score
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }

  return mapped
}

export async function voteSuggestion(suggestionId: string, voteType: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Oy vermek için giriş yapmalısınız.' }

  if (![1, 0].includes(voteType)) {
    return { error: 'Geçersiz oy tipi.' }
  }

  // Fetch the suggestion to check status
  const { data: suggestion, error: fetchErr } = await supabase
    .from('suggestions')
    .select('status')
    .eq('id', suggestionId)
    .single()

  if (fetchErr || !suggestion) {
    return { error: 'Öneri bulunamadı.' }
  }

  if (suggestion.status === 'closed') {
    return { error: 'Kapatılmış bir öneriye oy verilemez.' }
  }

  if (voteType === 0) {
    // Delete vote
    const { error } = await supabase
      .from('suggestion_votes')
      .delete()
      .eq('suggestion_id', suggestionId)
      .eq('user_id', user.id)

    if (error) {
      console.error('delete vote error:', error)
      return { error: 'Oy silinemedi.' }
    }
  } else {
    // Upsert vote
    const { error } = await supabase
      .from('suggestion_votes')
      .upsert({
        suggestion_id: suggestionId,
        user_id: user.id,
        vote_type: voteType
      }, {
        onConflict: 'suggestion_id,user_id'
      })

    if (error) {
      console.error('upsert vote error:', error)
      return { error: 'Oy kaydedilemedi.' }
    }
  }

  revalidatePath('/suggestions')
  return { success: true }
}

export async function updateSuggestionStatus(suggestionId: string, status: string, adminNote: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Giriş yapmalısınız.' }

  // Fetch current user's profile to verify if they are an admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.is_gold || isFounder(profile)
  if (!isAdmin) {
    return { error: 'Bu işlem için yetkiniz bulunmamaktadır.' }
  }

  if (!['open', 'in_progress', 'completed', 'closed'].includes(status)) {
    return { error: 'Geçersiz durum.' }
  }

  // Fetch existing suggestion to get the current admin_notes array
  const { data: suggestion } = await supabase
    .from('suggestions')
    .select('admin_notes, admin_note, status, updated_at')
    .eq('id', suggestionId)
    .single()

  let notes = []
  if (suggestion?.admin_notes && Array.isArray(suggestion.admin_notes)) {
    notes = [...suggestion.admin_notes]
  } else if (suggestion?.admin_note) {
    // Migrate existing single note if any
    notes.push({
      admin_id: user.id,
      admin_username: 'melih',
      admin_first_name: 'Melih',
      admin_last_name: 'KOÇHAN',
      admin_avatar_url: null,
      note: suggestion.admin_note,
      status: suggestion.status || 'open',
      created_at: suggestion.updated_at || new Date().toISOString()
    })
  }

  if (adminNote.trim()) {
    notes.push({
      admin_id: user.id,
      admin_username: profile.username || 'admin',
      admin_first_name: profile.first_name || 'Yönetici',
      admin_last_name: profile.last_name || '',
      admin_avatar_url: profile.avatar_url,
      note: adminNote.trim(),
      status: status,
      created_at: new Date().toISOString()
    })
  }

  const { error } = await supabase
    .from('suggestions')
    .update({
      status,
      admin_note: adminNote.trim() || suggestion?.admin_note || null,
      admin_notes: notes,
      updated_at: new Date().toISOString()
    })
    .eq('id', suggestionId)

  if (error) {
    console.error('updateSuggestionStatus error:', error)
    return { error: 'Öneri güncellenemedi.' }
  }

  // Notify the author of the suggestion about the status/note update
  try {
    const { data: suggestion } = await supabase
      .from('suggestions')
      .select('user_id, title')
      .eq('id', suggestionId)
      .single()

    if (suggestion) {
      const { createNotification } = await import('@/lib/actions/notifications')
      let statusLabel = 'güncellendi'
      if (status === 'in_progress') statusLabel = 'yapılıyor olarak işaretlendi'
      if (status === 'completed') statusLabel = 'tamamlandı'
      if (status === 'closed') statusLabel = 'kapatıldı'

      await createNotification(
        suggestion.user_id,
        user.id,
        'support_reply',
        null,
        null,
        {
          message: `"${suggestion.title.slice(0, 30)}${suggestion.title.length > 30 ? '...' : ''}" öneriniz ${statusLabel}.`,
          postPreview: suggestionId
        }
      )
    }
  } catch (err) {
    console.warn('Could not notify author of suggestion status update:', err)
  }

  revalidatePath('/suggestions')
  return { success: true }
}

export async function deleteSuggestion(suggestionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Giriş yapmalısınız.' }

  // Fetch the suggestion to check the owner
  const { data: suggestion, error: fetchError } = await supabase
    .from('suggestions')
    .select('user_id')
    .eq('id', suggestionId)
    .single()

  if (fetchError || !suggestion) {
    return { error: 'Öneri bulunamadı.' }
  }

  // Fetch current user's profile to verify if they are an admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.is_gold || isFounder(profile)
  const isOwner = suggestion.user_id === user.id

  if (!isAdmin && !isOwner) {
    return { error: 'Bu işlem için yetkiniz bulunmamaktadır.' }
  }

  const { createServiceClient } = await import('@/lib/supabase/server')
  const serviceClient = await createServiceClient()

  // First, delete related votes to avoid foreign key violations
  await serviceClient
    .from('suggestion_votes')
    .delete()
    .eq('suggestion_id', suggestionId)

  // Second, delete related comments
  await serviceClient
    .from('suggestion_comments')
    .delete()
    .eq('suggestion_id', suggestionId)

  // Finally, delete the suggestion
  const { error } = await serviceClient
    .from('suggestions')
    .delete()
    .eq('id', suggestionId)

  if (error) {
    console.error('deleteSuggestion error:', error)
    return { error: 'Öneri silinemedi.' }
  }

  revalidatePath('/suggestions')
  return { success: true }
}


