'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { enrichProfile } from '@/lib/profile-enrich'
import { getSessionId } from '@/lib/utils'

export async function signIn(formData: FormData) {
  const supabase = await createClient()
  const identifier = formData.get('identifier') as string
  const password = formData.get('password') as string

  let email = identifier?.trim() || ''

  if (email && !email.includes('@')) {
    // Treat as username: look up their profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .ilike('username', email)
      .maybeSingle()

    if (!profile) {
      return { error: 'Girdiğiniz kullanıcı adı bulunamadı.' }
    }

    const { createServiceClient } = await import('@/lib/supabase/server')
    const supabaseAdmin = await createServiceClient()
    const { data: userData, error: authErr } = await supabaseAdmin.auth.admin.getUserById(profile.id)

    if (authErr || !userData?.user?.email) {
      return { error: 'Bu kullanıcı adına ait e-posta adresi bulunamadı.' }
    }

    email = userData.user.email
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    if (error.message.includes('Invalid login credentials')) {
      return { error: 'Geçersiz e-posta/kullanıcı adı veya şifre.' }
    }
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
  const avatarFile = formData.get('avatar') as File | null
  const country = (formData.get('country') as string || '').trim()
  const city = (formData.get('city') as string || '').trim()

  // Enforce registration_open system setting
  const supabaseAdmin = await createServiceClient()
  const { data: regSetting } = await supabaseAdmin
    .from('system_settings')
    .select('value')
    .eq('key', 'registration_open')
    .maybeSingle()

  const isRegOpen = regSetting ? (regSetting.value === true || regSetting.value === 'true') : true
  if (!isRegOpen) {
    return { error: 'Platform yeni üye kayıtlarına geçici olarak kapatılmıştır.' }
  }

  // Check if username is reserved
  const { isReservedUsername } = await import('@/lib/reserved-usernames')
  if (isReservedUsername(username)) {
    return { error: 'Bu kullanıcı adı sistem tarafından rezerve edilmiştir.' }
  }

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
    let avatarUrl: string | null = null

    if (avatarFile && avatarFile.size > 0) {
      const ext = avatarFile.name.split('.').pop() || 'png'
      const path = `${data.user.id}/avatar.${ext}`
      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from('avatars')
        .upload(path, avatarFile, { upsert: true, contentType: avatarFile.type })

      if (!uploadError) {
        const { data: { publicUrl } } = supabaseAdmin.storage
          .from('avatars')
          .getPublicUrl(uploadData.path)
        avatarUrl = publicUrl
      } else {
        console.error('Failed to upload avatar during signUp:', uploadError.message)
      }
    }

    const { error: upsertError } = await supabaseAdmin.from('profiles').upsert({
      id: data.user.id,
      username,
      first_name: firstName || null,
      last_name: lastName || null,
      avatar_url: avatarUrl,
      is_verified: false,
      country: country || null,
      city: city || null,
    })

    if (upsertError) {
      console.error('Failed to create user profile during signUp:', upsertError.message)
    }
  }

  redirect('/feed')
}

export async function signOut() {
  const supabase = await createClient()
  // Use 'local' scope to only clear this browser session.
  // 'global' (the default) would revoke ALL refresh tokens for this user on Supabase's server,
  // which would invalidate tokens stored in other browsers / the multi-account localStorage list.
  await supabase.auth.signOut({ scope: 'local' })
  
  try {
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    cookieStore.delete('havn_hq_sudo_unlocked')
  } catch (e) {
    console.error('Failed to delete hq sudo cookie:', e)
  }

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
      // Use 'local' scope to avoid revoking tokens stored in the multi-account localStorage list.
      await supabase.auth.signOut({ scope: 'local' })
      redirect('/login?reason=multi_session')
    }
  }

  return enriched
}

/**
 * Switches the server-side session to the given account's tokens.
 *
 * IMPORTANT: We NEVER call supabase.auth.setSession() with potentially invalid tokens directly.
 * When setSession() fails server-side, the Supabase SSR package calls _removeSession() which
 * DELETES the auth cookie, logging the user out completely.
 *
 * Instead, we pre-validate the refresh_token via a direct REST API call (which does NOT touch
 * session cookies). Only after confirming the token is valid do we call setSession().
 */
export async function switchSession(accessToken: string, refreshToken: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  // STEP 1: Check if the access token is expired (decode JWT on server)
  let accessExpired = true
  try {
    // Server-side JWT decode using Buffer (no window.atob needed)
    const base64 = accessToken.split('.')[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/')
    const payload = JSON.parse(Buffer.from(base64, 'base64').toString('utf-8'))
    accessExpired = !payload.exp || Math.floor(Date.now() / 1000) >= payload.exp
  } catch {
    accessExpired = true
  }

  let freshAccessToken = accessToken
  let freshRefreshToken = refreshToken

  if (accessExpired) {
    // STEP 2: Pre-validate via Supabase REST API — does NOT touch session cookies on failure.
    // If we called setSession() with a dead refresh_token, Supabase would clear the cookie
    // and log the current user out. By using the REST endpoint first, we avoid that.
    let res: Response
    try {
      res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      })
    } catch {
      return { error: 'Ağ hatası. Lütfen tekrar deneyin.' }
    }

    if (!res.ok) {
      // Token is dead — current session cookie is UNTOUCHED, user stays logged in
      return { error: 'Oturum süresi dolmuş veya geçersiz. Lütfen tekrar giriş yapın.' }
    }

    const freshSession = await res.json()
    freshAccessToken = freshSession.access_token
    freshRefreshToken = freshSession.refresh_token
  }

  // STEP 3: Tokens are known-valid. Now safely set the server-side session cookie.
  const supabase = await createClient()
  const { data, error } = await supabase.auth.setSession({
    access_token: freshAccessToken,
    refresh_token: freshRefreshToken,
  })

  if (error) {
    return { error: error.message }
  }

  // After switching, update last_session_id for the new user so that
  // getUser() does NOT detect a "session mismatch" and sign them out.
  if (data.session) {
    const newSessionId = getSessionId(data.session.access_token)
    if (newSessionId && data.session.user?.id) {
      const { saveProfileMetadata } = await import('@/lib/actions/profile-db')
      await saveProfileMetadata(data.session.user.id, { last_session_id: newSessionId })
    }
  }

  return {
    success: true,
    session: data.session ? {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    } : null
  }
}
