import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MainLayout } from '@/components/layout/MainLayout'
import { CommunityBanner } from '@/components/havn/CommunityBanner'
import { CommunityContentTabs } from './CommunityContentTabs'
import { RightBar } from '@/components/layout/RightBar'
import { getPosts } from '@/lib/actions/posts'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: community } = await supabase
    .from('communities').select('name, description').eq('slug', slug).single()
  return {
    title: community ? `${community.name} — HAVN` : 'Topluluk — HAVN',
    description: community?.description ?? '',
  }
}

interface PageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ sortBy?: string }>
}

export default async function CommunityDetailPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const { sortBy = 'new' } = await searchParams
  const activeSort = sortBy === 'popular' ? 'popular' : 'new'

  const supabase = await createClient()

  // Parallel: auth + community details
  const [{ data: { user } }, { data: community, error }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('communities').select('*').eq('slug', slug).single(),
  ])

  if (error || !community) notFound()

  // Parallel: profile + membership status/role + member count + community posts
  const [profileResult, membershipResult, { count: memberCount }, posts] = await Promise.all([
    user ? supabase.from('profiles').select('*').eq('id', user.id).single() : Promise.resolve({ data: null }),
    user ? supabase.from('community_members').select('status, role').eq('community_id', community.id).eq('user_id', user.id).single() : Promise.resolve({ data: null }),
    supabase.from('community_members').select('*', { count: 'exact', head: true }).eq('community_id', community.id).eq('status', 'approved'),
    getPosts(community.id, activeSort),
  ])

  const profile = profileResult.data
  const membership = membershipResult.data
  const isMember = membership?.status === 'approved'
  const isAdmin = membership?.role === 'owner' || membership?.role === 'moderator'

  // Fetch pending requests only for admins
  const pendingRequestsResult = isAdmin
    ? await supabase
        .from('community_members')
        .select('id, user_id, community_id, role, status, joined_at, profiles(username, avatar_url)')
        .eq('community_id', community.id)
        .eq('status', 'pending')
    : { data: null }

  const pendingRequests = (pendingRequestsResult?.data as any) ?? []

  const communityForBanner = {
    id: community.id,
    name: community.name,
    description: community.description ?? '',
    type: community.type,
    member_count: memberCount ?? 0,
    rules: community.rules ?? [],
    announcement: community.announcement ?? null,
    accent_color: community.accent_color ?? null,
  }

  return (
    <MainLayout
      currentUser={profile}
      rightBar={<RightBar communityId={community.id} currentUserRole={membership?.role} />}
      accentColor={community.accent_color}
    >
      <div className="flex flex-col gap-4">
        {/* Back Link Breadcrumb */}
        <Link
          href="/communities"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-all w-fit bg-card/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-border/80 shadow-sm"
        >
          <ArrowLeft size={12} />
          Topluluklar Listesi
        </Link>

        {/* Community Banner */}
        <CommunityBanner community={communityForBanner} isAdmin={isAdmin} initialPendingRequests={pendingRequests} />

        {/* Not a member notice */}
        {user && !isMember && (
          <div className="bg-card border border-border rounded-2xl p-6 text-center">
            <p className="text-sm text-muted-foreground mb-3">
              Bu topluluğa üye değilsin. Gönderi paylaşmak için katıl.
            </p>
            <Link
              href="/communities"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
              style={{
                background: 'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))',
                color: 'var(--primary-foreground)',
              }}
            >
              Topluluklara Git
            </Link>
          </div>
        )}

        {/* Tab-driven Content (Posts, Chat, Announcements) */}
        <CommunityContentTabs
          communityId={community.id}
          communitySlug={community.slug}
          currentUser={profile}
          isMember={isMember}
          isAdmin={isAdmin}
          membershipRole={membership?.role}
          initialPosts={posts}
          activeSort={activeSort}
          communityDescription={community.description}
          rules={community.rules ?? []}
          announcement={community.announcement ?? null}
        />
      </div>
    </MainLayout>
  )
}
