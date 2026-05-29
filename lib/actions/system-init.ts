'use server'

import { createServiceClient } from '@/lib/supabase/server'

// Use globalThis cache to prevent querying database on every request/page hit
declare global {
  var __havnChecked: boolean | undefined
}

globalThis.__havnChecked = false

export async function ensureHavnOfficialProfile() {
  if (globalThis.__havnChecked) {
    return
  }

  try {
    const supabaseAdmin = await createServiceClient()
    const systemEmail = 'system@havn.app'
    let userId = ''

    console.log('Seed: Checking official system user and profile...')

    // 1. Fetch all users using admin client to see if the auth user exists
    const { data: usersList, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (listError) {
      console.error('Failed to list users to check system user existence:', listError)
      return
    }

    const existingAuthUser = (usersList?.users || []).find(u => u.email === systemEmail)

    if (existingAuthUser) {
      userId = existingAuthUser.id
      // Update password of existing auth user so user can always log in with it
      const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: 'Melihkochan1441.'
      })
      if (updateAuthError) {
        console.error('Failed to update system user password:', updateAuthError)
      } else {
        console.log('Seed: System user password updated/verified.')
      }
    } else {
      // Create a brand new Auth user with a known password
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: systemEmail,
        password: 'Melihkochan1441.',
        email_confirm: true
      })

      if (createError || !newUser.user) {
        console.error('Failed to create auth user for @havn:', createError)
        return
      }

      userId = newUser.user.id
      console.log('Seed: System user created.')
    }

    // 2. Create/Insert/Update the official profile for the system user
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        username: 'havn',
        first_name: 'HAVN',
        last_name: 'Official',
        avatar_url: '/havn-logo-gradient.png',
        bio: 'HAVN Resmi Sistem Hesabı',
        is_gold: true,
        is_verified: true,
        role: 'founder'
      })

    if (profileError) {
      console.error('Failed to insert/upsert profile for @havn:', {
        message: profileError.message,
        details: profileError.details,
        hint: profileError.hint,
        code: profileError.code
      })
    } else {
      console.log('Seed: "@havn" profile successfully created/updated!')
      globalThis.__havnChecked = true
    }
  } catch (err) {
    console.error('ensureHavnOfficialProfile error:', err)
  }
}
