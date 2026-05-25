export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'owner' | 'moderator' | 'member'
export type CommunityType = 'public' | 'request_to_join'
export type MembershipStatus = 'pending' | 'approved' | 'rejected'
export type NotificationType = 'like' | 'comment' | 'join_request' | 'approved' | 'repost' | 'comment_like' | 'reply' | 'post_removed' | 'post_pinned'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          first_name: string | null
          last_name: string | null
          avatar_url: string | null
          banner_url: string | null
          bio: string | null
          updated_at: string
          is_verified?: boolean
          is_gold?: boolean
        }
        Insert: {
          id: string
          username: string
          first_name?: string | null
          last_name?: string | null
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          updated_at?: string
          is_verified?: boolean
          is_gold?: boolean
        }
        Update: {
          username?: string
          first_name?: string | null
          last_name?: string | null
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          updated_at?: string
          is_verified?: boolean
          is_gold?: boolean
        }
      }
      communities: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          type: CommunityType
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          type?: CommunityType
          created_by?: string | null
          created_at?: string
        }
        Update: {
          name?: string
          slug?: string
          description?: string | null
          type?: CommunityType
        }
      }
      community_members: {
        Row: {
          id: string
          community_id: string
          user_id: string
          role: UserRole
          status: MembershipStatus
          joined_at: string
        }
        Insert: {
          id?: string
          community_id: string
          user_id: string
          role?: UserRole
          status?: MembershipStatus
          joined_at?: string
        }
        Update: {
          role?: UserRole
          status?: MembershipStatus
        }
      }
      posts: {
        Row: {
          id: string
          community_id: string | null
          user_id: string
          content: string | null
          image_url: string | null
          parent_post_id: string | null
          is_pinned: boolean
          created_at: string
        }
        Insert: {
          id?: string
          community_id?: string | null
          user_id: string
          content?: string | null
          image_url?: string | null
          parent_post_id?: string | null
          is_pinned?: boolean
          created_at?: string
        }
        Update: {
          content?: string | null
          image_url?: string | null
          parent_post_id?: string | null
          is_pinned?: boolean
        }
      }
      comments: {
        Row: {
          id: string
          post_id: string
          user_id: string
          content: string
          parent_comment_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          user_id: string
          content: string
          parent_comment_id?: string | null
          created_at?: string
        }
        Update: {
          content?: string
          parent_comment_id?: string | null
        }
      }
      likes: {
        Row: {
          id: string
          post_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          user_id: string
          created_at?: string
        }
        Update: Record<string, never>
      }
      comment_likes: {
        Row: {
          id: string
          comment_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          comment_id: string
          user_id: string
          created_at?: string
        }
        Update: Record<string, never>
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          actor_id: string
          type: NotificationType
          post_id: string | null
          comment_id: string | null
          community_id: string | null
          message: string | null
          post_preview: string | null
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          actor_id: string
          type: NotificationType
          post_id?: string | null
          comment_id?: string | null
          community_id?: string | null
          message?: string | null
          post_preview?: string | null
          is_read?: boolean
          created_at?: string
        }
        Update: {
          is_read?: boolean
          comment_id?: string | null
          message?: string | null
        }
      }
    }
  }
}

// ─── Convenience types ────────────────────────────────────────────────────────

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Community = Database['public']['Tables']['communities']['Row']
export type CommunityMember = Database['public']['Tables']['community_members']['Row']
export type Post = Database['public']['Tables']['posts']['Row']
export type Comment = Database['public']['Tables']['comments']['Row']
export type Like = Database['public']['Tables']['likes']['Row']
export type Notification = Database['public']['Tables']['notifications']['Row']

// ─── Enriched types (with joins) ─────────────────────────────────────────────

export type PostWithProfile = Post & {
  profiles: Profile
  community_members: { role: UserRole }[]
  likes: { user_id: string }[]
  comments: { id: string }[]
  parent_post?: (Post & { profiles: Profile }) | null
}

export type CommentWithProfile = Comment & {
  profiles: Profile
  community_members?: { role: UserRole }[]
  comment_likes?: { user_id: string }[]
}

export type CommunityWithMemberCount = Community & {
  community_members: { id: string }[]
}

export type CommunityMemberWithProfile = CommunityMember & {
  profiles: Profile
}
