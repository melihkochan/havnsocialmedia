// ─── Mock data matching Supabase schema ───────────────────────────────────────

export type Role = "owner" | "moderator" | "member";
export type CommunityType = "public" | "request_to_join";

export interface Profile {
  id: string;
  username: string;
  avatar_url: string;
}

export interface Community {
  id: string;
  name: string;
  description: string;
  type: CommunityType;
  member_count: number;
  banner_color?: string;
}

export interface CommunityMember {
  community_id: string;
  user_id: string;
  role: Role;
  status: "active" | "pending";
  profile: Profile;
}

export interface Post {
  id: string;
  community_id: string;
  user_id: string;
  content: string;
  image_url?: string;
  created_at: string;
  profile: Profile;
  role: Role;
  like_count: number;
  comment_count: number;
}

// ─── Profiles ────────────────────────────────────────────────────────────────

export const mockProfiles: Profile[] = [
  { id: "u1", username: "aria_voss", avatar_url: "" },
  { id: "u2", username: "kael_rhyn", avatar_url: "" },
  { id: "u3", username: "nova_dex", avatar_url: "" },
  { id: "u4", username: "zephyr_io", avatar_url: "" },
  { id: "u5", username: "mira_colt", avatar_url: "" },
  { id: "u6", username: "theo_wave", avatar_url: "" },
];

// Current logged-in user
export const currentUser: Profile = {
  id: "u1",
  username: "aria_voss",
  avatar_url: "",
};

// ─── Communities ─────────────────────────────────────────────────────────────

export const mockCommunities: Community[] = [
  {
    id: "c1",
    name: "Design Systems",
    description:
      "A sanctuary for designers and engineers who believe that great systems create great products. Share tokens, patterns, and pixels.",
    type: "public",
    member_count: 4821,
  },
  {
    id: "c2",
    name: "Web3 Builders",
    description:
      "Building the decentralized future, one smart contract at a time.",
    type: "request_to_join",
    member_count: 2304,
  },
  {
    id: "c3",
    name: "Open Source",
    description: "Contribute, collaborate, and ship code that matters.",
    type: "public",
    member_count: 9103,
  },
];

export const activeCommunity = mockCommunities[0];

// ─── Community Members ────────────────────────────────────────────────────────

export const mockMembers: CommunityMember[] = [
  {
    community_id: "c1",
    user_id: "u2",
    role: "owner",
    status: "active",
    profile: { id: "u2", username: "kael_rhyn", avatar_url: "" },
  },
  {
    community_id: "c1",
    user_id: "u3",
    role: "moderator",
    status: "active",
    profile: { id: "u3", username: "nova_dex", avatar_url: "" },
  },
  {
    community_id: "c1",
    user_id: "u4",
    role: "moderator",
    status: "active",
    profile: { id: "u4", username: "zephyr_io", avatar_url: "" },
  },
  {
    community_id: "c1",
    user_id: "u1",
    role: "member",
    status: "active",
    profile: { id: "u1", username: "aria_voss", avatar_url: "" },
  },
];

// ─── Posts ────────────────────────────────────────────────────────────────────

export const mockPosts: Post[] = [
  {
    id: "p1",
    community_id: "c1",
    user_id: "u2",
    content:
      "Just shipped our new token architecture for HAVN's design system 🎉 We moved from hardcoded values to semantic CSS custom properties — and the theme switching is buttery smooth now. Thread below on what we learned.",
    image_url: undefined,
    created_at: "2026-05-20T14:30:00Z",
    profile: { id: "u2", username: "kael_rhyn", avatar_url: "" },
    role: "owner",
    like_count: 128,
    comment_count: 24,
  },
  {
    id: "p2",
    community_id: "c1",
    user_id: "u3",
    content:
      "Hot take: your spacing scale IS your design system. If your team can't agree on 4px vs 5px base units, everything downstream breaks. Consistent rhythm > aesthetic preference.",
    image_url: undefined,
    created_at: "2026-05-20T12:15:00Z",
    profile: { id: "u3", username: "nova_dex", avatar_url: "" },
    role: "moderator",
    like_count: 97,
    comment_count: 18,
  },
  {
    id: "p3",
    community_id: "c1",
    user_id: "u5",
    content:
      "We've been using compound variants with cva() for 6 months now and I genuinely can't go back. The type-safety alone is worth the migration cost. Here's our Button component as a reference.",
    image_url: undefined,
    created_at: "2026-05-20T10:00:00Z",
    profile: { id: "u5", username: "mira_colt", avatar_url: "" },
    role: "member",
    like_count: 63,
    comment_count: 11,
  },
  {
    id: "p4",
    community_id: "c1",
    user_id: "u4",
    content:
      "Reminder: Community Office Hours this Friday at 18:00 UTC. Bring your design system questions, WIP components, or just drop by to chat. Link in the community sidebar.",
    image_url: undefined,
    created_at: "2026-05-19T20:00:00Z",
    profile: { id: "u4", username: "zephyr_io", avatar_url: "" },
    role: "moderator",
    like_count: 44,
    comment_count: 7,
  },
  {
    id: "p5",
    community_id: "c1",
    user_id: "u6",
    content:
      "Anyone else finding that the hardest part of design systems isn't the components — it's getting engineers and designers to agree on naming? We spent 3 weeks on what to call our 'card' vs 'surface' vs 'container' layer 😅",
    image_url: undefined,
    created_at: "2026-05-19T16:30:00Z",
    profile: { id: "u6", username: "theo_wave", avatar_url: "" },
    role: "member",
    like_count: 89,
    comment_count: 31,
  },
];
