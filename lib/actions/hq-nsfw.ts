'use server'

/**
 * HQ Admin Panel — Content Filter (Banned Words) Management
 * All actions require founder/admin role.
 */

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { invalidateNsfwCache } from '@/lib/nsfw-cache'
import { revalidatePath } from 'next/cache'

async function requireAdminAccess() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized', user: null }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['founder', 'admin'].includes(profile.role ?? '')) {
    return { error: 'Forbidden', user: null }
  }

  return { error: null, user }
}

export interface BannedWord {
  id: string
  word: string
  category: string
  created_at: string
  added_by: string | null
}

export async function getBannedWords(): Promise<{ data: BannedWord[]; error?: string }> {
  const { error: authError } = await requireAdminAccess()
  if (authError) return { data: [], error: authError }

  const supabase = await createServiceClient()
  const { data, error } = await supabase
    .from('banned_words')
    .select('id, word, category, created_at, added_by')
    .order('created_at', { ascending: false })

  if (error) return { data: [], error: error.message }
  return { data: data ?? [] }
}

export async function addBannedWord(
  word: string,
  category: string = 'nsfw'
): Promise<{ success?: boolean; error?: string }> {
  const { error: authError, user } = await requireAdminAccess()
  if (authError || !user) return { error: authError ?? 'Unauthorized' }

  const cleanWord = word.toLowerCase().trim()
  if (!cleanWord) return { error: 'Kelime boş olamaz.' }
  if (cleanWord.length < 2) return { error: 'Kelime en az 2 karakter olmalıdır.' }

  const supabase = await createServiceClient()
  const { error } = await supabase.from('banned_words').insert({
    word: cleanWord,
    category,
    added_by: user.id,
  })

  if (error) {
    if (error.code === '23505') return { error: 'Bu kelime zaten mevcut.' }
    return { error: error.message }
  }

  // Invalidate cache so the new word takes effect immediately
  invalidateNsfwCache()
  revalidatePath('/havn-hq-control')

  return { success: true }
}

export async function removeBannedWord(id: string): Promise<{ success?: boolean; error?: string }> {
  const { error: authError } = await requireAdminAccess()
  if (authError) return { error: authError }

  const supabase = await createServiceClient()
  const { error } = await supabase.from('banned_words').delete().eq('id', id)

  if (error) return { error: error.message }

  // Invalidate cache
  invalidateNsfwCache()
  revalidatePath('/havn-hq-control')

  return { success: true }
}

export async function clearNsfwCache(): Promise<{ success: boolean }> {
  const { error: authError } = await requireAdminAccess()
  if (authError) return { success: false }

  invalidateNsfwCache()
  return { success: true }
}
