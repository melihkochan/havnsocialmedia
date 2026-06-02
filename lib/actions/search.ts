'use server'

import { createClient } from '@/lib/supabase/server'
import { generateEmbedding } from '@/lib/embedding'
import { enrichProfile } from '@/lib/profile-enrich'

export async function searchSemantic(query: string) {
  const cleanQuery = (query || '').trim()
  if (!cleanQuery) {
    return { communities: [], posts: [] }
  }

  try {
    const supabase = await createClient()

    // 1. Generate query embedding vector
    const embedding = await generateEmbedding(cleanQuery)

    // Check if the embedding is a zero vector (indicates model loading failure)
    const isZeroVector = embedding.every(val => val === 0)
    if (isZeroVector) {
      return { communities: [], posts: [] }
    }

    // 2. Query communities and posts similarity in parallel
    const [communitiesRes, postsRes] = await Promise.all([
      supabase.rpc('match_communities', {
        query_embedding: embedding,
        match_threshold: 0.35, // threshold for cosine similarity
        match_count: 5
      }),
      supabase.rpc('match_posts', {
        query_embedding: embedding,
        match_threshold: 0.35,
        match_count: 5
      })
    ])

    if (communitiesRes.error) {
      console.error('match_communities error:', communitiesRes.error)
    }
    if (postsRes.error) {
      console.error('match_posts error:', postsRes.error)
    }

    const communities = communitiesRes.data ?? []
    const postsData = postsRes.data ?? []

    // For posts, we also want to fetch their author profiles to show user avatars/names
    let posts = []
    if (postsData.length > 0) {
      const postIds = postsData.map((p: any) => p.id)
      const { data: enrichedPosts } = await supabase
        .from('posts')
        .select('*, profiles(*)')
        .in('id', postIds)

      if (enrichedPosts) {
        // Map back to maintain similarity order returned by match_posts RPC
        posts = postsData.map((p: any) => {
          const fullPost = enrichedPosts.find((ep: any) => ep.id === p.id)
          return {
            ...p,
            profiles: fullPost?.profiles ? enrichProfile(fullPost.profiles) : null
          }
        }).filter((p: any) => p.profiles !== null)
      }
    }

    return {
      communities,
      posts
    }
  } catch (error) {
    console.error('Semantic search error:', error)
    return { communities: [], posts: [] }
  }
}
