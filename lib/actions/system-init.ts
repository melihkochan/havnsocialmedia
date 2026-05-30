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
    
    // Pull systemEmail from env or DB, never hardcoded
    let systemEmail = process.env.SYSTEM_ACCOUNT_EMAIL
    if (!systemEmail) {
      const { data: dbEmailSetting } = await supabaseAdmin
        .from('system_settings')
        .select('value')
        .eq('key', 'system_account_email')
        .maybeSingle()
      systemEmail = dbEmailSetting?.value as string | undefined
    }
    
    if (!systemEmail) {
      // If no system email is configured in environment or database, return early
      return
    }
    
    let userId = ''

    // Resolve system account password securely (env or DB)
    let password = process.env.SYSTEM_ACCOUNT_PASSWORD
    if (!password) {
      const { data: dbSetting } = await supabaseAdmin
        .from('system_settings')
        .select('value')
        .eq('key', 'system_account_password')
        .maybeSingle()

      if (dbSetting?.value) {
        password = dbSetting.value as string
      } else {
        // Fallback: Generate a cryptographically secure random password if neither Env nor DB has it,
        // rather than hardcoding credentials in the code.
        const crypto = await import('crypto')
        password = crypto.randomBytes(16).toString('hex') + 'A1!'
        await supabaseAdmin
          .from('system_settings')
          .upsert({ key: 'system_account_password', value: password })
      }
    }

    // 1. Fetch all users using admin client to see if the auth user exists
    const { data: usersList, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    if (listError) return

    const existingAuthUser = (usersList?.users || []).find(u => u.email === systemEmail)

    if (existingAuthUser) {
      userId = existingAuthUser.id
      // Update password of existing auth user so user can always log in with it
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: password
      })
    } else {
      // Create a brand new Auth user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: systemEmail,
        password: password,
        email_confirm: true
      })
      if (createError || !newUser.user) return
      userId = newUser.user.id
    }

    // 2. Create/Insert/Update the official profile for the system user
    // Fetch existing profile to prevent overwriting custom fields like avatar_url or bio
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle()

    if (!existingProfile) {
      // Profile does not exist, insert with initial default values
      await supabaseAdmin
        .from('profiles')
        .insert({
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
    } else {
      // Profile exists, only update system fields to ensure system integrity,
      // but do not overwrite customized fields (first_name, last_name, avatar_url, bio, banner_url, etc.)
      await supabaseAdmin
        .from('profiles')
        .update({
          username: 'havn',
          is_gold: true,
          is_verified: true,
          role: 'founder'
        })
        .eq('id', userId)
    }

    globalThis.__havnChecked = true
  } catch (err) {
    // Suppressed errors as requested to keep console clean
  }
}
