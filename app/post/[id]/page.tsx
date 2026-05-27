import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MainLayout } from '@/components/layout/MainLayout'
import { PostCard } from '@/components/havn/PostCard'
import { CommentSection } from '@/components/havn/CommentSection'
import { PostViewTracker } from '@/components/havn/ViewTracker'
import { getComments } from '@/lib/actions/comments'
import { getPostViewCount } from '@/lib/actions/analytics'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [profileResult, postResult, comments, postViews] = await Promise.all([
    user ? supabase.from('profiles').select('*').eq('id', user.id).single() : Promise.resolve({ data: null }),
    supabase.from('posts').select(`*, profiles(*), likes(user_id), bookmarks(user_id), comments(id), communities(name, slug)`).eq('id', id).single(),
    getComments(id),
    getPostViewCount(id)
  ])

  const profile = profileResult?.data || null
  const post = postResult.data
  const error = postResult.error

  if (error || !post) notFound()

  // Get roles in community in parallel if community exists
  let role: 'owner' | 'moderator' | 'member' = 'member'
  let viewerRole: 'owner' | 'moderator' | 'member' = 'member'

  if (post.community_id) {
    const [authorMemberResult, viewerMemberResult] = await Promise.all([
      supabase.from('community_members').select('role').eq('community_id', post.community_id).eq('user_id', post.user_id).single(),
      user ? supabase.from('community_members').select('role').eq('community_id', post.community_id).eq('user_id', user.id).single() : Promise.resolve({ data: null })
    ])
    if (authorMemberResult.data) role = authorMemberResult.data.role
    if (viewerMemberResult?.data) viewerRole = viewerMemberResult.data.role
  }

  const username = post.profiles?.username ?? 'anonim'

  return (
    <MainLayout currentUser={profile}>
      <PostViewTracker postId={id} />
      <div className="flex flex-col gap-6">
        {/* Back button */}
        <Link
          href="/feed"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ArrowLeft size={16} /> Akışa Dön
        </Link>

        {/* Post detail card */}
        <PostCard
          post={post as any}
          currentUserId={user?.id}
          role={role as any}
          viewerRole={viewerRole as any}
          viewCount={postViews}
        />

        {/* Comments */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <CommentSection
            postId={id}
            initialComments={comments as Parameters<typeof CommentSection>[0]['initialComments']}
            currentUser={profile ? { id: profile.id, username: profile.username, avatar_url: profile.avatar_url } : null}
          />
        </div>
      </div>
    </MainLayout>
  )
}
