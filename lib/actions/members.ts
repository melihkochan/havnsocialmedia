'use server'

import { createClient } from '@/lib/supabase/server'

export interface MemberProfile {
  id: string
  username: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  bio: string | null
  role: string | null
  is_verified: boolean
  is_gold: boolean
  xp: number
  updated_at: string
}

export async function getMembers({
  search = '',
  sortBy = 'xp',
  page = 0,
  pageSize = 30,
}: {
  search?: string
  sortBy?: 'xp' | 'new' | 'name'
  page?: number
  pageSize?: number
} = {}): Promise<{ members: MemberProfile[]; total: number }> {
  const supabase = await createClient()

  let query = supabase
    .from('profiles')
    .select(
      'id, username, first_name, last_name, avatar_url, bio, role, is_verified, is_gold, xp, updated_at',
      { count: 'exact' }
    )
    // Exclude the official system account
    .neq('username', 'havn')

  if (search.trim()) {
    // Search by username OR first_name OR last_name
    query = query.or(
      `username.ilike.%${search.trim()}%,first_name.ilike.%${search.trim()}%,last_name.ilike.%${search.trim()}%`
    )
  }

  if (sortBy === 'xp') {
    query = query.order('xp', { ascending: false })
  } else if (sortBy === 'new') {
    query = query.order('updated_at', { ascending: false })
  } else if (sortBy === 'name') {
    query = query.order('first_name', { ascending: true, nullsFirst: false })
  }

  query = query.range(page * pageSize, (page + 1) * pageSize - 1)

  const { data, count } = await query

  return {
    members: (data ?? []) as MemberProfile[],
    total: count ?? 0,
  }
}
