export function sortPostsWithPinned<T extends { is_pinned?: boolean | null; created_at: string; likes?: { length: number }[] }>(
  posts: T[],
  sortBy: 'new' | 'popular' = 'new'
): T[] {
  const pinned = posts.filter(p => p.is_pinned)
  const rest = posts.filter(p => !p.is_pinned)

  if (sortBy === 'popular') {
    rest.sort((a, b) => (b.likes?.length ?? 0) - (a.likes?.length ?? 0))
  } else {
    rest.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }

  pinned.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  return [...pinned, ...rest]
}
