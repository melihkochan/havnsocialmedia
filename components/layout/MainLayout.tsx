import { LayoutShell } from "@/components/layout/LayoutShell";
import { Sidebar } from "@/components/layout/Sidebar";
import { RightBar } from "@/components/layout/RightBar";

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
  return (
    <LayoutShell
      sidebar={
        <Sidebar
          currentUser={currentUser}
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
