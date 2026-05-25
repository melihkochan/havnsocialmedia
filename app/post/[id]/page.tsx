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

  const profile = user
    ? (await supabase.from('profiles').select('*').eq('id', user.id).single()).data
    : null

  // Fetch post with joins
  const { data: post, error } = await supabase
    .from('posts')
    .select(`*, profiles(*), likes(user_id), bookmarks(user_id), comments(id), communities(name, slug)`)
    .eq('id', id)
    .single()

  if (error || !post) notFound()

  // Get author's role in community
  let role: 'owner' | 'moderator' | 'member' = 'member'
  if (post.community_id) {
    const { data: member } = await supabase
      .from('community_members')
      .select('role')
      .eq('community_id', post.community_id)
      .eq('user_id', post.user_id)
      .single()
    if (member) role = member.role
  }

  // Get viewer's role in community
  let viewerRole: 'owner' | 'moderator' | 'member' = 'member'
  if (user && post.community_id) {
    const { data: member } = await supabase
      .from('community_members')
      .select('role')
      .eq('community_id', post.community_id)
      .eq('user_id', user.id)
      .single()
    if (member) viewerRole = member.role
  }

  const [comments, postViews] = await Promise.all([
    getComments(id),
    getPostViewCount(id),
  ])
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
