'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { enrichProfile } from '@/lib/profile-enrich'
import { getSessionId } from '@/lib/utils'

export async function signIn(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: error.message }
  }

  // Record the new session ID
  const { data: { session } } = await supabase.auth.getSession()
  if (session && session.user) {
    const currentSessionId = getSessionId(session.access_token)
    if (currentSessionId) {
      const { saveProfileMetadata } = await import('@/lib/actions/profile-db')
      await saveProfileMetadata(session.user.id, { last_session_id: currentSessionId })
    }
  }

  redirect('/feed')
}

export async function signUp(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const username = formData.get('username') as string
  const firstName = (formData.get('first_name') as string || '').trim()
  const lastName = (formData.get('last_name') as string || '').trim()

  // Check username uniqueness
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .single()

  if (existing) {
    return { error: 'Bu kullanıcı adı zaten alınmış.' }
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
        first_name: firstName,
        last_name: lastName,
      }
    }
  })

  if (error) {
    return { error: error.message }
  }

  // Create or update profile using service client to bypass RLS when user is not yet logged in (e.g. pending email confirmation)
  if (data.user) {
    const supabaseAdmin = await createServiceClient()
    const { error: upsertError } = await supabaseAdmin.from('profiles').upsert({
      id: data.user.id,
      username,
      first_name: firstName || null,
      last_name: lastName || null,
      avatar_url: null,
    })

    if (upsertError) {
      console.error('Failed to create user profile during signUp:', upsertError.message)
    }
  }

  redirect('/feed')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function getUser() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session || !session.user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single()

  if (!profile) return null
  const enriched = enrichProfile(profile)
  if (!enriched) return null

  // Enforce single session
  const currentSessionId = getSessionId(session.access_token)
  if (currentSessionId) {
    if (!enriched.last_session_id) {
      const { saveProfileMetadata } = await import('@/lib/actions/profile-db')
      await saveProfileMetadata(session.user.id, { last_session_id: currentSessionId })
      enriched.last_session_id = currentSessionId
    } else if (enriched.last_session_id !== currentSessionId) {
      console.warn(`Session mismatch detected for user ${enriched.username}. Booting...`)
      await supabase.auth.signOut()
      redirect('/login?reason=multi_session')
    }
  }

  return enriched
}

export async function switchSession(accessToken: string, refreshToken: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}
