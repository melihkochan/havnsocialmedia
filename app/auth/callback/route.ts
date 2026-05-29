import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { enrichProfile } from '@/lib/profile-enrich'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/feed'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Check if user has a profile already
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (!profile) {
          // Enforce registration_open system setting for new OAuth signups
          const supabaseAdmin = await createServiceClient()
          const { data: regSetting } = await supabaseAdmin
            .from('system_settings')
            .select('value')
            .eq('key', 'registration_open')
            .maybeSingle()

          const isRegOpen = regSetting ? (regSetting.value === true || regSetting.value === 'true') : true
          if (!isRegOpen) {
            // Delete user in auth or just redirect to login with error (Supabase will have created the Auth user, but since no profile exists they can't log in/setup anyway)
            // It's cleaner to sign out and redirect
            await supabase.auth.signOut({ scope: 'local' })
            return NextResponse.redirect(`${origin}/login?error=Platform yeni üye kayıtlarına geçici olarak kapatılmıştır.`)
          }

          // Brand new OAuth signup — create temporary profile and redirect to setup wizard
          const baseUsername = user.email?.split('@')[0].replace(/[^a-zA-Z0-9]/g, '') || 'user'
          const uniqueSuffix = Math.floor(1000 + Math.random() * 9000)
          const username = `${baseUsername}${uniqueSuffix}`

          const fullName = user.user_metadata?.full_name || ''
          const parts = fullName.trim().split(' ')
          const firstName = parts[0] || ''
          const lastName = parts.slice(1).join(' ') || ''
          
          await supabase.from('profiles').insert({
            id: user.id,
            username,
            first_name: firstName || null,
            last_name: lastName || null,
            avatar_url: user.user_metadata?.avatar_url || null,
            bio: `\u200B${JSON.stringify({ is_setup_completed: false })}`
          })
          
          return NextResponse.redirect(`${origin}/profile-setup`)
        } else {
          const enriched = enrichProfile(profile)

          // If setup is explicitly marked as incomplete, redirect to wizard
          if (enriched && enriched.is_setup_completed === false) {
            return NextResponse.redirect(`${origin}/profile-setup`)
          }

          // If the profile bio has NO metadata at all (bio is null or empty, no JSON suffix)
          // AND there's no first_name set — treat this as an incomplete OAuth signup
          const hasMetadata = profile.bio && profile.bio.includes('\u200B')
          const hasName = !!(profile.first_name && profile.first_name.trim())

          if (!hasMetadata && !hasName) {
            // Mark profile as needing setup
            await supabase
              .from('profiles')
              .update({ bio: `\u200B${JSON.stringify({ is_setup_completed: false })}` })
              .eq('id', user.id)

            return NextResponse.redirect(`${origin}/profile-setup`)
          }
        }
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=OAuth exchange failed`)
}

