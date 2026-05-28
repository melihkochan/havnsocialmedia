import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
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
          // Generate a unique username from email
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
          if (enriched && enriched.is_setup_completed === false) {
            return NextResponse.redirect(`${origin}/profile-setup`)
          }
        }
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=OAuth exchange failed`)
}
