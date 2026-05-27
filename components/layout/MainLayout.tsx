import { LayoutShell } from "@/components/layout/LayoutShell";
import { Sidebar } from "@/components/layout/Sidebar";
import { RightBar } from "@/components/layout/RightBar";

import { isFounder } from "@/lib/founder";
import { createClient } from "@/lib/supabase/server";

interface MainLayoutProps {
  children: React.ReactNode;
  currentUser?: {
    id?: string
    username: string
    first_name?: string | null
    last_name?: string | null
    avatar_url: string | null
    banner_url?: string | null
    bio?: string | null
    updated_at?: string | null
  } | null;
  showRightBar?: boolean;
  rightBar?: React.ReactNode;
  fullWidth?: boolean;
  accentColor?: string | null;
}

export async function MainLayout({ children, currentUser, showRightBar = true, rightBar, fullWidth, accentColor }: MainLayoutProps) {
  const isUserFounder = currentUser ? isFounder(currentUser) : false;

  let unreadCount = 0;
  let unreadMessagesCount = 0;
  let openSupportTickets = 0;

  if (currentUser) {
    const supabase = await createClient();
    
    // Fetch parallel directly to bypass separate server actions / auth session roundtrips
    const promises: any[] = [
      supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', currentUser.id)
        .eq('is_read', false),
      supabase
        .from('direct_messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', currentUser.id)
        .eq('is_read', false),
    ];

    if (isUserFounder) {
      promises.push(
        supabase
          .from('support_tickets')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'open')
      );
    } else {
      promises.push(
        supabase
          .from('support_tickets')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', currentUser.id)
          .eq('status', 'replied')
      );
    }

    const results = await Promise.all(promises);
    unreadCount = results[0]?.count ?? 0;
    unreadMessagesCount = results[1]?.count ?? 0;
    if (results[2]) {
      openSupportTickets = results[2].count ?? 0;
    }
  }

  return (
    <LayoutShell
      sidebar={
        <Sidebar
          currentUser={currentUser}
          unreadCount={unreadCount}
          unreadMessagesCount={unreadMessagesCount}
          openSupportTickets={openSupportTickets}
        />
      }
      rightBar={rightBar ? rightBar : (showRightBar ? <RightBar /> : null)}
      username={currentUser?.username}
      currentUser={currentUser}
      fullWidth={fullWidth}
      accentColor={accentColor}
    >
      {children}
    </LayoutShell>
  );
}
