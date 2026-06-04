import { createClient } from '@/lib/supabase/server'
import { MainLayout } from '@/components/layout/MainLayout'
import { PostFeed } from '@/components/havn/PostFeed'
import { getBookmarkedPosts } from '@/lib/actions/posts'
import { Bookmark } from 'lucide-react'
import Link from 'next/link'
import { getServerLocale } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'

export async function generateMetadata() {
  const locale = await getServerLocale()
  return {
    title: `${t('bookmarks.title', locale)} — HAVN`,
    description: t('bookmarks.subtitle', locale),
  }
}

export const dynamic = 'force-dynamic'

export default async function BookmarksPage() {
  const locale = await getServerLocale()
  const supabase = await createClient()

  // auth
  const { data: { user } } = await supabase.auth.getUser()

  let profile = null
  let bookmarkedPosts: any[] = []

  if (user) {
    const [profileResult, postsResult] = await Promise.all([
      supabase.from('profiles').select('id, username, first_name, last_name, avatar_url, is_verified, is_gold, updated_at').eq('id', user.id).single(),
      getBookmarkedPosts()
    ])
    profile = profileResult.data
    bookmarkedPosts = postsResult
  }

  return (
    <MainLayout currentUser={profile}>
      <div className="flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))',
              color: 'var(--primary-foreground)',
            }}
          >
            <Bookmark size={20} />
          </div>
          <div>
            <h1 className="text-lg font-black text-foreground">{t('bookmarks.title', locale)}</h1>
            <p className="text-xs text-muted-foreground">
              {t('bookmarks.subtitle', locale)}
            </p>
          </div>
        </div>

        {/* Content */}
        {!user ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 border border-dashed border-border rounded-2xl bg-card/40 backdrop-blur-md">
            <Bookmark className="w-12 h-12 text-muted-foreground opacity-50 mb-3" />
            <p className="text-sm font-semibold text-foreground text-center">{t('bookmarks.sign_in_required', locale)}</p>
            <p className="text-xs text-muted-foreground text-center mt-1">{t('bookmarks.sign_in_desc', locale)}</p>
            <Link href="/login" className="mt-4 px-4 py-2 rounded-xl text-xs font-bold text-primary-foreground bg-primary hover:bg-primary/95 transition-all">
              {t('auth.login.submit', locale)}
            </Link>
          </div>
        ) : bookmarkedPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 border border-dashed border-border rounded-2xl bg-card/40 backdrop-blur-md">
            <div className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center text-muted-foreground mb-4">
              <Bookmark size={20} />
            </div>
            <p className="text-sm font-semibold text-foreground text-center">{t('bookmarks.empty', locale)}</p>
            <p className="text-xs text-muted-foreground text-center mt-1 max-w-[280px]">
              {t('bookmarks.empty_desc', locale)}
            </p>
          </div>
        ) : (
          <PostFeed posts={bookmarkedPosts} currentUserId={user.id} isBookmarksPage={true} />
        )}
      </div>
    </MainLayout>
  )
}
