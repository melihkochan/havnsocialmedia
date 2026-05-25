import { LayoutShell } from "@/components/layout/LayoutShell";
import { Sidebar } from "@/components/layout/Sidebar";
import { RightBar } from "@/components/layout/RightBar";
import { getUnreadNotificationCount } from "@/lib/actions/notifications";
import { getUnreadMessagesCount } from "@/lib/actions/messages";
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
    
    // Fetch parallel
    const promises: any[] = [
      getUnreadNotificationCount(),
      getUnreadMessagesCount(),
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
    unreadCount = results[0] ?? 0;
    unreadMessagesCount = results[1] ?? 0;
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
